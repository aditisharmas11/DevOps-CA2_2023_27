"""
MediTwin — Module 3 — App entry point

Usage:

    python app.py
        Runs on the bundled sample_inputs/ (demo mode).

    python app.py path/to/module1_output.json path/to/module2_output.json
        Runs on real Module 1 / Module 2 outputs.

    python app.py path/to/module1_output.json
        Runs with only Module 1 (clinical history / future risk) input.
        Skips disease-specific treatment guidance, still reports risk.

    python app.py --module2-only path/to/module2_output.json
        Runs with only Module 2 (symptom/disease prediction) input.

Outputs (written to outputs/<patient_id>/):
    report.json          machine-readable full report
    report.txt           human-readable report
    disease_confidence.png
    future_risk.png
    clinical_trends.png
    recommendation_priority.png
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# ── sys.path bootstrap ──────────────────────────────────────────────────────
# Ensure Module_3's own directory is always on sys.path so that bare
# imports (config, module3_engine, …) resolve correctly no matter what
# directory the user runs this script from.
_MODULE3_DIR = Path(__file__).resolve().parent
if str(_MODULE3_DIR) not in sys.path:
    sys.path.insert(0, str(_MODULE3_DIR))
# ────────────────────────────────────────────────────────────────────────────

# ── Windows Unicode fix ──────────────────────────────────────────────────────
# Windows terminals default to cp1252, which can't render Unicode arrows (↑↓)
# and other symbols used in the text report. Reconfigure stdout/stderr to
# UTF-8 with a safe fallback so the app never crashes on a print() call.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
# ────────────────────────────────────────────────────────────────────────────

import config
import module3_engine as engine
import report_generator
import drug_api_client


def _load_json_arg(path: str) -> dict:
    p = Path(path)
    if not p.exists():
        print(f"ERROR: input file not found: {path}", file=sys.stderr)
        sys.exit(1)
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)


def _collect_drug_information(recommendations: list[dict]) -> dict:
    """
    Looks up external drug info (RxNorm + openFDA) for every distinct
    common_example medicine mentioned across the top recommendations.
    Never raises -- failures are recorded, not thrown.
    """

    drug_names = []
    for r in recommendations:
        for example in r.get("common_examples", []):
            if example not in drug_names:
                drug_names.append(example)

    results = {}
    for name in drug_names:
        try:
            results[name] = drug_api_client.get_drug_information(name)
        except Exception as exc:  # noqa: BLE001 -- must never crash the report
            results[name] = {
                "drug_name": name,
                "external_data_available": False,
                "error": str(exc),
            }
    return results


def run(module1_path: str | None, module2_path: str | None) -> dict:

    module1_raw = _load_json_arg(module1_path) if module1_path else None
    module2_raw = _load_json_arg(module2_path) if module2_path else None

    if module1_raw is None and module2_raw is None:
        print("ERROR: at least one of Module 1 or Module 2 output must be provided.", file=sys.stderr)
        sys.exit(1)

    print("=" * 78)
    print(config.APP_NAME)
    print("=" * 78)

    print("\n[1/7] Building patient context from Module 1 / Module 2 outputs...")
    patient_context = engine.build_patient_context(module1_raw, module2_raw)

    print("[2/7] Extracting clinical signals (abnormality / trend / severity)...")
    print(f"      -> {len(patient_context['clinical_signals'])} observation(s) processed, "
          f"{len(patient_context['important_abnormalities'])} abnormal, "
          f"{len(patient_context['worsening_trends'])} worsening.")

    print("[3/7] Assessing data sufficiency...")
    print(f"      -> {patient_context['data_sufficiency']['category']} "
          f"(score={patient_context['data_sufficiency']['score']})")

    print("[4/7] Scoring personalized recommendations (rule-based, transparent)...")
    recommendations = engine.build_recommendations(patient_context)
    print(f"      -> {len(recommendations)} disease(s) evaluated.")

    print("[5/7] Assessing urgency / red flags...")
    urgency = engine.assess_urgency(patient_context)
    print(f"      -> {urgency['level']}")

    print("[6/7] Looking up external drug information (RxNorm + openFDA, cached)...")
    drug_lookups = _collect_drug_information(recommendations)
    found = sum(1 for v in drug_lookups.values() if v.get("external_data_available"))
    print(f"      -> {found}/{len(drug_lookups)} medicine name(s) matched to a live source; "
          f"local knowledge base used for the rest.")

    print("[7/7] Generating report and charts...")
    patient_id = patient_context.get("patient_id") or "UNKNOWN_PATIENT"
    out_dir = config.OUTPUTS_DIR / str(patient_id)
    out_dir.mkdir(parents=True, exist_ok=True)

    json_report = report_generator.build_json_report(
        patient_context, recommendations, urgency, drug_lookups
    )
    text_report = report_generator.build_text_report(
        patient_context, recommendations, urgency, drug_lookups
    )
    chart_paths = report_generator.generate_charts(patient_context, recommendations, out_dir)

    json_path = out_dir / "report.json"
    text_path = out_dir / "report.txt"

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(json_report, f, indent=2, default=str)

    with open(text_path, "w", encoding="utf-8") as f:
        f.write(text_report)

    print(f"\nDone. Report written to:\n  {json_path}\n  {text_path}")
    for name, path in chart_paths.items():
        if path:
            print(f"  {path}")

    print("\n" + "-" * 78)
    print(text_report)

    return json_report


def main():
    parser = argparse.ArgumentParser(description=config.APP_NAME)
    parser.add_argument("module1", nargs="?", help="Path to Module 1 output JSON.")
    parser.add_argument("module2", nargs="?", help="Path to Module 2 output JSON.")
    parser.add_argument(
        "--module2-only", metavar="PATH",
        help="Run using only a Module 2 output file (no Module 1 history).",
    )
    parser.add_argument(
        "--module1-only", metavar="PATH",
        help="Run using only a Module 1 output file (no Module 2 predictions).",
    )
    args = parser.parse_args()

    if args.module2_only:
        run(None, args.module2_only)
        return
    if args.module1_only:
        run(args.module1_only, None)
        return

    if args.module1 and args.module2:
        run(args.module1, args.module2)
        return

    if args.module1 and not args.module2:
        # Single positional arg -- ambiguous, so require explicit flags
        # instead of guessing which module it belongs to.
        print(
            "Only one file path was given. Use --module1-only or --module2-only "
            "to disambiguate, or pass both module1 and module2 paths."
        )
        sys.exit(1)

    # No args -- demo mode on the bundled real sample outputs.
    print("No input files given -- running in demo mode on sample_inputs/\n")
    run(
        str(config.SAMPLE_INPUTS_DIR / "module1_output.json"),
        str(config.SAMPLE_INPUTS_DIR / "module2_output.json"),
    )


if __name__ == "__main__":
    main()
