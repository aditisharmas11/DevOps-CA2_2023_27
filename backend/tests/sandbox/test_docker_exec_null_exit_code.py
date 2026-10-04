"""Regression test: DockerRuntime._exec() must map a null ExitCode to EXIT_UNKNOWN, not 0.

A container that dies mid-exec returns ExitCode=null from the Docker API.
Mapping that to 0 causes every result.ok check to report success on a dead container.
"""

from __future__ import annotations

from unittest.mock import MagicMock

from app.sandbox.runtime import EXIT_UNKNOWN, DockerRuntime


def _make_runtime(exit_code: int | None, output: tuple[bytes, bytes] | None) -> DockerRuntime:
    """Build a DockerRuntime backed by a fake container that returns the given exec_run output."""
    container = MagicMock()
    container.exec_run.return_value = (exit_code, output)
    return DockerRuntime(container)


class TestDockerExecNullExitCode:
    """DockerRuntime._exec() is the synchronous helper used for git, mkdir, mv, stat, etc."""

    def test_null_exit_code_returns_exit_unknown(self) -> None:
        """A dead container (ExitCode=null) must never look like a successful command."""
        runtime = _make_runtime(None, (b"some output", b""))
        result = runtime._exec(["git", "commit", "-m", "test"])  # type: ignore[attr-defined]
        assert result.exit_code == EXIT_UNKNOWN
        assert result.ok is False, "A null ExitCode must not be treated as success"

    def test_null_exit_code_with_null_output(self) -> None:
        """Both exit_code and output can be None when a container dies mid-exec."""
        runtime = _make_runtime(None, None)
        result = runtime._exec(["stat", "-c", "%s", "some/file"])  # type: ignore[attr-defined]
        assert result.exit_code == EXIT_UNKNOWN
        assert result.ok is False

    def test_zero_exit_code_is_preserved(self) -> None:
        """A real success (ExitCode=0) must still be success."""
        runtime = _make_runtime(0, (b"output", b""))
        result = runtime._exec(["git", "rev-parse", "HEAD"])  # type: ignore[attr-defined]
        assert result.exit_code == 0
        assert result.ok is True

    def test_nonzero_exit_code_is_preserved(self) -> None:
        """A real failure (ExitCode=1) must remain a failure."""
        runtime = _make_runtime(1, (b"", b"error"))
        result = runtime._exec(["git", "diff", "sha1", "sha2"])  # type: ignore[attr-defined]
        assert result.exit_code == 1
        assert result.ok is False

    def test_exit_unknown_is_negative_so_equality_checks_are_safe(self) -> None:
        """EXIT_UNKNOWN must be distinct from 0 and all common non-zero exit codes."""
        assert EXIT_UNKNOWN < 0
        assert EXIT_UNKNOWN != 0
        assert EXIT_UNKNOWN != 1
        assert EXIT_UNKNOWN != 124  # EXIT_TIMEOUT
