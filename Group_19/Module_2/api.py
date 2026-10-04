"""
MediTwin — Module 2 FastAPI Bridge

Thin HTTP wrapper around MediTwinInferencePipeline.
Exposes:
    POST /predict-disease  →  { symptoms, age, sex }  →  predictions JSON
    GET  /health           →  { status: "ok" }

Run:
    cd Module_2
    uvicorn api:app --port 8002 --reload
"""

from __future__ import annotations

import sys
from pathlib import Path

# ── sys.path bootstrap ────────────────────────────────────────────────────────
_MODULE2_DIR = Path(__file__).resolve().parent
if str(_MODULE2_DIR) not in sys.path:
    sys.path.insert(0, str(_MODULE2_DIR))
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any

from inference.inference_pipeline import MediTwinInferencePipeline

# ── Load pipeline once at startup ─────────────────────────────────────────────

_pipeline: MediTwinInferencePipeline | None = None

# Module 3 confidence band thresholds (mirrors Module_3/config.py)
_CONFIDENCE_BANDS = {"HIGH": 0.60, "MEDIUM": 0.25}


def _confidence_label(prob: float) -> str:
    if prob >= _CONFIDENCE_BANDS["HIGH"]:
        return "HIGH"
    if prob >= _CONFIDENCE_BANDS["MEDIUM"]:
        return "MEDIUM"
    return "LOW"


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="MediTwin Module 2 API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    global _pipeline
    print("[Module 2 API] Loading inference pipeline...")
    _pipeline = MediTwinInferencePipeline()
    print("[Module 2 API] Pipeline ready.")


# ── Schemas ───────────────────────────────────────────────────────────────────

class DiseasePredictRequest(BaseModel):
    # Free-text symptom description (preferred) OR pre-parsed list
    symptoms: list[str] | None = None
    text: str | None = None          # alternative: raw text input
    age: float = 30.0
    sex: str = "unknown"
    top_k: int = 5


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "MediTwin Module 2 API"}


@app.post("/predict-disease")
def predict_disease(req: DiseasePredictRequest):
    """
    Accepts either:
      - text: raw free-text symptom description
      - symptoms: list of symptom strings (joined and sent as text)

    Returns top-k disease predictions with confidence labels.
    """
    if _pipeline is None:
        raise HTTPException(status_code=503, detail="Pipeline not loaded yet.")

    try:
        # Build input text
        if req.text:
            input_text = req.text.strip()
        elif req.symptoms:
            input_text = ", ".join(req.symptoms)
        else:
            raise HTTPException(status_code=400, detail="Provide 'text' or 'symptoms'.")

        result = _pipeline.predict(
            text=input_text,
            age=req.age,
            sex=req.sex,
            top_k=req.top_k,
        )

        # Normalise predictions for the frontend and Module 3
        predictions = []
        for p in result.get("predictions", []):
            prob = float(p["probability"])
            predictions.append({
                "disease": p["condition"],
                "probability": prob,
                "probability_percent": round(prob * 100, 2),
                "confidence": _confidence_label(prob),
            })

        return {
            "status": result.get("status"),
            "input_text": input_text,
            "age": req.age,
            "sex": req.sex,
            "predictions": predictions,
            "evidence_atoms": result.get("evidence_atoms", []),
            "warning": result.get("warning"),
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
