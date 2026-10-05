import sys
import os
import csv
import io
import secrets
from pathlib import Path
from functools import lru_cache

from dotenv import load_dotenv
load_dotenv()
from networksecurity.exception.exception import NetworkSecurityException
from networksecurity.logging.logger import logging

from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, File, UploadFile, Request, HTTPException
from uvicorn import run as app_run
from fastapi.responses import Response, HTMLResponse, JSONResponse
from starlette.responses import RedirectResponse
import pandas as pd
import numpy as np
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from networksecurity.monitoring import REGISTRY, RequestMetricsMiddleware

from networksecurity.utils.main_utils.utils import load_object

from networksecurity.utils.ml_utils.model.estimator import NetworkModel


app = FastAPI()
PROJECT_DIR = Path(__file__).resolve().parent
origins = ["*"]


@lru_cache(maxsize=1)
def get_prediction_model():
    preprocessor = load_object(PROJECT_DIR / "final_model/preprocessor.pkl")
    model = load_object(PROJECT_DIR / "final_model/model.pkl")
    return NetworkModel(preprocessor=preprocessor, model=model)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestMetricsMiddleware)


@app.exception_handler(Exception)
async def application_error(request: Request, exc: Exception):
    logging.error("Unhandled application error: method=%s", request.method,
                  exc_info=(type(exc), exc, exc.__traceback__))
    return JSONResponse(status_code=500, content={"detail": "An internal application error occurred."})


@app.get("/metrics", include_in_schema=False)
def metrics(request: Request):
    token = os.getenv("METRICS_TOKEN", "")
    if not token:
        raise HTTPException(status_code=503, detail="Metrics access is not configured")
    authorization = request.headers.get("authorization", "")
    scheme, _, supplied = authorization.partition(" ")
    if scheme.lower() != "bearer" or not secrets.compare_digest(
        supplied.encode("utf-8"), token.encode("utf-8")
    ):
        raise HTTPException(status_code=401, detail="A valid metrics bearer token is required",
                            headers={"WWW-Authenticate": "Bearer"})
    return Response(content=generate_latest(REGISTRY), media_type=CONTENT_TYPE_LATEST,
                    headers={"Cache-Control": "no-store"})

@app.get("/", tags=["authentication"])
async def index():
    return RedirectResponse(url="/docs")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/ready")
def ready():
    try:
        get_prediction_model()
        return {"status": "ready"}
    except Exception:
        logging.exception("Prediction model could not be loaded")
        raise HTTPException(status_code=503, detail="Prediction model is not ready")


@app.get("/version")
def version():
    return {"commit": os.getenv("RENDER_GIT_COMMIT") or os.getenv("APP_VERSION", "local")}

@app.get("/train")
async def train_route():
    if os.getenv("ENABLE_TRAINING", "false").lower() != "true":
        raise HTTPException(status_code=403, detail="Training is disabled for the prediction demo.")
    try:
        from networksecurity.pipeline.training_pipeline import TrainingPipeline

        train_pipeline=TrainingPipeline()
        train_pipeline.run_pipeline()
        return Response("Training is successful")
    except Exception as e:
        raise NetworkSecurityException(e,sys)
    
@app.post("/predict")
async def predict_route(request: Request,file: UploadFile = File(...)):
    try:
        try:
            text = (await file.read()).decode("utf-8-sig")
            rows = list(csv.reader(io.StringIO(text), strict=True))
        except (UnicodeDecodeError, csv.Error) as exc:
            raise HTTPException(status_code=422, detail="Upload a valid UTF-8 CSV file") from exc
        if len(rows) < 2 or not rows[0] or any(len(row) != len(rows[0]) for row in rows[1:]):
            raise HTTPException(status_code=422, detail="CSV must contain a header and data rows with matching column counts")
        if len(set(rows[0])) != len(rows[0]):
            raise HTTPException(status_code=422, detail="CSV column names must be unique")

        network_model = get_prediction_model()
        expected = getattr(network_model.preprocessor, "feature_names_in_", None)
        if expected is not None:
            missing = sorted(set(expected) - set(rows[0]))
            extra = sorted(set(rows[0]) - set(expected))
            if missing or extra:
                raise HTTPException(status_code=422, detail={"message": "CSV columns must match the model features",
                                                           "missing": missing, "unexpected": extra})
        elif len(rows[0]) != network_model.preprocessor.n_features_in_:
            raise HTTPException(status_code=422, detail="CSV has the wrong number of model features")

        df = pd.DataFrame(rows[1:], columns=rows[0])
        try:
            df = df.apply(pd.to_numeric, errors="raise")
        except (ValueError, TypeError) as exc:
            raise HTTPException(status_code=422, detail="All CSV feature values must be numeric") from exc
        if not np.isfinite(df.to_numpy(dtype=float)).all():
            raise HTTPException(status_code=422, detail="CSV feature values must be finite numbers without empty cells")
        if expected is not None:
            df = df.loc[:, list(expected)]
        y_pred = network_model.predict(df)
        df['predicted_column'] = y_pred
        #df['predicted_column'].replace(-1, 0)
        #return df.to_json()
        output_dir = PROJECT_DIR / "prediction_output"
        output_dir.mkdir(exist_ok=True)
        df.to_csv(output_dir / 'output.csv')
        table_html = df.to_html(classes='table table-striped')
        return HTMLResponse(content=table_html, status_code=200)
        
    except HTTPException as exc:
        logging.warning("Prediction input rejected: status=%s detail=%s", exc.status_code, exc.detail)
        raise
    except Exception:
        logging.exception("Prediction failed")
        raise
    finally:
        await file.close()

    
if __name__=="__main__":
    app_run(app,host="0.0.0.0",port=int(os.getenv("PORT", "8000")))
