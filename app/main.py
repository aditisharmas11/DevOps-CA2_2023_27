"""Airline Passenger Satisfaction API.

Serves the XGBoost model from `main copy.ipynb` and exposes Prometheus metrics.

Endpoints
    GET  /health         liveness  - the process is up
    GET  /ready          readiness - the model is loaded (503 otherwise)
    GET  /version        app + model version (used to watch rolling updates)
    POST /predict        one passenger  -> probability of "satisfied"
    POST /predict/batch  many passengers
    GET  /metrics        Prometheus metrics
"""
import json
import logging
import os
import random
import socket
import sys
import time
from pathlib import Path
from typing import List, Literal, Optional

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, Request, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from pydantic import BaseModel, ConfigDict, Field

from app.features import FEATURE_COLS
from app.metrics import (APP_INFO, IN_PROGRESS, LATENCY, MODEL_LOADED, PREDICTION_ERRORS, PREDICTIONS,
                         REQUESTS, START_TIME)

APP_VERSION = os.getenv('APP_VERSION', 'dev')
MODEL_PATH = Path(os.getenv('MODEL_PATH', 'models/model.joblib'))
HOSTNAME = socket.gethostname()
# Demo knob: fraction of /predict calls that fail with HTTP 500, to exercise the error-rate panel and alert
CHAOS_ERROR_RATE = float(os.getenv('CHAOS_ERROR_RATE', '0'))


# ---------------------------------------------------------------
# Structured JSON logging (one line per event -> easy to grep / ship to Loki/ELK)
# ---------------------------------------------------------------
class JsonFormatter(logging.Formatter):
    def format(self, record):
        entry = {'ts': self.formatTime(record, '%Y-%m-%dT%H:%M:%S'), 'level': record.levelname,
                 'msg': record.getMessage(), 'version': APP_VERSION, 'pod': HOSTNAME}
        entry.update(getattr(record, 'extra_fields', {}))
        if record.exc_info:
            entry['error'] = repr(record.exc_info[1])
        return json.dumps(entry)


handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JsonFormatter())
logger = logging.getLogger('airline_api')
logger.handlers = [handler]
logger.setLevel(os.getenv('LOG_LEVEL', 'INFO'))
logger.propagate = False


# ---------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------
model = None
model_metadata = {}


def load_model():
    global model, model_metadata
    try:
        model = joblib.load(MODEL_PATH)
        # One OpenMP thread per prediction: requests already run concurrently, and n_jobs=-1
        # oversubscribes the CPU (measured p95 /predict 1.9 s -> see docs/REPORT.md, Challenges)
        model.named_steps['model'].set_params(n_jobs=1)
        meta_path = MODEL_PATH.with_suffix('.json')
        model_metadata = json.loads(meta_path.read_text()) if meta_path.exists() else {}
        MODEL_LOADED.set(1)
        logger.info('model loaded', extra={'extra_fields': {'model_path': str(MODEL_PATH)}})
    except Exception as exc:  # keep the process alive so /health works; /ready reports the problem
        model = None
        MODEL_LOADED.set(0)
        logger.error('model failed to load', extra={'extra_fields': {'model_path': str(MODEL_PATH),
                                                                       'error': str(exc)}})
    roc_auc = str(model_metadata.get('metrics', {}).get('roc_auc', 'unknown'))
    APP_INFO.labels(version=APP_VERSION, model_roc_auc=roc_auc).set(1)


START_TIME.set(time.time())
load_model()

app = FastAPI(title='Airline Passenger Satisfaction API', version=APP_VERSION)


# ---------------------------------------------------------------
# Request schema (field aliases = the dataset column names)
# ---------------------------------------------------------------
Rating = Optional[int]


class Passenger(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    gender: Literal['Male', 'Female'] = Field(alias='Gender')
    customer_type: Literal['Loyal Customer', 'disloyal Customer'] = Field(alias='Customer Type')
    type_of_travel: Literal['Business travel', 'Personal Travel'] = Field(alias='Type of Travel')
    travel_class: Literal['Business', 'Eco', 'Eco Plus'] = Field(alias='Class')
    # Numeric fields may be omitted - the pipeline imputes them, exactly as in the notebook
    age: Optional[float] = Field(None, alias='Age', ge=0, le=120)
    flight_distance: Optional[float] = Field(None, alias='Flight Distance', ge=0)
    departure_delay: Optional[float] = Field(None, alias='Departure Delay in Minutes', ge=0)
    inflight_wifi_service: Rating = Field(None, alias='Inflight wifi service', ge=0, le=5)
    departure_arrival_time_convenient: Rating = Field(None, alias='Departure/Arrival time convenient', ge=0, le=5)
    ease_of_online_booking: Rating = Field(None, alias='Ease of Online booking', ge=0, le=5)
    gate_location: Rating = Field(None, alias='Gate location', ge=0, le=5)
    food_and_drink: Rating = Field(None, alias='Food and drink', ge=0, le=5)
    online_boarding: Rating = Field(None, alias='Online boarding', ge=0, le=5)
    seat_comfort: Rating = Field(None, alias='Seat comfort', ge=0, le=5)
    inflight_entertainment: Rating = Field(None, alias='Inflight entertainment', ge=0, le=5)
    on_board_service: Rating = Field(None, alias='On-board service', ge=0, le=5)
    leg_room_service: Rating = Field(None, alias='Leg room service', ge=0, le=5)
    baggage_handling: Rating = Field(None, alias='Baggage handling', ge=0, le=5)
    checkin_service: Rating = Field(None, alias='Checkin service', ge=0, le=5)
    inflight_service: Rating = Field(None, alias='Inflight service', ge=0, le=5)
    cleanliness: Rating = Field(None, alias='Cleanliness', ge=0, le=5)


class Prediction(BaseModel):
    satisfied_probability: float
    prediction: Literal['satisfied', 'neutral or dissatisfied']
    model_version: str


class BatchRequest(BaseModel):
    passengers: List[Passenger] = Field(min_length=1, max_length=1000)


# ---------------------------------------------------------------
# Metrics + access-log middleware
# ---------------------------------------------------------------
@app.middleware('http')
async def observe_requests(request: Request, call_next):
    if request.url.path == '/metrics':
        return await call_next(request)
    IN_PROGRESS.inc()
    started = time.perf_counter()
    status = 500
    try:
        response = await call_next(request)
        status = response.status_code
        return response
    finally:
        elapsed = time.perf_counter() - started
        IN_PROGRESS.dec()
        route = request.scope.get('route')
        path = route.path if route else 'unmatched'   # route template keeps label cardinality low
        REQUESTS.labels(request.method, path, str(status)).inc()
        LATENCY.labels(request.method, path).observe(elapsed)
        if path not in ('/health', '/ready'):
            logger.info('request', extra={'extra_fields': {'method': request.method, 'path': path,
                                                             'status': status,
                                                             'duration_ms': round(elapsed * 1000, 2)}})


def predict_frame(passengers):
    if model is None:
        raise HTTPException(status_code=503, detail='Model not loaded')
    rows = [p.model_dump(by_alias=True) for p in passengers]
    frame = pd.DataFrame(rows, columns=FEATURE_COLS).astype({c: float for c in FEATURE_COLS[4:]})
    try:
        if CHAOS_ERROR_RATE and random.random() < CHAOS_ERROR_RATE:
            raise RuntimeError('injected failure (CHAOS_ERROR_RATE)')
        proba = model.predict_proba(frame)[:, 1]
    except Exception as exc:
        PREDICTION_ERRORS.inc()
        logger.exception('prediction failed')
        raise HTTPException(status_code=500, detail='Prediction failed') from exc
    results = []
    for p in proba:
        label = 'satisfied' if p >= 0.5 else 'neutral or dissatisfied'
        PREDICTIONS.labels(label).inc()
        results.append(Prediction(satisfied_probability=round(float(p), 4), prediction=label,
                                  model_version=APP_VERSION))
    return results


# ---------------------------------------------------------------
# Routes
# ---------------------------------------------------------------
@app.get('/health')
def health():
    return {'status': 'ok'}


@app.get('/ready')
def ready(response: Response):
    if model is None:
        response.status_code = 503
        return {'status': 'not ready', 'reason': f'model not loaded from {MODEL_PATH}'}
    return {'status': 'ready'}


@app.get('/version')
def version():
    return {'app_version': APP_VERSION, 'pod': HOSTNAME,
            'model': model_metadata.get('model'), 'model_metrics': model_metadata.get('metrics'),
            'trained_at': model_metadata.get('trained_at')}


@app.post('/predict', response_model=Prediction)
def predict(passenger: Passenger):
    return predict_frame([passenger])[0]


@app.post('/predict/batch', response_model=List[Prediction])
def predict_batch(batch: BatchRequest):
    return predict_frame(batch.passengers)


@app.get('/metrics')
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
