"""
Module 2 — Direct CLI runner.
Called by the Node backend via child_process.
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

# Windows UTF-8 safety
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def confidence_label(prob: float) -> str:
    if prob >= 0.60:
        return "HIGH"
    if prob >= 0.25:
        return "MEDIUM"
    return "LOW"


def main():
    parser = argparse.ArgumentParser(description="MediTwin Module 2 runner")
    parser.add_argument("--text",     type=str,   default="",  help="Free-text symptom description")
    parser.add_argument("--symptoms", nargs="*",  default=[],  help="List of symptom strings")
    parser.add_argument("--age",      type=float, default=30,  help="Patient age")
    parser.add_argument("--sex",      type=str,   default="unknown")
    parser.add_argument("--topk",     type=int,   default=5)
    args = parser.parse_args()

    if args.text:
        input_text = args.text.strip()
    elif args.symptoms:
        input_text = ", ".join(args.symptoms)
    else:
        result = {"status": "error", "error": "No symptoms provided", "predictions": []}
        print(json.dumps(result))
        sys.exit(1)

    try:
        from inference.inference_pipeline import MediTwinInferencePipeline
        pipeline = MediTwinInferencePipeline()

        raw = pipeline.predict(
            text=input_text,
            age=float(args.age),
            sex=args.sex,
            top_k=args.topk,
        )

        predictions = []
        for p in raw.get("predictions", []):
            prob = float(p["probability"])
            cond_name = p.get("condition") or p.get("pathology") or "Unknown Condition"
            predictions.append({
                "condition":            cond_name,
                "disease":              cond_name,
                "probability":          prob,
                "probability_percent":  round(prob * 100, 2),
                "confidence":           confidence_label(prob),
            })

        result = {
            "status":         raw.get("status", "ok"),
            "input_text":     input_text,
            "age":            args.age,
            "sex":            args.sex,
            "predictions":    predictions,
            "evidence_atoms": raw.get("evidence_atoms", []),
            "warning":        raw.get("warning"),
        }
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(0)

    except Exception as exc:
        result = {
            "status": "error",
            "error":  str(exc),
            "predictions": [],
        }
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
