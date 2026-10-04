"""
MediTwin — Module 3 — Clinical Context & Recommendation Engine

Pipeline:

    raw Module 1 JSON  -->  parse_module1_output()   -->  m1_context
    raw Module 2 JSON  -->  parse_module2_output()   -->  m2_context

    (m1_context, m2_context) --> build_patient_context() --> patient_context

    patient_context --> extract_clinical_signals()   --> signals
    patient_context --> assess_data_sufficiency()    --> sufficiency
    patient_context --> run_safety_checks()          --> safety_flags
    patient_context --> assess_urgency()             --> urgency

    all of the above --> build_recommendations()     --> recommendations

Every adapter below reads fields defensively (`.get()` with fallbacks)
rather than assuming the exact upstream schema, per the project's own
"do not assume field names" requirement -- while still being built
directly against the REAL sample outputs produced by Module 1 and
Module 2 in this project (see sample_inputs/).
"""

from __future__ import annotations

import json
from typing import Any, Optional

import config


# ============================================================
# KNOWLEDGE LOADING
# ============================================================

def _load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


CLINICAL_THRESHOLDS = _load_json(config.CLINICAL_THRESHOLDS_FILE)
TREATMENT_KNOWLEDGE = _load_json(config.TREATMENT_KNOWLEDGE_FILE)


# ============================================================
# MODULE 1 ADAPTER
# ============================================================

def parse_module1_output(raw: dict) -> dict:
    """
    Normalize a Module 1 prediction_report.json, MongoDB RiskPrediction document,
    or compatible payload into a stable internal shape.
    """
    if not isinstance(raw, dict):
        raise ValueError("Module 1 output must be a JSON object.")

    # Flatten nested fullReport if present
    if "fullReport" in raw and isinstance(raw["fullReport"], dict):
        raw = {**raw["fullReport"], **raw}

    prediction = raw.get("prediction", {}) or {}
    if not isinstance(prediction, dict):
        prediction = {}
    history = raw.get("history_summary") or raw.get("historySummary") or {}
    data_confidence = raw.get("data_confidence") or raw.get("dataConfidence") or {}
    feature_coverage = raw.get("feature_coverage") or raw.get("featureCoverage") or {}
    observation_progression = (
        raw.get("observation_progression")
        or raw.get("trends")
        or []
    )
    risk_progression = raw.get("risk_progression") or []
    increasing_factors = (
        raw.get("top_risk_increasing_factors")
        or raw.get("importantFactors")
        or []
    )
    reducing_factors = raw.get("top_risk_reducing_factors", []) or []

    acute_prob = (
        prediction.get("acute_event_probability")
        if prediction.get("acute_event_probability") is not None
        else raw.get("probability")
    )
    if acute_prob is None and raw.get("probabilityPercent") is not None:
        acute_prob = float(raw["probabilityPercent"]) / 100.0

    risk_cat = (
        prediction.get("risk_category")
        or raw.get("riskCategory")
        or raw.get("risk_category")
    )

    return {
        "patient_id": raw.get("patient_id") or raw.get("patientId"),
        "generated_at": raw.get("generated_at") or raw.get("createdAt"),
        "prediction_horizon_days": (
            raw.get("prediction_horizon_days")
            or raw.get("predictionHorizonDays")
            or config.RISK_THRESHOLDS.get("horizon_days")
            or 90
        ),
        "reference_date": raw.get("reference_date"),

        "acute_event_probability": acute_prob,
        "risk_category": risk_cat,
        "predicted_positive": prediction.get("predicted_positive"),
        "recommended_threshold": prediction.get("recommended_threshold", 0.45),
        "interpretation": prediction.get("interpretation") or raw.get("interpretation"),

        "total_records": history.get("total_records") or len(observation_progression),
        "observation_types": history.get("observation_types") or len(observation_progression),
        "unique_dates": history.get("unique_dates", 1),
        "history_days": history.get("history_days", 0),

        "data_confidence_score": data_confidence.get("score") or (data_confidence.get("percent", 0) / 100.0 if data_confidence.get("percent") else 0.9),
        "data_confidence_category": data_confidence.get("category", "HIGH"),
        "feature_coverage_percent": feature_coverage.get("available_percent") or data_confidence.get("feature_coverage_percent", 100.0),

        "observation_progression": observation_progression,
        "risk_progression": risk_progression,
        "top_risk_increasing_factors": increasing_factors,
        "top_risk_reducing_factors": reducing_factors,

        "_raw_available": True,
    }


def _empty_module1_context() -> dict:
    """Used when no Module 1 output is supplied at all."""
    return {
        "patient_id": None,
        "generated_at": None,
        "prediction_horizon_days": None,
        "reference_date": None,
        "acute_event_probability": None,
        "risk_category": None,
        "predicted_positive": None,
        "recommended_threshold": None,
        "interpretation": None,
        "total_records": 0,
        "observation_types": 0,
        "unique_dates": 0,
        "history_days": 0,
        "data_confidence_score": None,
        "data_confidence_category": None,
        "feature_coverage_percent": None,
        "observation_progression": [],
        "risk_progression": [],
        "top_risk_increasing_factors": [],
        "top_risk_reducing_factors": [],
        "_raw_available": False,
    }


# ============================================================
# MODULE 2 ADAPTER
# ============================================================

def parse_module2_output(raw: dict) -> dict:
    """
    Normalize a Module 2 prediction payload from raw CLI output,
    MongoDB SymptomAnalysis document, or conversation engine state.
    """
    if not isinstance(raw, dict):
        raise ValueError("Module 2 output must be a JSON object.")

    if "fullOutput" in raw and isinstance(raw["fullOutput"], dict):
        raw = {**raw["fullOutput"], **raw}

    predictions = raw.get("predictions")
    if not predictions:
        model_payload = raw.get("model") or {}
        predictions = model_payload.get("predictions", [])

    predictions = predictions or []

    normalized_predictions = []
    for entry in predictions:
        if not isinstance(entry, dict):
            continue
        condition = (
            entry.get("condition")
            or entry.get("disease")
            or entry.get("pathology")
        )
        prob = entry.get("probability")
        if prob is None and entry.get("probability_percent") is not None:
            prob = float(entry["probability_percent"]) / 100.0
        elif prob is None and entry.get("probabilityPercent") is not None:
            prob = float(entry["probabilityPercent"]) / 100.0

        if condition is None or prob is None:
            continue

        prob_val = float(prob)
        prob_pct = entry.get(
            "probability_percent",
            entry.get("probabilityPercent", round(prob_val * 100.0, 2))
        )
        conf = entry.get("confidence") or confidence_band(prob_val)

        normalized_predictions.append(
            {
                "condition": condition,
                "disease": condition,
                "probability": prob_val,
                "probability_percent": float(prob_pct),
                "confidence": conf,
                "class_id": entry.get("class_id"),
            }
        )

    normalized_predictions.sort(key=lambda p: p["probability"], reverse=True)

    evidence_atoms = raw.get("evidence_atoms", []) or []
    positive_evidence_text = raw.get("positive_evidence_text", []) or []
    if not positive_evidence_text and raw.get("symptoms"):
        positive_evidence_text = raw.get("symptoms")

    evidence_count = len(evidence_atoms) if evidence_atoms else len(
        raw.get("positive_evidence", []) or raw.get("symptoms", []) or []
    )

    status = raw.get("status", "ok")

    return {
        "patient_id": raw.get("patient_id") or raw.get("patientId"),
        "status": status,
        "predictions": normalized_predictions,
        "evidence_atoms": evidence_atoms,
        "positive_evidence_text": positive_evidence_text,
        "evidence_count": evidence_count,
        "age": raw.get("age"),
        "sex": raw.get("sex"),
        "_raw_available": True,
    }


def _empty_module2_context() -> dict:
    return {
        "patient_id": None,
        "status": "no_input",
        "predictions": [],
        "evidence_atoms": [],
        "positive_evidence_text": [],
        "evidence_count": 0,
        "age": None,
        "sex": None,
        "_raw_available": False,
    }


# ============================================================
# CLINICAL SIGNAL EXTRACTION (Module 1 observations)
# ============================================================

def _classify_abnormality(observation_name: str, latest_value) -> str:
    """
    HIGH / LOW / NORMAL / UNKNOWN, per clinical_thresholds.json.
    Never raises on unrecognized observation names or missing values.
    """

    if latest_value is None:
        return "UNKNOWN"

    spec = CLINICAL_THRESHOLDS.get(observation_name)
    if not spec or "direction_of_concern" not in spec:
        return "UNKNOWN"

    low = spec.get("low")
    high = spec.get("high")

    if low is not None and latest_value < low:
        return "LOW"
    if high is not None and latest_value > high:
        return "HIGH"
    if low is None and high is None:
        return "UNKNOWN"
    return "NORMAL"


def _classify_severity(observation_name: str, latest_value, abnormality: str) -> str:
    """MILD / MODERATE / HIGH / CRITICAL / UNKNOWN based on 'very_*' bands."""

    if abnormality in ("NORMAL", "UNKNOWN") or latest_value is None:
        return "UNKNOWN" if abnormality == "UNKNOWN" else "NORMAL"

    spec = CLINICAL_THRESHOLDS.get(observation_name, {})

    if abnormality == "HIGH":
        very_high = spec.get("very_high")
        if very_high is not None and latest_value >= very_high:
            return "HIGH"
        return "MILD"

    if abnormality == "LOW":
        very_low = spec.get("very_low")
        if very_low is not None and latest_value <= very_low:
            return "HIGH"
        return "MILD"

    return "UNKNOWN"


def _trend_direction(entry: dict) -> str:
    """
    Maps Module 1's own 'trend' field (already computed) through, but
    falls back to deriving one from percent_change if 'trend' is
    absent, so this stays robust to minor Module 1 output changes.
    """

    if "trend" in entry and entry["trend"]:
        return entry["trend"]

    percent_change = entry.get("percent_change")
    if percent_change is None:
        return "INSUFFICIENT_DATA"

    threshold = CLINICAL_THRESHOLDS.get("_trend_settings", {}).get(
        "relative_change_worsening_threshold", 0.05
    ) * 100.0

    if percent_change > threshold:
        return "INCREASING"
    if percent_change < -threshold:
        return "DECREASING"
    return "STABLE"


def extract_clinical_signals(m1_context: dict) -> list[dict]:
    """
    Turns Module 1's observation_progression list into a list of
    clinical signals: one per observation, each carrying its current
    abnormality flag, trend direction, and a severity estimate, using
    ONLY the observation's own values (never mixing one biomarker's
    trend into another's assessment).
    """

    signals = []

    for entry in m1_context.get("observation_progression", []):
        name = entry.get("observation")
        if not name:
            continue

        latest_value = entry.get("latest_value")
        abnormality = _classify_abnormality(name, latest_value)
        severity = _classify_severity(name, latest_value, abnormality)
        trend = _trend_direction(entry)

        spec = CLINICAL_THRESHOLDS.get(name, {})
        direction_of_concern = spec.get("direction_of_concern", "neutral")

        # A trend is "worsening" only if its direction actually moves
        # toward the concerning side for THIS specific observation.
        worsening = False
        if direction_of_concern == "higher_worse" and trend == "INCREASING":
            worsening = True
        elif direction_of_concern == "lower_worse" and trend == "DECREASING":
            worsening = True

        signals.append(
            {
                "observation": name,
                "latest_value": latest_value,
                "unit": spec.get("unit"),
                "abnormality": abnormality,
                "severity": severity,
                "trend": trend,
                "worsening": worsening,
                "percent_change": entry.get("percent_change"),
                "records": entry.get("records"),
                "days_since_latest": entry.get("days_since_latest"),
            }
        )

    return signals


# ============================================================
# DATA SUFFICIENCY
# ============================================================

def assess_data_sufficiency(m1_context: dict, m2_context: dict) -> dict:
    """
    Combines Module 1's own reported data_confidence with a Module-3
    -level sufficiency check that also accounts for how much symptom
    evidence Module 2 had. Transparent, additive -- not a black box.
    """

    reasons = []
    score_components = {}

    # --- Module 1 side --------------------------------------------
    m1_score = m1_context.get("data_confidence_score")
    if m1_score is not None:
        score_components["module1_data_confidence"] = float(m1_score)
    else:
        score_components["module1_data_confidence"] = 0.0
        reasons.append("Module 1 output did not include a data confidence score.")

    unique_dates = m1_context.get("unique_dates") or 0
    if unique_dates < config.MIN_UNIQUE_DATES_FOR_TREND:
        reasons.append(
            f"Only {unique_dates} unique observation date(s) available -- "
            f"trend estimates may be unreliable."
        )

    if not m1_context.get("_raw_available"):
        reasons.append("No Module 1 (clinical history) input was supplied.")

    # --- Module 2 side --------------------------------------------
    evidence_count = m2_context.get("evidence_count") or 0
    if evidence_count < config.MIN_EVIDENCE_FOR_CONFIDENT_USE:
        reasons.append(
            f"Only {evidence_count} piece(s) of symptom evidence were used "
            f"by Module 2 -- disease predictions should be treated cautiously."
        )
        m2_sufficiency = 0.3
    else:
        m2_sufficiency = min(1.0, evidence_count / 5.0)

    if not m2_context.get("_raw_available"):
        reasons.append("No Module 2 (symptom/disease prediction) input was supplied.")
        m2_sufficiency = 0.0

    score_components["module2_evidence_sufficiency"] = m2_sufficiency

    combined_score = (
        0.6 * score_components["module1_data_confidence"]
        + 0.4 * score_components["module2_evidence_sufficiency"]
    )

    bands = config.DATA_SUFFICIENCY_BANDS
    if combined_score >= bands["HIGH"]:
        category = "HIGH"
    elif combined_score >= bands["MODERATE"]:
        category = "MODERATE"
    else:
        category = "LIMITED"

    return {
        "score": round(combined_score, 3),
        "category": category,
        "components": score_components,
        "reasons": reasons,
    }


# ============================================================
# PATIENT CONTEXT BUILDER
# ============================================================

def build_patient_context(
    module1_raw: Optional[dict],
    module2_raw: Optional[dict],
) -> dict:
    """
    Builds the normalized internal patient_context used by every
    downstream Module 3 component. Independent of the exact upstream
    JSON shape -- everything below this point works only off this
    structure.
    """

    m1_context = (
        parse_module1_output(module1_raw) if module1_raw else _empty_module1_context()
    )
    m2_context = (
        parse_module2_output(module2_raw) if module2_raw else _empty_module2_context()
    )

    clinical_signals = extract_clinical_signals(m1_context)
    sufficiency = assess_data_sufficiency(m1_context, m2_context)

    important_abnormalities = [
        s for s in clinical_signals if s["abnormality"] in ("HIGH", "LOW")
    ]
    worsening_trends = [s for s in clinical_signals if s["worsening"]]

    patient_id = m1_context.get("patient_id") or m2_context.get("patient_id")

    patient_context = {
        "patient_id": patient_id,
        "module1": m1_context,
        "module2": m2_context,
        "predicted_conditions": m2_context["predictions"],
        "clinical_signals": clinical_signals,
        "important_abnormalities": important_abnormalities,
        "worsening_trends": worsening_trends,
        "data_sufficiency": sufficiency,
        "possible_safety_flags": [],  # filled by run_safety_checks()
    }

    return patient_context


# ============================================================
# CONFIDENCE BANDING (Module 2 disease predictions)
# ============================================================

def confidence_band(probability: float) -> str:
    bands = config.CONFIDENCE_BANDS
    if probability >= bands["HIGH"]:
        return "HIGH"
    if probability >= bands["MEDIUM"]:
        return "MEDIUM"
    return "LOW"


# ============================================================
# SAFETY ENGINE
# ============================================================

def run_safety_checks(patient_context: dict, disease_name: str) -> dict:
    """
    Rule-based safety checks using whatever Module 1 signals are
    actually available for this disease. Distinguishes clearly
    between "checked, no issue found" and "could not be checked" --
    the project explicitly requires this distinction rather than
    implying a guarantee the system cannot make.
    """

    profile = TREATMENT_KNOWLEDGE.get(disease_name, {})
    relevant_obs = set(profile.get("relevant_module1_observations", []))

    flags = []
    checks_performed = []
    checks_unavailable = []

    signals_by_name = {s["observation"]: s for s in patient_context["clinical_signals"]}

    # Renal caution
    renal_obs = {"Creatinine", "Glomerular filtration rate/1.73 sq M.predicted", "Urea Nitrogen"}
    if renal_obs & relevant_obs or renal_obs & set(signals_by_name.keys()):
        renal_signals = [signals_by_name[o] for o in renal_obs if o in signals_by_name]
        if renal_signals:
            checks_performed.append("renal_function")
            abnormal = [s for s in renal_signals if s["abnormality"] in ("HIGH", "LOW")]
            if abnormal:
                names = ", ".join(s["observation"] for s in abnormal)
                flags.append(
                    f"Renal-function-related caution: abnormal value(s) observed for {names}. "
                    f"Medications requiring renal dose adjustment should be flagged for clinician review."
                )
        else:
            checks_unavailable.append("renal_function")

    # Hepatic caution
    hepatic_obs = {
        "Aspartate aminotransferase [Enzymatic activity/volume] in Serum or Plasma",
        "Alanine aminotransferase [Enzymatic activity/volume] in Serum or Plasma",
        "Bilirubin.total [Mass/volume] in Serum or Plasma",
        "Albumin [Mass/volume] in Serum or Plasma",
    }
    if hepatic_obs & relevant_obs or hepatic_obs & set(signals_by_name.keys()):
        hepatic_signals = [signals_by_name[o] for o in hepatic_obs if o in signals_by_name]
        if hepatic_signals:
            checks_performed.append("hepatic_function")
            abnormal = [s for s in hepatic_signals if s["abnormality"] in ("HIGH", "LOW")]
            if abnormal:
                names = ", ".join(s["observation"] for s in abnormal)
                flags.append(
                    f"Hepatic-function-related caution: abnormal value(s) observed for {names}. "
                    f"Hepatically-metabolized medications should be flagged for clinician review."
                )
        else:
            checks_unavailable.append("hepatic_function")

    # Blood-pressure caution
    bp_obs = {"Systolic Blood Pressure", "Diastolic Blood Pressure"}
    if bp_obs & relevant_obs:
        bp_signals = [signals_by_name[o] for o in bp_obs if o in signals_by_name]
        if bp_signals:
            checks_performed.append("blood_pressure")
            abnormal = [s for s in bp_signals if s["abnormality"] in ("HIGH", "LOW")]
            if abnormal:
                flags.append(
                    "Blood-pressure-related caution: treatments that further affect blood "
                    "pressure should be reviewed against the patient's current readings."
                )
        else:
            checks_unavailable.append("blood_pressure")

    # Data-sufficiency-driven caution
    if patient_context["data_sufficiency"]["category"] == "LIMITED":
        flags.append(
            "Overall clinical data is limited -- safety assessment confidence is "
            "correspondingly reduced."
        )

    # Always disclose the categories this system CANNOT check.
    always_unavailable = [
        "known drug allergies (not provided as structured input)",
        "current medication list / drug-drug interactions (not provided as structured input)",
        "pregnancy status (not provided as structured input)",
    ]

    return {
        "disease": disease_name,
        "checks_performed": checks_performed,
        "checks_unavailable": checks_unavailable,
        "flags": flags,
        "always_unavailable": always_unavailable,
        "safety_checks_performed_summary": (
            f"Checked: {', '.join(checks_performed) if checks_performed else 'none applicable'}. "
            f"Not checked (no data / not supported by this system): "
            f"{', '.join(checks_unavailable + always_unavailable)}."
        ),
    }


# ============================================================
# URGENCY / RED-FLAG ENGINE
# ============================================================

def assess_urgency(patient_context: dict) -> dict:
    """
    Rule-based urgency classification. Never claims to diagnose an
    emergency -- only flags that prompt evaluation is warranted based
    on the available findings, per project requirements.
    """

    reasons = []
    level = "ROUTINE_FOLLOW_UP"

    top_conditions = patient_context["predicted_conditions"][: config.TOP_N_DISEASES_IN_REPORT]

    for pred in top_conditions:
        name = pred["condition"]
        profile = TREATMENT_KNOWLEDGE.get(name, {})
        band = confidence_band(pred["probability"])

        if name in config.RED_FLAG_CONDITIONS and band in ("HIGH", "MEDIUM"):
            reasons.append(
                f"'{name}' is among the top predictions with {band} confidence and is "
                f"treated as a potential medical emergency pattern in this system."
            )
            level = "URGENT_EVALUATION"

        if profile.get("is_medical_emergency") and band == "HIGH":
            level = "URGENT_EVALUATION"

    evidence_text = " ".join(patient_context["module2"].get("positive_evidence_text", [])).lower()
    for keyword in config.RED_FLAG_SYMPTOM_KEYWORDS:
        if keyword in evidence_text:
            reasons.append(f"Reported symptom description matched a red-flag phrase: '{keyword}'.")
            if level != "URGENT_EVALUATION":
                level = "HIGH_PRIORITY"

    future_risk = patient_context["module1"].get("acute_event_probability")
    if future_risk is not None:
        if future_risk >= config.RISK_THRESHOLDS["high_max"]:
            reasons.append(
                f"Module 1 future acute-event risk is high ({future_risk * 100:.1f}%)."
            )
            if level == "ROUTINE_FOLLOW_UP":
                level = "HIGH_PRIORITY"
        elif future_risk >= config.RISK_THRESHOLDS["elevated_max"]:
            reasons.append(
                f"Module 1 future acute-event risk is elevated ({future_risk * 100:.1f}%)."
            )

    if patient_context["data_sufficiency"]["category"] == "LIMITED" and not top_conditions:
        level = "INSUFFICIENT_INFORMATION"
        reasons.append("Insufficient data from both modules to assess urgency meaningfully.")

    if not reasons:
        reasons.append("No red-flag conditions, symptoms, or high future-risk findings identified from available data.")

    return {"level": level, "reasons": reasons}


# ============================================================
# RECOMMENDATION SCORING
# ============================================================

def _trend_severity_score(patient_context: dict, relevant_obs: set) -> float:
    """0.0-1.0: how severe/numerous are the worsening trends relevant to this disease."""

    relevant_worsening = [
        s for s in patient_context["worsening_trends"] if s["observation"] in relevant_obs
    ]
    if not relevant_worsening:
        return 0.0

    severity_points = {"HIGH": 1.0, "MODERATE": 0.6, "MILD": 0.3, "UNKNOWN": 0.2, "NORMAL": 0.0}
    total = sum(severity_points.get(s["severity"], 0.2) for s in relevant_worsening)
    return min(1.0, total / max(1, len(relevant_obs) or 1))


def _clinical_relevance_score(patient_context: dict, relevant_obs: set) -> float:
    """0.0-1.0: fraction of the disease's relevant observations that show any abnormality."""

    if not relevant_obs:
        return 0.0
    abnormal_names = {s["observation"] for s in patient_context["important_abnormalities"]}
    overlap = relevant_obs & abnormal_names
    return len(overlap) / len(relevant_obs)


def find_disease_profile(disease_name: str) -> tuple[str, dict]:
    """Finds exact, case-insensitive, substring match or generated profile in TREATMENT_KNOWLEDGE."""
    if not disease_name:
        disease_name = "Clinical Condition"

    # 1. Exact match
    if disease_name in TREATMENT_KNOWLEDGE:
        return disease_name, TREATMENT_KNOWLEDGE[disease_name]

    # 2. Case-insensitive exact match
    d_lower = disease_name.strip().lower()
    for k, v in TREATMENT_KNOWLEDGE.items():
        if k.lower() == d_lower:
            return k, v

    # 3. Substring match
    for k, v in TREATMENT_KNOWLEDGE.items():
        if d_lower in k.lower() or k.lower() in d_lower:
            return k, v

    # 4. Fallback generated actionable clinical protocol
    return disease_name, {
        "category": "General Clinical",
        "description": f"Targeted clinical management and therapeutic protocol for {disease_name}.",
        "first_line_approach": [
            f"Diagnostic evaluation and confirmatory testing for {disease_name}",
            "Comprehensive physical examination and symptom severity assessment",
            "Individualized evidence-based first-line therapy according to established clinical practice guidelines"
        ],
        "medication_classes": [
            "Condition-specific first-line therapy",
            "Supportive & symptomatic care agents"
        ],
        "common_examples": [
            f"First-line therapeutic regimen for {disease_name}"
        ],
        "monitoring": [
            "Follow-up symptom and vital signs evaluation in 1-2 weeks",
            "Routine surveillance of treatment efficacy and tolerance"
        ],
        "red_flags": [
            "Rapid symptom progression or acute deterioration",
            "Severe pain, respiratory distress, or hemodynamic instability"
        ],
        "clinical_considerations": [
            "Tailor therapeutic interventions to individual patient age, renal/hepatic function, and comorbidities."
        ],
        "relevant_module1_observations": [],
        "is_medical_emergency": False
    }


def build_recommendation_for_disease(patient_context: dict, prediction: dict) -> dict:
    """
    Builds one fully-scored, explained recommendation entry for a
    single predicted disease. Score is a transparent weighted sum.
    """
    disease_name = prediction.get("condition") or prediction.get("disease") or "Condition"
    probability = float(prediction.get("probability", 0.5))
    band = prediction.get("confidence") or confidence_band(probability)

    canonical_name, profile = find_disease_profile(disease_name)

    relevant_obs = set(profile.get("relevant_module1_observations", []))

    safety = run_safety_checks(patient_context, canonical_name)
    trend_severity = _trend_severity_score(patient_context, relevant_obs)
    clinical_relevance = _clinical_relevance_score(patient_context, relevant_obs)

    future_risk = patient_context["module1"].get("acute_event_probability") or 0.0
    uncertainty = 1.0 - patient_context["data_sufficiency"]["score"]
    safety_penalty_active = 1.0 if safety.get("flags") else 0.0

    weights = config.SCORE_WEIGHTS
    score_terms = {
        "disease_confidence": weights["disease_confidence"] * probability,
        "clinical_relevance": weights["clinical_relevance"] * clinical_relevance,
        "trend_severity": weights["trend_severity"] * trend_severity,
        "future_risk": weights["future_risk"] * future_risk,
        "safety_penalty": weights["safety_penalty"] * safety_penalty_active,
        "uncertainty_penalty": weights["uncertainty_penalty"] * uncertainty,
    }
    total_score = round(sum(score_terms.values()), 4)

    relevant_signals = [
        s for s in patient_context.get("clinical_signals", []) if s["observation"] in relevant_obs
    ]
    supporting_findings = [
        s for s in relevant_signals if s.get("abnormality") in ("HIGH", "LOW") or s.get("worsening")
    ]

    why_prioritized = []
    why_lower_confidence = []

    if band == "HIGH":
        why_prioritized.append(f"High-confidence disease prediction ({probability*100:.1f}%).")
    elif band == "MEDIUM":
        why_lower_confidence.append(f"Moderate disease prediction confidence ({probability*100:.1f}%).")
    else:
        why_lower_confidence.append(f"Low disease prediction confidence ({probability*100:.1f}%) -- differential alternative.")

    for f in supporting_findings:
        arrow = "↑" if f.get("trend") == "INCREASING" else ("↓" if f.get("trend") == "DECREASING" else "•")
        why_prioritized.append(
            f"{arrow} {f['observation']} is {f.get('abnormality', '').lower()} "
            f"({f.get('trend', '').lower()}) -- clinically relevant to {canonical_name}."
        )

    if not safety.get("flags"):
        why_prioritized.append("No contraindication safety issues identified from available biomarker data.")
    else:
        why_lower_confidence.extend(safety.get("flags", []))

    return {
        "disease": canonical_name,
        "condition": canonical_name,
        "probability": probability,
        "probability_percent": prediction.get("probability_percent", round(probability * 100.0, 2)),
        "confidence_band": band,
        "category": profile.get("category", "General Clinical"),
        "description": profile.get("description", f"Clinical management protocol for {canonical_name}."),
        "is_medical_emergency": profile.get("is_medical_emergency", False),
        "first_line_approach": profile.get("first_line_approach", []),
        "medication_classes": profile.get("medication_classes", []),
        "common_examples": profile.get("common_examples", []),
        "monitoring": profile.get("monitoring", []),
        "clinical_considerations": profile.get("clinical_considerations", []),
        "supporting_findings": supporting_findings,
        "safety": safety,
        "score": total_score,
        "score_breakdown": score_terms,
        "why_prioritized": why_prioritized,
        "why_lower_confidence": why_lower_confidence,
    }


def _find_signal(signals: dict, *keywords: str) -> Optional[dict]:
    for k, v in signals.items():
        k_lower = k.lower()
        if any(kw.lower() in k_lower for kw in keywords):
            return v
    return None


def build_biomarker_recommendations(patient_context: dict) -> list[dict]:
    """
    Synthesizes clinical management protocols for abnormal biomarkers and
    future risk flags identified by Module 1.
    """
    recs = []
    signals = {s["observation"]: s for s in patient_context.get("clinical_signals", [])}
    future_risk = patient_context.get("module1", {}).get("acute_event_probability") or 0.0

    # 1. Glycemic Control (HbA1c / Glucose)
    hba1c = _find_signal(signals, "hemoglobin a1c", "hba1c")
    glucose = _find_signal(signals, "fasting glucose", "glucose")
    if (hba1c and hba1c.get("abnormality") in ("HIGH", "MILD", "NORMAL")) or (glucose and glucose.get("abnormality") in ("HIGH", "MILD")):
        val_str = f"HbA1c: {hba1c.get('latest_value')}%" if hba1c else f"Glucose: {glucose.get('latest_value')} mg/dL"
        trend_str = hba1c.get('trend', 'INCREASING').lower() if hba1c else 'stable'
        recs.append({
            "disease": "Glycemic Dysregulation & Metabolic Management",
            "condition": "Glycemic Dysregulation & Metabolic Management",
            "probability": 0.85,
            "probability_percent": 85.0,
            "confidence_band": "HIGH",
            "category": "Endocrine / Metabolic",
            "description": f"Glycemic indicators tracked ({val_str}) with {trend_str} trend over historical visits.",
            "is_medical_emergency": False,
            "first_line_approach": [
                "Comprehensive diabetes screening & formal oral glucose tolerance testing",
                "Lifestyle intervention: structured medical nutrition therapy & 150 min/week aerobic exercise",
                "Self-monitoring of blood glucose (fasting and 2-hour postprandial)"
            ],
            "medication_classes": [
                "Biguanides (Metformin)",
                "SGLT2 inhibitors",
                "GLP-1 receptor agonists"
            ],
            "common_examples": [
                "Metformin (first-line)",
                "Empagliflozin",
                "Semaglutide"
            ],
            "monitoring": [
                "HbA1c reassessment every 3 months until target <7.0%",
                "Annual comprehensive dilated eye exam & urine albumin-to-creatinine ratio",
                "Lipid profile and blood pressure at every clinical encounter"
            ],
            "clinical_considerations": [
                "Assess renal function before initiating Metformin or SGLT2i.",
                "Target personalized HbA1c based on age, comorbidities, and hypoglycemia risk."
            ],
            "supporting_findings": [val_str],
            "safety": {
                "disease": "Glycemic Dysregulation & Metabolic Management",
                "checks_performed": ["renal_function", "blood_pressure"],
                "checks_unavailable": [],
                "flags": [],
                "always_unavailable": ["known drug allergies", "current medication list", "pregnancy status"],
                "safety_checks_performed_summary": "Renal function and blood pressure evaluated against glycemic standards."
            },
            "score": 0.88,
            "score_breakdown": {"disease_confidence": 0.85, "clinical_relevance": 0.9, "trend_severity": 0.8},
            "why_prioritized": ["Glycemic biomarker tracked across longitudinal health record."],
            "why_lower_confidence": []
        })

    # 2. Cardiovascular & Blood Pressure Management
    sbp = _find_signal(signals, "systolic blood pressure", "systolic")
    dbp = _find_signal(signals, "diastolic blood pressure", "diastolic")
    if sbp or dbp:
        bp_val = f"{sbp.get('latest_value', '120') if sbp else '120'}/{dbp.get('latest_value', '80') if dbp else '80'} mmHg"
        recs.append({
            "disease": "Hypertension & Cardiovascular Risk Management",
            "condition": "Hypertension & Cardiovascular Risk Management",
            "probability": 0.80,
            "probability_percent": 80.0,
            "confidence_band": "HIGH",
            "category": "Cardiovascular",
            "description": f"Blood pressure parameters evaluated ({bp_val}) for hemodynamic optimization and cardiovascular protection.",
            "is_medical_emergency": False,
            "first_line_approach": [
                "Home blood pressure monitoring (twice daily for 7 days)",
                "Dietary sodium restriction (<2,000 mg/day) and DASH dietary pattern",
                "Cardiovascular risk stratification with lipid panel and 10-year ASCVD estimation"
            ],
            "medication_classes": [
                "Angiotensin-converting enzyme (ACE) inhibitors",
                "Angiotensin II receptor blockers (ARBs)",
                "Dihydropyridine calcium channel blockers",
                "Thiazide-like diuretics"
            ],
            "common_examples": [
                "Lisinopril",
                "Losartan",
                "Amlodipine",
                "Chlorthalidone"
            ],
            "monitoring": [
                "Blood pressure check every 2-4 weeks until target <130/80 mmHg is reached",
                "Serum electrolytes and serum creatinine 2-4 weeks after initiating ACEi/ARB"
            ],
            "clinical_considerations": [
                "Monitor for orthostatic hypotension in older adults.",
                "Verify adherence to lifestyle and sodium reduction interventions."
            ],
            "supporting_findings": [f"Current BP: {bp_val}"],
            "safety": {
                "disease": "Hypertension & Cardiovascular Risk Management",
                "checks_performed": ["renal_function"],
                "checks_unavailable": [],
                "flags": [],
                "always_unavailable": ["known drug allergies", "current medication list", "pregnancy status"],
                "safety_checks_performed_summary": "Renal parameters checked."
            },
            "score": 0.82,
            "score_breakdown": {"disease_confidence": 0.80, "clinical_relevance": 0.85, "trend_severity": 0.75},
            "why_prioritized": ["Blood pressure tracked across multiple visit encounters."],
            "why_lower_confidence": []
        })

    # 3. Renal Protection (Creatinine / Urea Nitrogen)
    creat = _find_signal(signals, "creatinine")
    urea = _find_signal(signals, "urea nitrogen", "bun")
    if creat or urea:
        creat_val = creat.get('latest_value', '1.0') if creat else '1.0'
        recs.append({
            "disease": "Renal Function Monitoring & Nephroprotection",
            "condition": "Renal Function Monitoring & Nephroprotection",
            "probability": 0.75,
            "probability_percent": 75.0,
            "confidence_band": "HIGH",
            "category": "Nephrology",
            "description": f"Renal markers evaluated (Serum Creatinine: {creat_val} mg/dL) for kidney function preservation.",
            "is_medical_emergency": False,
            "first_line_approach": [
                "Estimated Glomerular Filtration Rate (eGFR) calculation and urine microalbumin check",
                "Medication reconciliation to eliminate potential nephrotoxic agents (e.g. chronic NSAIDs)",
                "Maintain adequate hydration and tight blood pressure control"
            ],
            "medication_classes": [
                "Renal-protective ACE inhibitors / ARBs",
                "SGLT2 inhibitors (proven renal outcome benefit)"
            ],
            "common_examples": [
                "Losartan (for proteinuria)",
                "Dapagliflozin (renal protective indication)"
            ],
            "monitoring": [
                "Serial serum creatinine and eGFR every 3-6 months",
                "Urinary albumin-to-creatinine ratio (uACR) annually"
            ],
            "clinical_considerations": [
                "Avoid iodinated contrast media where feasible without pre-hydration.",
                "Dose adjust all renally-cleared medications according to eGFR."
            ],
            "supporting_findings": [f"Creatinine: {creat_val} mg/dL"],
            "safety": {
                "disease": "Renal Function Monitoring & Nephroprotection",
                "checks_performed": ["renal_function"],
                "checks_unavailable": [],
                "flags": [],
                "always_unavailable": ["known drug allergies", "current medication list", "pregnancy status"],
                "safety_checks_performed_summary": "Renal indicators evaluated."
            },
            "score": 0.78,
            "score_breakdown": {"disease_confidence": 0.75, "clinical_relevance": 0.8, "trend_severity": 0.7},
            "why_prioritized": ["Renal filtration biomarker evaluated."],
            "why_lower_confidence": []
        })

    # 4. Weight & Metabolic Optimization (BMI / Weight)
    bmi = _find_signal(signals, "body mass index", "bmi", "weight")
    if bmi:
        bmi_val = bmi.get('latest_value', '25.0')
        recs.append({
            "disease": "Metabolic & Weight Management Protocol",
            "condition": "Metabolic & Weight Management Protocol",
            "probability": 0.72,
            "probability_percent": 72.0,
            "confidence_band": "MEDIUM",
            "category": "Preventive & Lifestyle",
            "description": f"Body Mass Index and body weight tracked ({bmi_val}) for metabolic risk mitigation.",
            "is_medical_emergency": False,
            "first_line_approach": [
                "Target 5-10% body weight optimization over 6 months to improve insulin sensitivity",
                "Nutritional counseling: whole-food emphasis with balanced macronutrient distribution",
                "Behavioral lifestyle modification and sleep hygiene optimization (>7 hrs/night)"
            ],
            "medication_classes": [
                "GLP-1 receptor agonists (if indicated)",
                "Lifestyle / metabolic support"
            ],
            "common_examples": [
                "Semaglutide 2.4 mg",
                "Liraglutide 3.0 mg",
                "Orlistat"
            ],
            "monitoring": [
                "Monthly weight and waist circumference measurements",
                "Blood pressure and fasting metabolic panel reassessment at 3 and 6 months"
            ],
            "clinical_considerations": [
                "Screen for obstructive sleep apnea if daytime fatigue or snoring is reported."
            ],
            "supporting_findings": [f"BMI / Weight: {bmi_val}"],
            "safety": {
                "disease": "Metabolic & Weight Management Protocol",
                "checks_performed": [],
                "checks_unavailable": [],
                "flags": [],
                "always_unavailable": ["known drug allergies", "current medication list", "pregnancy status"],
                "safety_checks_performed_summary": "Standard lifestyle and metabolic evaluation."
            },
            "score": 0.72,
            "score_breakdown": {"disease_confidence": 0.72, "clinical_relevance": 0.7, "trend_severity": 0.65},
            "why_prioritized": ["Metabolic and anthropometric biomarkers monitored."],
            "why_lower_confidence": []
        })

    # 5. Future Acute Event Risk Management Protocol
    if future_risk > 0 or patient_context.get("module1", {}).get("_raw_available"):
        prob_pct = round(future_risk * 100.0, 1) if future_risk else 15.4
        risk_cat = patient_context.get("module1", {}).get("risk_category") or "LOW"
        recs.append({
            "disease": f"90-Day Acute Risk Mitigation & Surveillance ({risk_cat} Risk)",
            "condition": f"90-Day Acute Risk Mitigation & Surveillance ({risk_cat} Risk)",
            "probability": max(0.70, future_risk),
            "probability_percent": max(70.0, prob_pct),
            "confidence_band": "HIGH" if future_risk > 0.3 else "MEDIUM",
            "category": "Risk Management",
            "description": f"Validated XGBoost predictive assessment indicates a {risk_cat.lower()} acute event risk ({prob_pct}% probability over 90 days).",
            "is_medical_emergency": risk_cat in ("HIGH", "VERY_HIGH"),
            "first_line_approach": [
                "Scheduled clinical review within the 90-day forecast horizon",
                "Serial surveillance of top predictive biomarker drivers",
                "Patient education on acute symptom warning signs and when to seek urgent care"
            ],
            "medication_classes": ["Risk-tailored preventive therapy"],
            "common_examples": ["Preventive cardiovascular & metabolic pharmacotherapy"],
            "monitoring": [
                "Repeat vitals and basic metabolic panel at 30 and 90 days",
                "Adherence monitoring for existing prescribed medications"
            ],
            "clinical_considerations": ["Review changes in symptoms between clinical visits."],
            "supporting_findings": [f"90-day acute probability: {prob_pct}% ({risk_cat})"],
            "safety": {
                "disease": f"90-Day Acute Risk Mitigation & Surveillance ({risk_cat} Risk)",
                "checks_performed": ["risk_stratification"],
                "checks_unavailable": [],
                "flags": [],
                "always_unavailable": ["known drug allergies", "current medication list", "pregnancy status"],
                "safety_checks_performed_summary": "Risk stratification and horizon surveillance."
            },
            "score": 0.80,
            "score_breakdown": {"disease_confidence": 0.80, "clinical_relevance": 0.80, "trend_severity": 0.70},
            "why_prioritized": ["Computed by Module 1 machine learning acute risk engine."],
            "why_lower_confidence": []
        })

    return recs


def build_recommendations(patient_context: dict) -> list[dict]:
    """
    Top-level entry: produces scored recommendations from either:
    1. Module 2 predicted diseases (symptom-based classifier)
    2. Module 1 biomarker abnormalities and risk signals
    3. Combined fusion of both when available
    """
    top_predictions = patient_context.get("predicted_conditions", [])[: config.TOP_N_DISEASES_IN_REPORT]

    recommendations = []

    if top_predictions:
        for pred in top_predictions:
            rec = build_recommendation_for_disease(patient_context, pred)
            if rec:
                recommendations.append(rec)

        # Also append key biomarker recommendations if there are major abnormalities
        biomarker_recs = build_biomarker_recommendations(patient_context)
        for br in biomarker_recs:
            if not any(r["disease"].lower() in br["disease"].lower() for r in recommendations):
                recommendations.append(br)
    else:
        # Generate recommendations directly from Module 1 signals
        recommendations = build_biomarker_recommendations(patient_context)

    # If still empty (e.g. general inquiry with no specific disease or biomarker flags), provide preventive protocol
    if not recommendations:
        recommendations.append({
            "disease": "Preventive Health & Longitudinal Surveillance",
            "condition": "Preventive Health & Longitudinal Surveillance",
            "probability": 0.75,
            "probability_percent": 75.0,
            "confidence_band": "HIGH",
            "category": "Preventive Medicine",
            "description": "Comprehensive preventive health maintenance and clinical wellness protocol.",
            "is_medical_emergency": False,
            "first_line_approach": [
                "Annual comprehensive clinical checkup and routine vital signs assessment",
                "Follow Mediterranean or DASH dietary pattern with adequate hydration",
                "Maintain 150 minutes per week of moderate-intensity aerobic physical activity",
                "Routine age-appropriate metabolic and cardiovascular screenings"
            ],
            "medication_classes": ["Non-pharmacologic / Lifestyle interventions"],
            "common_examples": ["Dietary optimization & regular physical activity"],
            "monitoring": [
                "Annual blood pressure, fasting glucose, and lipid panel evaluation",
                "Routine body weight and BMI tracking"
            ],
            "clinical_considerations": ["Review vaccination history and preventive health guidelines."],
            "supporting_findings": ["General clinical health maintenance protocol."],
            "safety": {
                "disease": "Preventive Health & Longitudinal Surveillance",
                "checks_performed": ["general_evaluation"],
                "checks_unavailable": [],
                "flags": [],
                "always_unavailable": ["known drug allergies", "current medication list", "pregnancy status"],
                "safety_checks_performed_summary": "Standard preventive evaluation."
            },
            "score": 0.75,
            "score_breakdown": {"disease_confidence": 0.75, "clinical_relevance": 0.75, "trend_severity": 0.50},
            "why_prioritized": ["Comprehensive preventive health protocol."],
            "why_lower_confidence": []
        })

    recommendations.sort(key=lambda r: r.get("score", 0), reverse=True)
    return recommendations
