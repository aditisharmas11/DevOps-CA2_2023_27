"""
MediTwin — Module 3 FastAPI Bridge

Thin HTTP wrapper around the existing module3_engine + report_generator.
Exposes:
    POST /recommend  →  { module1_output, module2_output }  →  report JSON
    GET  /health     →  { status: "ok" }

Run:
    cd Module_3
    uvicorn api:app --port 8003 --reload
"""

from __future__ import annotations

import sys
from pathlib import Path

# ── sys.path bootstrap ────────────────────────────────────────────────────────
_MODULE3_DIR = Path(__file__).resolve().parent
if str(_MODULE3_DIR) not in sys.path:
    sys.path.insert(0, str(_MODULE3_DIR))

# Windows UTF-8 safety
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any

import module3_engine as engine
import report_generator
import drug_api_client

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="MediTwin Module 3 API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ───────────────────────────────────────────────────────────────────

class RecommendRequest(BaseModel):
    module1_output: dict[str, Any] | None = None
    module2_output: dict[str, Any] | None = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _collect_drug_info(recommendations: list[dict]) -> dict:
    drug_names = []
    for r in recommendations:
        for example in r.get("common_examples", []):
            if example not in drug_names:
                drug_names.append(example)
    results = {}
    for name in drug_names:
        try:
            results[name] = drug_api_client.get_drug_information(name)
        except Exception as exc:
            results[name] = {"drug_name": name, "external_data_available": False, "error": str(exc)}
    return results


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "MediTwin Module 3 API"}


@app.post("/recommend")
def recommend(req: RecommendRequest):
    """
    Accepts Module 1 and/or Module 2 outputs (at least one required).
    Returns the full Module 3 recommendation report as JSON.
    """
    if req.module1_output is None and req.module2_output is None:
        raise HTTPException(
            status_code=400,
            detail="At least one of module1_output or module2_output must be provided.",
        )

    try:
        patient_context = engine.build_patient_context(req.module1_output, req.module2_output)
        recommendations = engine.build_recommendations(patient_context)
        urgency = engine.assess_urgency(patient_context)
        drug_lookups = _collect_drug_info(recommendations)
        json_report = report_generator.build_json_report(
            patient_context, recommendations, urgency, drug_lookups
        )

        return {
            "patient_context": patient_context,
            "recommendations": recommendations,
            "urgency": urgency,
            "drug_lookups": drug_lookups,
            "full_report": json_report,
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
