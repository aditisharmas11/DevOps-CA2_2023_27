"""
MediTwin — Module 1 FastAPI Bridge

Thin HTTP wrapper around the existing predict_risk.py logic.
Exposes:
    POST /predict  →  { health_record: {...} }  →  prediction_report JSON
    GET  /health   →  { status: "ok" }

Run:
    cd Module_1
    uvicorn api:app --port 8001 --reload
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

# ── sys.path bootstrap ────────────────────────────────────────────────────────
_MODULE1_DIR = Path(__file__).resolve().parent
if str(_MODULE1_DIR) not in sys.path:
    sys.path.insert(0, str(_MODULE1_DIR))
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any

# Import the existing Module 1 pipeline components
import config as m1_config
from feature_engine import get_feature_names, align_feature_dataframe

import os
import math
import numpy as np
import pandas as pd
from xgboost import XGBClassifier, DMatrix

# ── Load model once at startup ────────────────────────────────────────────────

MODEL_DIR = str(_MODULE1_DIR / "models")
_MODEL_PATH = os.path.join(MODEL_DIR, "xgboost_model.json")
_FEATURE_NAMES_PATH = os.path.join(MODEL_DIR, "xgboost_feature_names.json")

_model: XGBClassifier | None = None
_feature_names: list[str] | None = None


def _load_model():
    global _model, _feature_names
    if _model is None:
        _model = XGBClassifier()
        _model.load_model(_MODEL_PATH)
        with open(_FEATURE_NAMES_PATH, "r", encoding="utf-8") as f:
            _feature_names = json.load(f)
        print(f"[Module 1 API] Model loaded: {_MODEL_PATH}")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="MediTwin Module 1 API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    _load_model()


# ── Schemas ───────────────────────────────────────────────────────────────────

class PredictRequest(BaseModel):
    health_record: dict[str, Any]


# ── Helpers ───────────────────────────────────────────────────────────────────

def json_safe(value):
    if isinstance(value, dict):
        return {str(k): json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_safe(i) for i in value]
    if isinstance(value, pd.Timestamp):
        return None if pd.isna(value) else value.isoformat()
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, np.floating):
        return None if (np.isnan(value) or np.isinf(value)) else float(value)
    if isinstance(value, np.ndarray):
        return [json_safe(i) for i in value.tolist()]
    if isinstance(value, float):
        return None if (math.isnan(value) or math.isinf(value)) else value
    return value


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "MediTwin Module 1 API"}


@app.post("/predict")
def predict(req: PredictRequest):
    """
    Accepts a health record JSON (same format as sample_patient.json)
    and returns the full Module 1 prediction report.
    """
    try:
        # Delegate to the existing predict_risk.py pipeline via subprocess
        # to avoid re-implementing all the logic here. This is the cleanest
        # approach that keeps the existing code intact.
        import subprocess, tempfile

        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", delete=False, encoding="utf-8"
        ) as tmp:
            json.dump(req.health_record, tmp)
            tmp_path = tmp.name

        result = subprocess.run(
            [sys.executable, str(_MODULE1_DIR / "10_predict_v2.py"), tmp_path, "--no-chart"],
            capture_output=True,
            text=True,
            cwd=str(_MODULE1_DIR),
        )

        os.unlink(tmp_path)

        if result.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail=f"Module 1 prediction failed: {result.stderr[-2000:]}",
            )

        # The prediction report JSON is written to outputs/<patient_id>/prediction_report.json
        # Parse patient_id from the health record
        patient_id = req.health_record.get("patient_id", "UNKNOWN")
        report_path = _MODULE1_DIR / "outputs" / str(patient_id) / "prediction_report.json"

        if not report_path.exists():
            # Fallback: try to parse JSON from stdout
            raise HTTPException(
                status_code=500,
                detail=f"Report not generated. stdout: {result.stdout[-1000:]}",
            )

        with open(report_path, "r", encoding="utf-8") as f:
            report = json.load(f)

        return json_safe(report)

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
