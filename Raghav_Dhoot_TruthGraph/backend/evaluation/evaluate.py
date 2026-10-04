from __future__ import annotations

import argparse
import asyncio
import json
import time
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
import sys

# Allow this script to be run directly from backend/evaluation/.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.models import InputType
from app.pipeline import VerificationPipeline


HERE = Path(__file__).resolve().parent
DEFAULT_CLAIMS = HERE / "claims.json"
DEFAULT_RESULTS = HERE / "results.json"


def load_cases(path: Path) -> tuple[dict, list[dict]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    return payload, payload["claims"]


async def evaluate(claims_path: Path, results_path: Path, limit: int | None = None) -> dict:
    benchmark, cases = load_cases(claims_path)
    if limit is not None:
        cases = cases[:limit]

    pipeline = VerificationPipeline()
    rows: list[dict] = []
    started = time.perf_counter()

    for index, case in enumerate(cases, start=1):
        claim = case["claim"]
        expected = case["expected_verdict"]
        print(f"[{index}/{len(cases)}] {claim}")

        case_started = time.perf_counter()
        try:
            response = await pipeline.verify(claim, InputType.text)
            actual = response.overall_verdict
            correct = actual == expected
            row = {
                **case,
                "actual_verdict": actual,
                "correct": correct,
                "confidence": response.overall_confidence,
                "claim_support_score": response.credibility_score,
                "sources_analyzed": sum(len(item.evidence_nodes) for item in response.claims),
                "elapsed_seconds": round(time.perf_counter() - case_started, 2),
                "error": None,
            }
            status = "PASS" if correct else "FAIL"
            print(
                f"  {status}: expected={expected}, actual={actual}, "
                f"confidence={response.overall_confidence}%"
            )
        except Exception as exc:
            row = {
                **case,
                "actual_verdict": None,
                "correct": False,
                "confidence": None,
                "claim_support_score": None,
                "sources_analyzed": 0,
                "elapsed_seconds": round(time.perf_counter() - case_started, 2),
                "error": f"{type(exc).__name__}: {exc}",
            }
            print(f"  ERROR: {row['error']}")

        rows.append(row)

    total = len(rows)
    correct = sum(1 for row in rows if row["correct"])
    errors = sum(1 for row in rows if row["error"])
    completed = total - errors

    by_expected: dict[str, dict] = {}
    for label in sorted({row["expected_verdict"] for row in rows}):
        subset = [row for row in rows if row["expected_verdict"] == label]
        label_correct = sum(1 for row in subset if row["correct"])
        by_expected[label] = {
            "total": len(subset),
            "correct": label_correct,
            "accuracy_percent": round((label_correct / len(subset)) * 100, 1) if subset else 0.0,
        }

    confusion: dict[str, Counter] = defaultdict(Counter)
    for row in rows:
        if row["actual_verdict"] is not None:
            confusion[row["expected_verdict"]][row["actual_verdict"]] += 1

    summary = {
        "benchmark_name": benchmark.get("benchmark_name", claims_path.name),
        "benchmark_description": benchmark.get("description"),
        "evaluated_at_utc": datetime.now(timezone.utc).isoformat(),
        "total_cases": total,
        "completed_cases": completed,
        "errors": errors,
        "correct": correct,
        "benchmark_accuracy_percent": round((correct / total) * 100, 1) if total else 0.0,
        "completed_case_accuracy_percent": round((correct / completed) * 100, 1) if completed else 0.0,
        "by_expected_verdict": by_expected,
        "confusion_matrix": {
            expected: dict(counts)
            for expected, counts in confusion.items()
        },
        "elapsed_seconds": round(time.perf_counter() - started, 2),
        "results": rows,
    }

    results_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    return summary


def print_summary(summary: dict) -> None:
    print("\n=== TruthGraph benchmark ===")
    print(f"Cases: {summary['total_cases']}")
    print(f"Correct: {summary['correct']}")
    print(f"Errors: {summary['errors']}")
    print(f"End-to-end benchmark accuracy: {summary['benchmark_accuracy_percent']}%")
    if summary["errors"]:
        print(
            "Accuracy among completed cases: "
            f"{summary['completed_case_accuracy_percent']}%"
        )
    print("\nBy expected verdict:")
    for label, values in summary["by_expected_verdict"].items():
        print(
            f"  {label}: {values['correct']}/{values['total']} "
            f"({values['accuracy_percent']}%)"
        )
    print(f"\nSaved detailed results to: {DEFAULT_RESULTS}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate TruthGraph on a fixed benchmark.")
    parser.add_argument(
        "--claims",
        type=Path,
        default=DEFAULT_CLAIMS,
        help="Path to benchmark claims JSON.",
    )
    parser.add_argument(
        "--results",
        type=Path,
        default=DEFAULT_RESULTS,
        help="Where to save detailed JSON results.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional number of claims to run for a quick test.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    summary = asyncio.run(evaluate(args.claims, args.results, args.limit))
    print_summary(summary)
