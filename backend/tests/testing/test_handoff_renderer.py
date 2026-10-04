"""Tests for the BOB_HANDOFF.md renderer and companion render_agents_md / render_stack_md.

These are pure-unit tests — no I/O, no DB, no sandbox. The renderers produce strings from dicts,
so the tests are fast and exhaustive.
"""

from __future__ import annotations

from app.testing.handoff import render_agents_md, render_bob_handoff_md, render_stack_md

# ------------------------------------------------------------------ render_agents_md


class TestRenderAgentsMd:
    def test_contains_project_name(self) -> None:
        out = render_agents_md("TodoApp")
        assert "TodoApp" in out

    def test_contains_stack_heading(self) -> None:
        out = render_agents_md("x")
        assert "Stack" in out

    def test_contains_required_stack_tech(self) -> None:
        out = render_agents_md("x")
        for tech in ("React 18", "Vite", "TypeScript", "Tailwind", "Mongoose", "Zod", "pnpm"):
            assert tech in out, f"Expected '{tech}' in AGENTS.md"

    def test_contains_pnpm_commands(self) -> None:
        out = render_agents_md("x")
        for cmd in ("pnpm install", "pnpm dev", "pnpm test", "pnpm lint"):
            assert cmd in out, f"Expected '{cmd}' in AGENTS.md"

    def test_fallback_name_when_empty(self) -> None:
        out = render_agents_md("")
        assert "Generated App" in out

    def test_do_not_modify_tests(self) -> None:
        out = render_agents_md("x")
        # The oracle-is-read-only rule must be documented.
        assert "test" in out.lower()


# ------------------------------------------------------------------ render_stack_md


class TestRenderStackMd:
    def test_contains_stack_heading(self) -> None:
        out = render_stack_md()
        assert "Generated-app stack" in out

    def test_contains_all_stack_items(self) -> None:
        out = render_stack_md()
        for item in ("React 18", "Node", "Vitest", "Jest", "Playwright", "pnpm"):
            assert item in out, f"Expected '{item}' in stack.md"

    def test_matches_bob_rules_content(self) -> None:
        """The stack rules must mention the exact template directory name."""
        out = render_stack_md()
        assert "app-skeleton" in out or "templates" in out or "Vercel" in out

    def test_is_non_empty_markdown(self) -> None:
        out = render_stack_md()
        assert len(out) > 200  # sanity: not an empty string


# ------------------------------------------------------------------ render_bob_handoff_md


def _minimal_escalation() -> dict:
    return {
        "reason": "stalled",
        "summary": "I stopped after 2 attempts because the failing tests stopped shrinking.",
        "failing_tests": [],
        "diffs_tried": [],
        "metrics": {
            "initial_failing": 2,
            "final_failing": 2,
            "failing_by_iteration": [],
            "regressions_introduced": 0,
            "iterations": 0,
            "tokens_spent": 0,
            "cost_inr": 0.0,
            "wall_clock_s": 0.0,
        },
        "resume": {"stage": "build", "action": "refine", "hint": "Describe what to change"},
    }


def _full_escalation() -> dict:
    src = "backend/src/features/todos/todos.controller.ts"
    return {
        "reason": "cap_reached",
        "summary": "I stopped after 3 attempt(s) because I hit the iteration cap.",
        "failing_tests": [
            {
                "name": "todos [ac-empty] rejects an empty title",
                "criterion_id": "ac-empty",
                "file": "backend/src/features/todos/todos.test.ts",
                "message": "expected 400, received 201",
            },
            {
                "name": "todos [ac-add] adds a todo",
                "criterion_id": "ac-add",
                "file": "backend/src/features/todos/todos.test.ts",
                "message": "expected 201, received 500",
            },
        ],
        "diffs_tried": [
            {
                "id": "a1",
                "iteration": 1,
                "target_files": [src],
                "outcome": "no_progress",
                "reverted": False,
            },
            {
                "id": "a2",
                "iteration": 2,
                "target_files": [src],
                "outcome": "no_progress",
                "reverted": False,
            },
            {
                "id": "a3",
                "iteration": 3,
                "target_files": [src],
                "outcome": "regressed",
                "reverted": True,
            },
        ],
        "metrics": {
            "initial_failing": 2,
            "final_failing": 2,
            "failing_by_iteration": [2, 2, 3],
            "regressions_introduced": 1,
            "iterations": 3,
            "tokens_spent": 2700,
            "cost_inr": 3.6,
            "wall_clock_s": 90.0,
        },
        "resume": {"stage": "build", "action": "refine", "hint": "Describe what to change"},
    }


class TestRenderBobHandoffMd:
    # -- no-patch escalation (minimal / no attempts) -----------------------------------

    def test_no_attempts_shows_sentinel(self) -> None:
        out = render_bob_handoff_md("MyApp", _minimal_escalation())
        assert "no attempts were made" in out.lower() or "no files" in out.lower()

    def test_no_failing_tests_shows_sentinel(self) -> None:
        out = render_bob_handoff_md("MyApp", _minimal_escalation())
        assert "no failing tests" in out.lower()

    def test_no_trail_shows_sentinel(self) -> None:
        out = render_bob_handoff_md("MyApp", _minimal_escalation())
        assert "no iterations" in out.lower()

    def test_project_name_in_heading(self) -> None:
        out = render_bob_handoff_md("TodoApp", _minimal_escalation())
        assert "TodoApp" in out

    def test_reason_label_used_not_raw_key(self) -> None:
        """The human-readable label must appear, not the machine key 'stalled'."""
        out = render_bob_handoff_md("x", _minimal_escalation())
        assert "Stopped making progress" in out

    def test_summary_present(self) -> None:
        out = render_bob_handoff_md("x", _minimal_escalation())
        assert "stopped shrinking" in out

    # -- several attempts (full escalation) -------------------------------------------

    def test_three_attempts_all_in_output(self) -> None:
        out = render_bob_handoff_md("x", _full_escalation())
        assert "| 1 |" in out
        assert "| 2 |" in out
        assert "| 3 |" in out

    def test_failing_tests_in_table(self) -> None:
        out = render_bob_handoff_md("x", _full_escalation())
        assert "ac-empty" in out
        assert "ac-add" in out
        assert "rejects an empty title" in out

    def test_failing_count_trail(self) -> None:
        out = render_bob_handoff_md("x", _full_escalation())
        assert "2 → 2 → 3" in out

    def test_cap_reached_reason_label(self) -> None:
        out = render_bob_handoff_md("x", _full_escalation())
        assert "Hit the iteration cap" in out

    def test_files_patched_appear(self) -> None:
        out = render_bob_handoff_md("x", _full_escalation())
        assert "todos.controller.ts" in out

    # -- criteria text -----------------------------------------------------------------

    def test_criteria_section_included_when_provided(self) -> None:
        criteria = [
            {"criterion_id": "ac-empty", "text": "Title must not be empty.", "feature": "Todos"},
            {"criterion_id": "ac-add", "text": "Can add a new todo.", "feature": "Todos"},
        ]
        out = render_bob_handoff_md("x", _full_escalation(), criteria=criteria)
        assert "Acceptance criteria" in out
        assert "Title must not be empty." in out
        assert "Can add a new todo." in out

    def test_criteria_section_omitted_when_not_provided(self) -> None:
        out = render_bob_handoff_md("x", _full_escalation())
        assert "Acceptance criteria" not in out

    def test_criteria_only_for_failing_test_ids(self) -> None:
        """Criteria for tests that are NOT in failing_tests must not appear."""
        criteria = [
            {"criterion_id": "ac-empty", "text": "Empty title rule.", "feature": "Todos"},
            {"criterion_id": "ac-unrelated", "text": "Something else.", "feature": "Other"},
        ]
        out = render_bob_handoff_md("x", _full_escalation(), criteria=criteria)
        assert "Empty title rule." in out
        assert "Something else." not in out

    # -- pipe-escape guard -------------------------------------------------------------

    def test_pipe_in_test_name_is_escaped(self) -> None:
        esc = {
            **_minimal_escalation(),
            "failing_tests": [
                {"name": "foo | bar", "criterion_id": None, "file": None, "message": ""}
            ],
        }
        out = render_bob_handoff_md("x", esc)
        # The raw '|' inside a test name should be escaped so the table renders correctly.
        # Each table row has exactly 5 '|' separators; an unescaped pipe breaks the table.
        assert "foo \\| bar" in out

    def test_fallback_for_unknown_reason(self) -> None:
        esc = {**_minimal_escalation(), "reason": "mysterious_future_reason"}
        out = render_bob_handoff_md("x", esc)
        assert "mysterious_future_reason" in out
