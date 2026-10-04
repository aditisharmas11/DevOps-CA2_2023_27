# Bounded, diff-aware repair loop

When working on `backend/app/agents/repair*.py` or `backend/app/orchestrator/stages/repair.py`:

- A repair attempt sees only the failing tests, the sources they exercise, the git diff since the
  last green run and the acceptance-criterion text. Do not widen that context by default.
- Test files are read-only to the repair agent. Writes outside the editable set are rejected and
  recorded, not silently dropped.
- The loop stops at the first of four guards: regression, no progress, iteration cap, budget cap.
  Escalation with a plain-language summary is a normal outcome, not an error.
- A regression means "was passing, is now failing". New tests never count as regressions.
- Acceptance-criterion IDs (`ac-…`) must survive from requirement to generated test, test result,
  repair context and live-validation report.
- Any change here needs matching pytest coverage under `backend/tests/`.
