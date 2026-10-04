"""BOB_HANDOFF.md renderer and zip-file helpers for the "Continue in IBM Bob" export (phase-xx).

Pure functions — no I/O, no model imports. Everything is string manipulation over the escalation
dict that ``RepairLoopController._escalate()`` already produces, so the endpoint layer is thin and
this module is exhaustively testable without MongoDB or a sandbox.

The generated-app AGENTS.md and the stack rules are rendered from the locked stack spec
(``templates/app-skeleton/README.md``) rather than read from disk, so the content is always
consistent with what the skeleton actually generates, and the unit tests need no file fixtures.
"""

from __future__ import annotations

from typing import Any

# The REASON_* constants from the repair loop controller — mirrored here to keep this module
# import-free from app.orchestrator so the renderer stays pure and independently importable.
_REASON_LABELS: dict[str, str] = {
    "stalled": "Stopped making progress",
    "regressed": "Patches kept breaking working tests",
    "cap_reached": "Hit the iteration cap",
    "budget": "Budget cap reached",
    "blocked": "Nothing safe to patch",
    "no_patch": "Couldn't fix it from the files it was given",
    "cancelled": "Cancelled",
    "environment": "Sandbox environment problem, not a code bug",
}


def render_agents_md(project_name: str) -> str:
    """The AGENTS.md that goes into the handoff zip root.

    Describes the generated app's fixed stack and commands so IBM Bob can drive the workspace
    without any prior context about what ForgeFlow generates.
    """
    name = project_name.strip() or "Generated App"
    return f"""\
# AGENTS.md — {name}

Exported from ForgeFlow for handoff to IBM Bob.
Read this before planning or editing anything in the workspace.

## What this app is

A ForgeFlow-generated web app. The repair loop escalated — see ``BOB_HANDOFF.md`` for the
failing tests, the criteria they cover, and the patches already tried.

## Stack (fixed — do not rescaffold)

- **Frontend:** React 18 + Vite + TypeScript (strict) + Tailwind + React Router
- **Backend:** Node + Express + TypeScript + Mongoose + Zod
- **FE tests:** Vitest + Testing Library (unit), Playwright (E2E)
- **BE tests:** Jest + supertest
- **Tooling:** pnpm workspaces, ESLint, `tsc`

All frontend HTTP calls go through `frontend/src/lib/api.ts`; it reads `VITE_API_BASE_URL`.
Feature code lives under `src/features/` — the scaffold (build config, Tailwind, API client,
app factory, health route, test DB helper) is fixed and must not be regenerated.

## Commands (run from the workspace root)

```bash
pnpm install          # install all workspace deps
pnpm dev              # run FE (Vite) + BE (Express tsx watch) in parallel
pnpm test             # unit suites: Vitest (FE) + Jest (BE)
pnpm test:e2e         # Playwright E2E (needs PLAYWRIGHT_BASE_URL env var)
pnpm lint             # ESLint + tsc --noEmit across both packages
pnpm typecheck        # tsc --noEmit only
```

## Do not

- Edit scaffold files (`frontend/vite.config.ts`, `backend/src/app.ts`, etc.) unless the fix
  genuinely requires it — the scaffold is shared and stable.
- Add feature code to a file that already exists in the skeleton; add new files under `features/`.
- Modify test files — they are the specification. Fix the source, not the oracle.
"""


def render_stack_md() -> str:
    """The `.bob/rules/forgeflow-stack.md` that goes into the handoff zip.

    This is the fixed-stack rule file verbatim. IBM Bob reads `.bob/rules/` for project rules and
    will pick this up automatically when the zip is unpacked into a workspace.
    """
    return """\
# Generated-app stack (fixed)

Every app ForgeFlow generates is filled in from `templates/app-skeleton/`. Never rescaffold it.

- Frontend: React 18 + Vite + TypeScript (strict) + Tailwind + React Router.
- Backend: Node + Express + TypeScript + Mongoose + Zod.
- Tests: Vitest + Testing Library (frontend unit), Jest + supertest (backend), Playwright (E2E).
- Tooling: pnpm workspaces, ESLint, `tsc`.
- All frontend HTTP calls go through `frontend/src/lib/api.ts`; it reads `VITE_API_BASE_URL`.
- Feature code goes under `src/features/` in the instantiated copy, never back into the template.
- Deploy target: SPA and API on Vercel, data on MongoDB Atlas.
"""


def render_bob_handoff_md(
    project_name: str,
    escalation: dict[str, Any],
    *,
    criteria: list[dict[str, Any]] | None = None,
) -> str:
    """Render ``BOB_HANDOFF.md`` from a ``RepairLoopController._escalate()`` payload.

    ``escalation`` is the dict produced by ``Escalation.to_dict()``:
    - reason, summary, failing_tests, diffs_tried, metrics

    ``criteria`` is an optional list of ``{criterion_id, text, feature}`` dicts loaded from the
    ``RepairContext`` blob — the acceptance text the failing tests were written against. When
    absent, the criteria section is omitted rather than showing empty rows.
    """
    name = project_name.strip() or "Generated App"
    reason = escalation.get("reason", "unknown")
    reason_label = _REASON_LABELS.get(reason, reason)
    summary = (escalation.get("summary") or "").strip()
    failing_tests: list[dict[str, Any]] = escalation.get("failing_tests") or []
    diffs_tried: list[dict[str, Any]] = escalation.get("diffs_tried") or []
    metrics: dict[str, Any] = escalation.get("metrics") or {}
    failing_trail: list[int] = metrics.get("failing_by_iteration") or []
    iterations: int = int(metrics.get("iterations") or 0)

    parts: list[str] = []

    parts.append(f"# Bob Handoff — {name}\n")
    parts.append(
        "Generated by ForgeFlow when the self-healing repair loop escalated.\n"
        "Drop this zip into an IBM Bob workspace and open a new task.\n"
    )

    # -- Why the loop stopped -----------------------------------------------------------
    parts.append("## Why the loop stopped\n")
    parts.append(f"**Reason:** {reason_label}  \n")
    parts.append(f"**Iterations attempted:** {iterations}\n")
    if summary:
        parts.append(f"\n{summary}\n")

    # -- Still-failing tests ------------------------------------------------------------
    parts.append("\n## Still-failing tests\n")
    if failing_tests:
        parts.append("| Test | Criterion | File | Failure message |")
        parts.append("|------|-----------|------|-----------------|")
        for t in failing_tests:
            name_cell = _md_cell(t.get("name") or "")
            crit_cell = _md_cell(t.get("criterion_id") or "—")
            file_cell = _md_cell(t.get("file") or "—")
            msg_cell = _md_cell((t.get("message") or "")[:120])
            parts.append(f"| {name_cell} | {crit_cell} | {file_cell} | {msg_cell} |")
    else:
        parts.append("_(no failing tests recorded)_\n")

    # -- Acceptance criteria (when available) -------------------------------------------
    if criteria:
        # Build a lookup by criterion_id so we preserve their order from failing_tests.
        crit_by_id = {c.get("criterion_id", ""): c for c in criteria if c.get("criterion_id")}
        # Emit only criteria that appear in the failing tests.
        seen_ids: list[str] = []
        for t in failing_tests:
            cid = t.get("criterion_id")
            if cid and cid in crit_by_id and cid not in seen_ids:
                seen_ids.append(cid)
        if seen_ids:
            parts.append("\n## Acceptance criteria\n")
            for cid in seen_ids:
                entry = crit_by_id[cid]
                feature = (entry.get("feature") or "").strip()
                text = (entry.get("text") or "").strip()
                heading = f"{feature}: `{cid}`" if feature else f"`{cid}`"
                parts.append(f"\n### {heading}\n")
                parts.append(f"> {text}\n")

    # -- Attempts already tried ---------------------------------------------------------
    parts.append("\n## Attempts already tried\n")
    if diffs_tried:
        parts.append("| # | Outcome | Files patched |")
        parts.append("|---|---------|---------------|")
        for d in diffs_tried:
            iteration = int(d.get("iteration") or 0)
            outcome = _md_cell(d.get("outcome") or "—")
            files = d.get("target_files") or []
            files_cell = _md_cell(", ".join(files) if files else "no files")
            parts.append(f"| {iteration} | {outcome} | {files_cell} |")
    else:
        parts.append("_(no attempts were made)_\n")

    # -- Failing count trail ------------------------------------------------------------
    parts.append("\n## Failing count per attempt\n")
    if failing_trail:
        trail_str = " → ".join(str(n) for n in failing_trail)
        parts.append(f"`{trail_str}`\n")
    else:
        parts.append("_(no iterations recorded)_\n")

    return "\n".join(parts) + "\n"


# --------------------------------------------------------------------- helpers


def _md_cell(text: str) -> str:
    """Escape pipe characters inside a Markdown table cell."""
    return text.replace("|", "\\|")
