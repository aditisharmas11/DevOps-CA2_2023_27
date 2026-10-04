"""Fast regression checks for the conversational evidence hand-off.

Run from Module_2:
    python -m unittest inference.test_conversation_regressions

These tests use small injected adapters: they exercise state handling without
loading spaCy, sentence-transformers, or the trained PyTorch checkpoint.
"""

import sys
from pathlib import Path

INFERENCE_DIR = Path(__file__).resolve().parent
BASE_DIR = INFERENCE_DIR.parent

for p in (INFERENCE_DIR, BASE_DIR):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

import unittest

from conversation_engine import MediTwinConversationEngine


class StubMatcher:
    codes = {"fever": "E_91", "cough": "E_201"}

    def match(self, text):
        return {
            "evidence": [
                {"evidence_code": code, "score": 1.0}
                for phrase, code in self.codes.items()
                if phrase in text.lower()
            ],
            "negated": [],
        }


class StubPipeline:
    def predict_from_evidence(self, evidence_atoms=None, evidence_codes=None, **_):
        return {
            "predictions": [{"condition": "test condition"}],
            "atoms": evidence_atoms or evidence_codes,
        }


class ConversationRegressionTests(unittest.TestCase):
    def setUp(self):
        self.engine = MediTwinConversationEngine(
            age=22,
            sex="male",
            matcher=StubMatcher(),
            pipeline=StubPipeline(),
        )

    def test_unseen_lumbar_atom_does_not_generate_a_ranking(self):
        result = self.engine.process("I am having back pain")

        self.assertEqual(result["status"], "insufficient_evidence")
        self.assertNotIn("predictions", result)

    def test_accumulated_evidence_is_sent_directly_to_model(self):
        first = self.engine.process("I have fever")
        self.assertIn("E_91", first["positive_evidence"])

        result = self.engine.process("I also have cough")

        self.assertEqual(result["status"], "prediction_generated")
        self.assertCountEqual(
            result["positive_evidence"],
            ["E_91", "E_201"],
        )

    def test_short_yes_answer_is_bound_to_pending_question(self):
        first = self.engine.process("I have fever")
        pending = first.get("next_evidence_code") or self.engine.state.pending_question_code
        result = self.engine.process("yes")

        if pending:
            self.assertIn(pending, result["positive_evidence"])
        self.assertIsNone(result.get("pending_question_code") or self.engine.state.pending_question_code)



if __name__ == "__main__":
    unittest.main()
