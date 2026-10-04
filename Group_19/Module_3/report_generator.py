"""
MediTwin — Module 3 — Report Generator

Builds the final JSON report, the human-readable text report, and the
supporting charts (disease confidence, clinical trends, future risk
gauge, recommendation priority) described in the Module 3 spec.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import config
import module3_engine

try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    _MATPLOTLIB_AVAILABLE = True
except ImportError:
    _MATPLOTLIB_AVAILABLE = False


# ============================================================
# JSON REPORT
# ============================================================

def build_json_report(
    patient_context: dict,
    recommendations: list[dict],
    urgency: dict,
    drug_lookups: dict,
) -> dict:

    m1 = patient_context["module1"]
    m2 = patient_context["module2"]
    sufficiency = patient_context["data_sufficiency"]

    return {
        "report_type": config.APP_NAME,
        "report_version": config.REPORT_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "patient_id": patient_context.get("patient_id"),

        "patient_summary": {
            "total_records": m1.get("total_records"),
            "unique_dates": m1.get("unique_dates"),
            "history_days": m1.get("history_days"),
            "age": m2.get("age"),
            "sex": m2.get("sex"),
            "data_confidence": sufficiency["category"],
            "data_confidence_score": sufficiency["score"],
            "data_confidence_reasons": sufficiency["reasons"],
        },

        "disease_predictions": [
            {
                "disease": r["disease"],
                "probability_percent": r["probability_percent"],
                "confidence_band": r["confidence_band"],
            }
            for r in recommendations
        ],

        "future_risk": {
            "probability": m1.get("acute_event_probability"),
            "probability_percent": (
                round(m1["acute_event_probability"] * 100, 2)
                if m1.get("acute_event_probability") is not None
                else None
            ),
            "risk_category": m1.get("risk_category"),
            "prediction_horizon_days": m1.get("prediction_horizon_days"),
            "interpretation": m1.get("interpretation"),
        },

        "important_clinical_findings": [
            {
                "observation": s["observation"],
                "abnormality": s["abnormality"],
                "trend": s["trend"],
                "latest_value": s["latest_value"],
                "unit": s.get("unit"),
            }
            for s in patient_context["important_abnormalities"] + [
                s for s in patient_context["worsening_trends"]
                if s not in patient_context["important_abnormalities"]
            ]
        ],

        "personalized_recommendations": recommendations,

        "urgency": urgency,

        "external_drug_information": drug_lookups,

        "disclaimer": (
            "This report is a clinical decision-support aid generated for an "
            "academic project. It is NOT a diagnosis, NOT a prescription, and "
            "NOT a substitute for evaluation by a licensed clinician. All "
            "medication information refers to general classes/examples, not "
            "individualized prescriptions."
        ),
    }


# ============================================================
# HUMAN-READABLE TEXT REPORT
# ============================================================

def _fmt_pct(value):
    if value is None:
        return "N/A"
    return f"{value:.1f}%"


def build_text_report(
    patient_context: dict,
    recommendations: list[dict],
    urgency: dict,
    drug_lookups: dict,
) -> str:

    m1 = patient_context["module1"]
    m2 = patient_context["module2"]
    sufficiency = patient_context["data_sufficiency"]

    lines = []
    add = lines.append

    add("=" * 78)
    add("MediTwin Personalized Treatment Support Report")
    add("=" * 78)
    add("")

    # 1. Patient Summary
    add("1. PATIENT SUMMARY")
    add("-" * 78)
    add(f"Patient ID          : {patient_context.get('patient_id') or 'N/A'}")
    add(f"Analysis date        : {datetime.now(timezone.utc).isoformat()}")
    add(f"Historical records   : {m1.get('total_records') or 0}")
    add(f"Unique dates         : {m1.get('unique_dates') or 0}")
    add(f"History duration     : {m1.get('history_days') or 0} days")
    add(f"Data confidence      : {sufficiency['category']} (score {sufficiency['score']})")
    if sufficiency["reasons"]:
        add("Notes:")
        for r in sufficiency["reasons"]:
            add(f"  - {r}")
    add("")

    # 2. Disease predictions
    add("2. DISEASE PREDICTIONS FROM MODULE 2")
    add("-" * 78)
    if not recommendations:
        add("No disease predictions were available (no Module 2 input, or Module 2")
        add("did not return a supported prediction).")
    for i, r in enumerate(recommendations, start=1):
        add(f"{i}. {r['disease']} -- {r['confidence_band']} confidence ({_fmt_pct(r['probability_percent'])})")
    add("")

    # 3. Future risk
    add("3. FUTURE RISK FROM MODULE 1")
    add("-" * 78)
    if m1.get("acute_event_probability") is not None:
        add(f"Predicted future risk : {m1.get('risk_category')}")
        add(f"Probability           : {_fmt_pct(m1['acute_event_probability']*100)}")
        add(f"Prediction horizon    : {m1.get('prediction_horizon_days')} days")
        if m1.get("interpretation"):
            add(f"Interpretation        : {m1['interpretation']}")
    else:
        add("No Module 1 future-risk prediction was available.")
    add("")

    # 4. Important clinical findings
    add("4. IMPORTANT CLINICAL FINDINGS")
    add("-" * 78)
    findings = patient_context["important_abnormalities"] + [
        s for s in patient_context["worsening_trends"]
        if s not in patient_context["important_abnormalities"]
    ]
    if not findings:
        add("No abnormal or clinically worsening findings were identified from the")
        add("available Module 1 history.")
    else:
        for s in findings:
            arrow = "↑" if s["trend"] == "INCREASING" else ("↓" if s["trend"] == "DECREASING" else "•")
            val = f"{s['latest_value']} {s.get('unit') or ''}".strip()
            add(f"{arrow} {s['observation']}: {val} -- {s['abnormality']}, trend {s['trend']}")
    add("")

    # 5. Clinical interpretation
    add("5. CLINICAL INTERPRETATION")
    add("-" * 78)
    if recommendations:
        top = recommendations[0]
        add(
            f"The leading symptom-based prediction is '{top['disease']}' "
            f"({top['confidence_band']} confidence, {_fmt_pct(top['probability_percent'])})."
        )
        if top["supporting_findings"]:
            names = ", ".join(f["observation"] for f in top["supporting_findings"])
            add(f"This is supported by patient-specific trend/abnormality findings in: {names}.")
        else:
            add("No directly related Module 1 findings were available to support or refute this further.")
        if m1.get("risk_category"):
            add(f"Separately, Module 1 estimates the patient's future acute-event risk as {m1['risk_category']}.")
    else:
        add("Insufficient information to generate a clinical interpretation.")
    add("")

    # 6. Personalized treatment approaches
    add("6. PERSONALIZED TREATMENT APPROACHES")
    add("-" * 78)
    for r in recommendations:
        add(f"--- {r['disease']} ({r['confidence_band']} confidence) ---")
        if r.get("is_medical_emergency"):
            add("*** POTENTIAL MEDICAL EMERGENCY PATTERN -- SEEK IMMEDIATE CARE ***")
        add(f"Description: {r.get('description', 'N/A')}")

        if r["confidence_band"] == "LOW":
            add("Confidence is LOW -- specific treatment guidance is withheld.")
            add("Recommendation: seek clinical confirmation before considering treatment.")
        else:
            if r["first_line_approach"]:
                add("Primary approach:")
                for item in r["first_line_approach"]:
                    add(f"  - {item}")
            if r["medication_classes"]:
                add("Medication classes commonly considered:")
                for item in r["medication_classes"]:
                    add(f"  - {item}")
            if r["common_examples"]:
                add("Examples of commonly used medicines (class examples, not a prescription):")
                for item in r["common_examples"]:
                    add(f"  - {item}")

        if r["why_prioritized"]:
            add("Why relevant to this patient:")
            for item in r["why_prioritized"]:
                add(f"  ✓ {item}")
        if r["why_lower_confidence"]:
            add("Caveats / why confidence is limited:")
            for item in r["why_lower_confidence"]:
                add(f"  ⚠ {item}")

        add(f"Safety: {r['safety']['safety_checks_performed_summary']}")
        if r["safety"]["flags"]:
            for f in r["safety"]["flags"]:
                add(f"  ⚠ {f}")
        add("")

    # 7. Monitoring
    add("7. MONITORING RECOMMENDATIONS")
    add("-" * 78)
    seen = set()
    for r in recommendations:
        for m in r.get("monitoring", []):
            if m not in seen:
                add(f"- {m}")
                seen.add(m)
    if not seen:
        add("No specific monitoring items available from the current predictions.")
    add("")

    # 8. Lifestyle
    add("8. LIFESTYLE / NON-MEDICATION RECOMMENDATIONS")
    add("-" * 78)
    lifestyle_notes = []
    bmi_signal = next((s for s in patient_context["clinical_signals"] if s["observation"] == "Body Mass Index"), None)
    bp_signal = next((s for s in patient_context["clinical_signals"] if s["observation"] == "Systolic Blood Pressure"), None)
    chol_signal = next((s for s in patient_context["clinical_signals"] if s["observation"] == "Total Cholesterol"), None)
    if bmi_signal and bmi_signal["abnormality"] == "HIGH":
        lifestyle_notes.append("Weight management and dietary review, given elevated BMI.")
    if bp_signal and bp_signal["abnormality"] in ("HIGH",):
        lifestyle_notes.append("Sodium intake review and physical activity, given elevated blood pressure.")
    if chol_signal and chol_signal["abnormality"] == "HIGH":
        lifestyle_notes.append("Dietary fat/cholesterol review, given elevated total cholesterol.")
    if not lifestyle_notes:
        lifestyle_notes.append("No specific lifestyle flags identified from the available data; general healthy-lifestyle guidance still applies.")
    for n in lifestyle_notes:
        add(f"- {n}")
    add("- Follow-up per the monitoring items above and clinician guidance.")
    add("")

    # 9. Safety flags summary
    add("9. SAFETY FLAGS (SUMMARY)")
    add("-" * 78)
    any_flags = any(r["safety"]["flags"] for r in recommendations)
    if not any_flags:
        add("✓ No major issue identified from available data.")
    else:
        for r in recommendations:
            for f in r["safety"]["flags"]:
                add(f"⚠ [{r['disease']}] {f}")
    if sufficiency["category"] == "LIMITED":
        add("⚠ Insufficient data for a complete safety assessment.")
    add("")

    # 10. Urgency
    add("10. URGENCY")
    add("-" * 78)
    add(urgency["level"])
    for reason in urgency["reasons"]:
        add(f"  - {reason}")
    add("")

    # 11. Why these recommendations were generated
    add("11. WHY THESE RECOMMENDATIONS WERE GENERATED")
    add("-" * 78)
    add(f"Disease prediction confidence : {recommendations[0]['confidence_band'] if recommendations else 'N/A'}")
    add(f"Data sufficiency               : {sufficiency['category']}")
    external_available = any(
        v.get("external_data_available") for v in drug_lookups.values()
    ) if drug_lookups else False
    add(f"External drug-info availability: {'PARTIAL/AVAILABLE' if external_available else 'UNAVAILABLE (local knowledge base used)'}")
    add("")
    if recommendations:
        add("Score breakdown for top recommendation (transparent, additive):")
        for term, value in recommendations[0]["score_breakdown"].items():
            add(f"  {term:22s}: {value:+.4f}")
        add(f"  {'TOTAL':22s}: {recommendations[0]['score']:+.4f}")
    add("")

    add("=" * 78)
    add("DISCLAIMER: This report is a decision-support aid for an academic")
    add("project. It is not a diagnosis, not a prescription, and not a")
    add("substitute for evaluation by a licensed clinician.")
    add("=" * 78)

    return "\n".join(lines)


# ============================================================
# CHARTS
# ============================================================

def generate_charts(patient_context: dict, recommendations: list[dict], output_dir: Path) -> dict:
    """
    Generates the charts described in the Module 3 spec. Returns a
    dict of {chart_name: filepath_or_None}. Silently returns None
    entries if matplotlib is unavailable or a chart has no data --
    never raises.
    """

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    paths = {}

    if not _MATPLOTLIB_AVAILABLE or not config.GENERATE_CHARTS:
        return {"disease_confidence": None, "future_risk": None,
                "clinical_trends": None, "recommendation_priority": None}

    # --- Disease confidence bar chart -----------------------------
    if recommendations:
        fig, ax = plt.subplots(figsize=(7, 4))
        names = [r["disease"] for r in recommendations][::-1]
        probs = [r["probability_percent"] for r in recommendations][::-1]
        colors = ["#d9534f" if r["confidence_band"] == "HIGH" else
                  "#f0ad4e" if r["confidence_band"] == "MEDIUM" else "#5bc0de"
                  for r in recommendations][::-1]
        ax.barh(names, probs, color=colors)
        ax.set_xlabel("Predicted probability (%)")
        ax.set_title("Module 2 Disease Confidence")
        fig.tight_layout()
        path = output_dir / "disease_confidence.png"
        fig.savefig(path, dpi=130)
        plt.close(fig)
        paths["disease_confidence"] = str(path)
    else:
        paths["disease_confidence"] = None

    # --- Future risk gauge (simple horizontal bar) -----------------
    m1 = patient_context["module1"]
    risk_prob = m1.get("acute_event_probability")
    if risk_prob is not None:
        fig, ax = plt.subplots(figsize=(7, 2.2))
        stages = ["Low", "Moderate", "High", "Critical"]
        bounds = [0, config.RISK_THRESHOLDS["low_max"], config.RISK_THRESHOLDS["elevated_max"],
                  config.RISK_THRESHOLDS["high_max"], 1.0]
        stage_colors = ["#5cb85c", "#f0ad4e", "#d9534f", "#8b0000"]
        for i in range(4):
            ax.barh(0, bounds[i+1]-bounds[i], left=bounds[i], color=stage_colors[i], height=0.6)
        ax.axvline(risk_prob, color="black", linewidth=2)
        ax.text(risk_prob, 0.45, f"{risk_prob*100:.1f}%", ha="center", fontweight="bold")
        ax.set_xlim(0, 1)
        ax.set_yticks([])
        ax.set_xlabel("Predicted 90-day acute-event probability")
        ax.set_title("Module 1 Future Risk")
        fig.tight_layout()
        path = output_dir / "future_risk.png"
        fig.savefig(path, dpi=130)
        plt.close(fig)
        paths["future_risk"] = str(path)
    else:
        paths["future_risk"] = None

    # --- Clinical trend charts (one per worsening observation) -----
    # Module 1's observation_progression gives first/mean/latest per
    # observation (not a full per-date time series), so each trend is
    # plotted as first -> mean -> latest -- enough to show direction
    # and magnitude without inventing intermediate data points.
    progression_by_name = {
        e.get("observation"): e for e in patient_context["module1"].get("observation_progression", [])
    }
    worsening_names = [s["observation"] for s in patient_context["worsening_trends"]][:4]

    if worsening_names:
        fig, axes = plt.subplots(len(worsening_names), 1, figsize=(7, 2.4 * len(worsening_names)), squeeze=False)
        for i, name in enumerate(worsening_names):
            entry = progression_by_name.get(name, {})
            ax = axes[i][0]
            first_v = entry.get("first_value")
            mean_v = entry.get("mean")
            latest_v = entry.get("latest_value")
            x_labels, y_vals = [], []
            for label, val in (("first", first_v), ("mean", mean_v), ("latest", latest_v)):
                if val is not None:
                    x_labels.append(label)
                    y_vals.append(val)
            if len(y_vals) >= 2:
                ax.plot(x_labels, y_vals, marker="o", color="#d9534f", linewidth=2)
            spec = module3_engine.CLINICAL_THRESHOLDS.get(name, {})
            unit = spec.get("unit", "")
            ax.set_title(f"{name} -- {entry.get('trend', '')} ({unit})")
            ax.grid(alpha=0.3)
        fig.tight_layout()
        path = output_dir / "clinical_trends.png"
        fig.savefig(path, dpi=130)
        plt.close(fig)
        paths["clinical_trends"] = str(path)
    else:
        paths["clinical_trends"] = None

    # --- Recommendation priority chart ------------------------------
    if recommendations:
        fig, ax = plt.subplots(figsize=(7, 4))
        names = [r["disease"] for r in recommendations][::-1]
        scores = [r["score"] for r in recommendations][::-1]
        ax.barh(names, scores, color="#5b9bd5")
        ax.set_xlabel("Recommendation priority score")
        ax.set_title("Recommendation Priority (transparent scoring)")
        fig.tight_layout()
        path = output_dir / "recommendation_priority.png"
        fig.savefig(path, dpi=130)
        plt.close(fig)
        paths["recommendation_priority"] = str(path)
    else:
        paths["recommendation_priority"] = None

    return paths
