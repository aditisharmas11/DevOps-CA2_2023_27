import asyncio, os, random, time
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, Request, Response
from pydantic import BaseModel
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

MODEL_DIR = Path(os.getenv("MODEL_DIR", Path(__file__).resolve().parent.parent / "ml"))
APP_VERSION = os.getenv("APP_VERSION", "1.0")

model = joblib.load(MODEL_DIR / "ids_xgboost_model.joblib")
scaler = joblib.load(MODEL_DIR / "ids_scaler.joblib")
cat_encoders = joblib.load(MODEL_DIR / "ids_categorical_encoders.joblib")
target_encoder = joblib.load(MODEL_DIR / "ids_target_encoder.joblib")

ALL_FEATURES = [
    "duration", "protocol_type", "service", "flag", "src_bytes", "dst_bytes", "land",
    "wrong_fragment", "urgent", "hot", "num_failed_logins", "logged_in", "num_compromised",
    "root_shell", "su_attempted", "num_root", "num_file_creations", "num_shells",
    "num_access_files", "num_outbound_cmds", "is_host_login", "is_guest_login", "count",
    "srv_count", "serror_rate", "srv_serror_rate", "rerror_rate", "srv_rerror_rate",
    "same_srv_rate", "diff_srv_rate", "srv_diff_host_rate", "dst_host_count",
    "dst_host_srv_count", "dst_host_same_srv_rate", "dst_host_diff_srv_rate",
    "dst_host_same_src_port_rate", "dst_host_srv_diff_host_rate", "dst_host_serror_rate",
    "dst_host_srv_serror_rate", "dst_host_rerror_rate", "dst_host_srv_rerror_rate",
]

REQS = Counter("http_requests_total", "HTTP requests", ["method", "path", "status"])
LAT = Histogram("http_request_duration_seconds", "Request latency in seconds", ["path"])
PRED = Counter("ids_predictions_total", "Predictions by class", ["label"])

app = FastAPI(title="NIDS API", version=APP_VERSION)


class Record(BaseModel):
    features: dict


@app.middleware("http")
async def track(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    path = request.url.path
    LAT.labels(path).observe(time.perf_counter() - start)
    REQS.labels(request.method, path, str(response.status_code)).inc()
    return response


def preprocess(row: dict) -> pd.DataFrame:
    data = {f: row.get(f, 0) for f in ALL_FEATURES}
    for col, enc in cat_encoders.items():
        val = str(row.get(col, enc.classes_[0]))
        if val not in enc.classes_:
            val = enc.classes_[0]
        data[col] = int(enc.transform([val])[0])
    df = pd.DataFrame([data], columns=ALL_FEATURES).astype(float)
    cols = list(getattr(scaler, "feature_names_in_", ALL_FEATURES))
    df[cols] = scaler.transform(df[cols])
    return df[list(getattr(model, "feature_names_in_", ALL_FEATURES))]


@app.get("/")
def root():
    return {"service": "NIDS API", "version": APP_VERSION}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/version")
def version():
    return {"version": APP_VERSION}


@app.post("/predict")
def predict(rec: Record):
    X = preprocess(rec.features)
    pred = int(model.predict(X)[0])
    label = str(target_encoder.inverse_transform([pred])[0])
    conf = float(model.predict_proba(X)[0].max())
    PRED.labels(label).inc()
    return {"label": label, "is_attack": label.lower() != "normal", "confidence": round(conf, 4)}


@app.get("/slow")
async def slow():
    await asyncio.sleep(random.uniform(0.2, 1.5))
    return {"status": "slow ok"}


@app.get("/error")
def error():
    raise HTTPException(status_code=500, detail="simulated failure")


@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)