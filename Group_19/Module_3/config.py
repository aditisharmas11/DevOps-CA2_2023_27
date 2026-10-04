"""
MediTwin — Module 3 — Configuration

Central place for paths, external API settings, and tunable thresholds
that control how Module 3 behaves. Nothing clinical is hardcoded in the
engine itself — clinical thresholds live in `clinical_thresholds.json`
and treatment content lives in `treatment_knowledge.json`, both loaded
through this config.
"""

from pathlib import Path

# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

SAMPLE_INPUTS_DIR = BASE_DIR / "sample_inputs"
OUTPUTS_DIR = BASE_DIR / "outputs"
CACHE_DIR = BASE_DIR / "cache"

CLINICAL_THRESHOLDS_FILE = BASE_DIR / "clinical_thresholds.json"
TREATMENT_KNOWLEDGE_FILE = BASE_DIR / "treatment_knowledge.json"

DRUG_CACHE_FILE = CACHE_DIR / "drug_information_cache.json"

for _dir in (OUTPUTS_DIR, CACHE_DIR):
    _dir.mkdir(parents=True, exist_ok=True)


# ============================================================
# EXTERNAL API CONFIGURATION
# ============================================================
#
# Both APIs below are free, public, and require NO API key for the
# read-only endpoints Module 3 uses. Module 3 never fails hard if
# these are unreachable — it falls back to the local treatment
# knowledge base and clearly labels the report accordingly.
#
# RxNorm  (National Library of Medicine)
#   - Purpose here: normalize a drug-class / example-medicine name to
#     its standardized RxNorm concept (RxCUI) and confirm it's a real,
#     recognized drug name.
#   - Auth: none required.
#   - Rate limit: no published hard limit for reasonable/non-bulk use;
#     we still cache and space out calls.
#   - Docs: https://lhncbc.nlm.nih.gov/RxNav/APIs/RxNormAPIs.html
#
# openFDA Drug Label API
#   - Purpose here: pull manufacturer-submitted label sections
#     (indications, warnings, contraindications) for a given drug name
#     so the report can show real regulatory-source safety language
#     instead of an invented summary.
#   - Auth: none required for low volume; an optional free API key
#     raises the rate limit but is not required for this project.
#   - Rate limit (no key): 240 requests/minute, 1000/day per IP.
#   - Docs: https://open.fda.gov/apis/drug/label/

RXNORM_BASE_URL = "https://rxnav.nlm.nih.gov/REST"
OPENFDA_BASE_URL = "https://api.fda.gov/drug/label.json"

API_TIMEOUT_SECONDS = 2
API_MAX_RETRIES = 0

# If True, network calls are skipped entirely and only the local cache
# + local knowledge base are used. Useful for offline demos & zero-latency execution.
OFFLINE_MODE = True


# ============================================================
# MODULE 2 CONFIDENCE BANDS
# ============================================================
# Applied to `probability` (0-1) returned by Module 2's
# predict_from_evidence(). Configurable, not hidden in code.

CONFIDENCE_BANDS = {
    "HIGH": 0.60,       # probability >= 0.60  -> HIGH
    "MEDIUM": 0.25,      # 0.25 <= probability < 0.60 -> MEDIUM
    # below MEDIUM floor -> LOW
}

# Module 2's own conversation engine already refuses to predict on a
# single piece of evidence (MIN_POSITIVE_EVIDENCE=2). Module 3 adds a
# second, independent gate on the evidence count it was actually given,
# since Module 3 may also be called directly with a raw evidence list.
MIN_EVIDENCE_FOR_CONFIDENT_USE = 2


# ============================================================
# MODULE 1 DATA SUFFICIENCY
# ============================================================

DATA_SUFFICIENCY_BANDS = {
    "HIGH": 0.70,
    "MODERATE": 0.40,
    # below MODERATE floor -> LIMITED
}

MIN_UNIQUE_DATES_FOR_TREND = 2

# Module 1's own risk categories (mirrors module_1/config.py
# RISK_THRESHOLDS so Module 3 stays consistent even if it never
# receives module_1's config.py directly).
RISK_THRESHOLDS = {
    "low_max": 0.15,
    "elevated_max": 0.30,
    "high_max": 0.50,
}


# ============================================================
# URGENCY ENGINE
# ============================================================

URGENCY_LEVELS = [
    "ROUTINE_FOLLOW_UP",
    "HIGH_PRIORITY",
    "URGENT_EVALUATION",
    "INSUFFICIENT_INFORMATION",
]

# Any DDXPlus pathology considered a medical emergency if it appears
# among Module 2's top predictions with at least MEDIUM confidence.
# This list is intentionally short and reviewable — extend with care.
RED_FLAG_CONDITIONS = {
    "Anaphylaxis",
    "Possible NSTEMI / STEMI",
    "Unstable angina",
    "Pulmonary embolism",
    "Acute pulmonary edema",
    "Spontaneous pneumothorax",
    "Boerhaave",
    "Epiglottitis",
    "Guillain-Barré syndrome",
    "Myocarditis",
    "Ebola",
}

# Free-text symptom keywords (from Module 2's positive evidence text /
# declared symptoms) that independently raise urgency regardless of
# which disease was predicted.
RED_FLAG_SYMPTOM_KEYWORDS = {
    "chest pain",
    "difficulty breathing",
    "shortness of breath",
    "loss of consciousness",
    "severe bleeding",
    "sudden weakness",
    "slurred speech",
}


# ============================================================
# RECOMMENDATION SCORING WEIGHTS
# ============================================================
# Transparent, additive scoring — every weight below is visible in the
# generated report's "why this was prioritized" section. This is NOT a
# black-box model; it is a documented rule-based rubric.

SCORE_WEIGHTS = {
    "disease_confidence": 0.35,      # Module 2 probability
    "clinical_relevance": 0.20,      # trend/abnormality support from Module 1
    "trend_severity": 0.15,          # severity of worsening trends
    "future_risk": 0.15,             # Module 1 acute_event_probability
    "safety_penalty": -0.15,         # subtracted when safety flags exist
    "uncertainty_penalty": -0.20,    # subtracted for low data sufficiency
}


# ============================================================
# REPORT / APP SETTINGS
# ============================================================

APP_NAME = "MediTwin Module 3 — Personalized Treatment Support"
REPORT_VERSION = "1.0"

TOP_N_DISEASES_IN_REPORT = 5
GENERATE_CHARTS = True
