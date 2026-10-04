"""Regression test: repair_context.py persist() must not propagate a DB save failure.

A transient MongoDB error in test_run.save() after the blob was already stored must not
crash the repair loop — "auditability is best-effort; never fail the analysis over a blob".

Before the fix the try/except only wrapped the blob put(), leaving test_run.save() outside
the guard, so a DB hiccup would raise through analyze() and kill the loop controller.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from app.agents.repair_context import RepairContext, RepairContextAnalyzer
from app.db.models import TestRun
from tests.agents.repair_fakes import (
    FakeContextWorkspace,
    configure_blobs,
    failing_result,
    make_project,
    make_test_run,
)

pytestmark = pytest.mark.usefixtures("mongo_db")


class _PatchedTestRun(TestRun):
    """A TestRun that raises on save() to simulate a transient DB error."""

    async def save(self, *args: object, **kwargs: object) -> TestRun:  # type: ignore[override]
        raise RuntimeError("simulated DB failure")


async def _run_persist_with_failing_save(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> RepairContext:
    """Build a minimal analyzer run where test_run.save() raises."""
    configure_blobs(monkeypatch, tmp_path)

    project = await make_project()

    # Build a minimal workspace with one source file the failing test references.
    src = "backend/src/features/todos/todos.controller.ts"
    test_file = "backend/src/features/todos/todos.test.ts"
    workspace = FakeContextWorkspace(
        files={src: "buggy code", test_file: "failing test"},
        current_sha="sha-head",
        last_passing="sha-green",
        diff_text="diff here",
    )

    red = await make_test_run(
        project,
        [failing_result("t [ac-1] fails", criterion_id="ac-1", file=test_file, refs=[src])],
    )

    # Swap out the real test run with one whose save() will raise.
    broken_run = _PatchedTestRun(
        project_id=red.project_id,
        results=red.results,
        failures=red.failures,
    )
    broken_run.id = red.id  # keep the same id so it looks like it is persisted

    analyzer = RepairContextAnalyzer(workspace=workspace)
    # Call persist() directly so we isolate the bug.
    context = RepairContext()
    context.failing_tests = []  # minimal — we only care about persist()
    return await analyzer.persist(broken_run, context, persist=True)


class TestPersistSaveFaultTolerance:
    """persist() must swallow a save() failure and return a valid context with a note."""

    async def test_save_failure_does_not_propagate(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        """A DB failure in test_run.save() must not raise through persist()."""
        context = await _run_persist_with_failing_save(tmp_path, monkeypatch)
        # The context should come back (not raise); the note must explain what happened.
        assert isinstance(context, RepairContext)

    async def test_save_failure_leaves_a_note(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        """The caller can see that persistence failed via context.notes."""
        context = await _run_persist_with_failing_save(tmp_path, monkeypatch)
        assert any(
            "persist" in note.lower() for note in context.notes
        ), f"Expected a persistence-failure note, got: {context.notes}"

    async def test_successful_persist_still_sets_ref(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        """When no error occurs, context.ref must still be set (regression guard)."""
        configure_blobs(monkeypatch, tmp_path)

        project = await make_project()
        src = "backend/src/todos.controller.ts"
        test_file = "backend/src/todos.test.ts"
        workspace = FakeContextWorkspace(
            files={src: "code", test_file: "tests"},
        )
        red = await make_test_run(
            project,
            [failing_result("t", file=test_file, refs=[src])],
        )
        analyzer = RepairContextAnalyzer(workspace=workspace)
        context = await analyzer.analyze(project, red)
        assert context.ref is not None, "context.ref must be set after a successful persist()"
        assert (
            red.repair_context_ref == context.ref
        ), "test_run.repair_context_ref must match context.ref"
