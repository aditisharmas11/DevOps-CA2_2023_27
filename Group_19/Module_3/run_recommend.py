"""
Module 3 — Direct CLI runner.
Called by the Node backend via child_process.

Usage:
    python run_recommend.py --m1 <path_to_m1_json> --m2 <path_to_m2_json>
    python run_recommend.py --m1 <path>          (module2 optional)
    python run_recommend.py --m2 <path>          (module1 optional)

Prints a single JSON object to stdout.
"""
from __future__ import annotations

import sys
import json
import argparse
from pathlib import Path

# ── sys.path bootstrap ────────────────────────────────────────────────────────
_DIR = Path(__file__).resolve().parent
if str(_DIR) not in sys.path:
    sys.path.insert(0, str(_DIR))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="MediTwin Module 3 runner")
    parser.add_argument("--m1", type=str, default="", help="Path to Module 1 JSON output")
    parser.add_argument("--m2", type=str, default="", help="Path to Module 2 JSON output")
    args = parser.parse_args()

    m1_data = None
    m2_data = None

    if args.m1 and Path(args.m1).exists():
        with open(args.m1, encoding="utf-8") as f:
            m1_data = json.load(f)

    if args.m2 and Path(args.m2).exists():
        with open(args.m2, encoding="utf-8") as f:
            m2_data = json.load(f)

    if m1_data is None and m2_data is None:
        print(json.dumps({"status": "error", "error": "No valid input files provided"}))
        sys.exit(1)

    try:
        import module3_engine as engine
        import report_generator
        import drug_api_client

        patient_context = engine.build_patient_context(m1_data, m2_data)
        recommendations  = engine.build_recommendations(patient_context)
        urgency          = engine.assess_urgency(patient_context)

        # Drug lookups — best-effort, don't fail if API is down
        drug_lookups = {}
        recs_list = recommendations if isinstance(recommendations, list) else list(recommendations.values()) if isinstance(recommendations, dict) else []
        for rec in recs_list:
            for med in (rec.get("common_examples") or [])[:3]:
                if med not in drug_lookups:
                    try:
                        drug_lookups[med] = drug_api_client.get_drug_information(med)
                    except Exception:
                        drug_lookups[med] = {"drug_name": med, "external_data_available": False}

        json_report = report_generator.build_json_report(
            patient_context, recommendations, urgency, drug_lookups
        )

        result = {
            "status":           "ok",
            "patient_context":  patient_context,
            "recommendations":  recommendations,
            "urgency":          urgency,
            "drug_lookups":     drug_lookups,
            "full_report":      json_report,
        }
        print(json.dumps(result, ensure_ascii=False, default=str))
        sys.exit(0)

    except Exception as exc:
        print(json.dumps({"status": "error", "error": str(exc)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
