from __future__ import annotations

r"""
MEDI TWIN - INTERACTIVE CONVERSATIONAL CONSOLE

Run from Module_2:
    py inference\interactive_console.py

This is only the console shell. It reuses the existing final
conversation_engine.py, evidence_matcher.py and inference_pipeline.py.
"""

import sys
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

INFERENCE_DIR = Path(__file__).resolve().parent
BASE_DIR = INFERENCE_DIR.parent

for path in (INFERENCE_DIR, BASE_DIR):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from conversation_engine import MediTwinConversationEngine


def line(char="-"):
    print(char * 80)


def ask_age():
    while True:
        try:
            age = float(input("Enter patient age: ").strip())
            if 0 <= age <= 130:
                return age
        except ValueError:
            pass
        print("Please enter a valid age between 0 and 130.")


def ask_sex():
    aliases = {
        "m": "male", "male": "male", "man": "male",
        "f": "female", "female": "female", "woman": "female",
        "u": "unknown", "unknown": "unknown", "other": "unknown",
    }

    while True:
        value = input("Enter sex [male/female/unknown]: ").strip().lower()
        if value in aliases:
            return aliases[value]
        print("Please enter male, female, or unknown.")


def print_predictions(predictions):
    if not predictions:
        return

    print()
    print("TOP MODEL PREDICTIONS")
    line()

    for i, item in enumerate(predictions[:5], 1):
        name = item.get("pathology") or item.get("condition") or "Unknown"
        percent = item.get("probability_percent")

        if percent is None:
            percent = float(item.get("probability", 0.0)) * 100

        print(f"{i}. {name}")
        print(f"   Probability: {float(percent):.4f}%")


def show_result(result):
    print()
    line("=")
    print("MEDI TWIN")
    line()

    print(f"STATUS: {result.get('status', 'unknown')}")

    message = result.get("message")
    if message:
        print()
        print(message)

    positive = result.get(
        "positive_evidence",
        result.get("positive", [])
    )
    negated = result.get(
        "negated_evidence",
        result.get("negated", [])
    )

    print()
    print(f"Positive evidence: {positive}")
    print(f"Negated evidence : {negated}")

    predictions = result.get("predictions", [])
    if predictions:
        print_predictions(predictions)

    question = result.get("next_question")
    code = result.get("next_evidence_code")

    if question:
        print()
        line()
        print("NEXT QUESTION")
        line()
        print(question)
        if code:
            print(f"Evidence code: {code}")

    print()


def show_state(engine):
    print()
    line("=")
    print("CURRENT ASSESSMENT STATE")
    line()

    try:
        state = engine._state_payload()
    except Exception:
        state = {}

    if not state:
        print("State information unavailable.")
        return

    print(f"Turn             : {state.get('turn')}")
    print(f"Follow-ups       : {state.get('follow_ups')}")
    print(f"Positive         : {state.get('positive_evidence', [])}")
    print(f"Negated          : {state.get('negated_evidence', [])}")
    print(f"Known            : {state.get('known_evidence', [])}")
    print(f"Asked            : {state.get('asked_evidence', [])}")
    print(f"Pending question : {state.get('pending_question_code')}")
    print()


def help_text():
    print()
    line("=")
    print("COMMANDS")
    line()
    print("/help   - show commands")
    print("/state  - show current conversation state")
    print("/reset  - start a new assessment")
    print("/quit   - exit")
    print()
    print("Examples:")
    print("  I feel short of breath.")
    print("  I have been coughing for three days.")
    print("  I don't have fever.")
    print("  I also have chest pain.")
    print("  no")
    print("  yes")
    print()


def main():
    print("=" * 80)
    print("MEDI TWIN - INTERACTIVE CONVERSATIONAL ASSESSMENT")
    print("=" * 80)
    print()
    print("Enter symptoms naturally. Medi Twin will extract evidence,")
    print("remember previous answers, ask relevant follow-up questions,")
    print("handle yes/no answers, and generate model predictions when")
    print("the conversation engine decides they are appropriate.")
    print()
    print("This is a decision-support prototype, not a diagnosis.")
    print()

    age = ask_age()
    sex = ask_sex()

    print()
    print("=" * 80)
    print("LOADING MEDI TWIN")
    print("=" * 80)

    try:
        engine = MediTwinConversationEngine(age=age, sex=sex)
    except Exception as exc:
        print()
        print("❌ Could not start Medi Twin")
        print(f"{type(exc).__name__}: {exc}")
        return

    print()
    print("=" * 80)
    print("ASSESSMENT READY")
    print("=" * 80)
    print("Type /help for commands or /quit to exit.")
    print()

    while True:
        try:
            text = input("YOU: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nExiting Medi Twin.")
            break

        if not text:
            print("Please enter a symptom or command.")
            continue

        command = text.lower()

        if command in {"/quit", "/exit", "quit", "exit"}:
            print("Exiting Medi Twin.")
            break

        if command in {"/help", "help"}:
            help_text()
            continue

        if command == "/state":
            show_state(engine)
            continue

        if command == "/reset":
            try:
                engine.reset()
                print("\n✓ Assessment reset.\n")
            except Exception as exc:
                print(f"\n❌ Reset failed: {exc}\n")
            continue

        try:
            result = engine.process(text)
            show_result(result)
        except Exception as exc:
            print()
            line("=")
            print("❌ ERROR WHILE PROCESSING INPUT")
            line()
            print(f"{type(exc).__name__}: {exc}")
            print()
            print("Use /state to inspect the current assessment.")
            print()


if __name__ == "__main__":
    main()