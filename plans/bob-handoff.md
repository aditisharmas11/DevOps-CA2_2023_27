# Plan: "Continue in IBM Bob" — Escalation Handoff Export

## Overview

When the repair loop escalates, the user can download the generated app's workspace as a zip that
contains everything IBM Bob needs to continue the repair as a standalone task:

1. `AGENTS.md` — describes the generated app's stack and commands
2. `.bob/rules/forgeflow-stack.md` — the fixed generated-app stack (from templates/app-skeleton)
3. `BOB_HANDOFF.md` — rendered from the escalation data: failing tests with their ac-IDs, the
   criteria text, the files patched in each attempt, and the failing-count trail

## Where escalation data is already stored

The escalation payload is persisted by `RepairLoopController._persist()` as an `Artifact` with
`ArtifactType.repair_attempt` and `meta["kind"] = REPAIR_REPORT_KIND = "repair_report"`.  It is
already read back by `GET /projects/{id}/repair/latest` (in `repair_router.py`), which parses the
JSON blob into `RepairLoopPublic`.

The `RepairLoopPublic.escalation` dict has the full `Escalation.to_dict()` shape:
```python
{
  "reason": str,
  "summary": str,
  "failing_tests": [{"name", "criterion_id", "file", "message"}, ...],
  "diffs_tried":   [{"id", "iteration", "target_files", "diff_ref", "outcome", "reverted"}, ...],
  "metrics": ConvergenceMetrics.to_dict(),
  "resume": RESUME_ACTION,
}
```

The `RepairAttempt` docs linked in `diffs_tried` are already in the DB (inserted by
`RepairAgent.run()` and their `outcome` saved by the loop controller).

## Files to create / change

### Backend

#### `backend/app/testing/handoff.py`  ← NEW
Pure renderer, no I/O.  Given an escalation dict and a project name, renders the three files:

```python
def render_agents_md(project_name: str) -> str: ...
def render_stack_md() -> str: ...
def render_bob_handoff_md(project_name: str, escalation: dict) -> str: ...
```

`render_bob_handoff_md` sections:
- **Why the loop stopped** — `escalation["reason"]` + `escalation["summary"]`
- **Still-failing tests** — table of name / ac-ID / file / message
- **Acceptance criteria** (if ac-IDs present) — pulled from `escalation["failing_tests"]` 
  (the criteria text is NOT in the escalation dict; it lives in `RepairContext.requirement_snippets`
  which is stored in the context blob referenced by `TestRun.repair_context_ref`).
  **Decision**: The handoff renderer receives a supplementary `criteria: list[dict]` argument
  (each `{criterion_id, text, feature}`) sourced from the context blob at the endpoint level.
  This keeps the renderer pure and easily testable.
- **Attempts tried** — one row per `diffs_tried` entry: iteration / outcome / files patched
- **Failing count trail** — `metrics["failing_by_iteration"]` as a simple sequence

#### `backend/app/testing/repair_router.py`  ← ADD endpoint
```
GET /projects/{project_id}/repair/export-bob-handoff
```
- Requires auth (`get_current_user_id`)
- Enforces ownership via `ProjectService().get_owned()`
- Fetches latest repair artifact; if `escalation` is `None` → 404
- Loads `RepairContext` blob from the latest failing `TestRun.repair_context_ref` to get criteria
- Calls the three renderers
- Builds the zip in-memory (`zipfile.ZipFile` over `io.BytesIO`)
- Returns `StreamingResponse(zip_bytes, media_type="application/zip",
  headers={"Content-Disposition": "attachment; filename=bob-handoff-<project_id[-8:]>.zip"})`

No new DB models needed; no new configuration keys needed.

#### `backend/tests/testing/test_handoff_renderer.py`  ← NEW
Unit tests for the pure renderers:
- `test_render_with_no_attempts` — escalation with `diffs_tried=[]`
- `test_render_with_several_attempts` — escalation with 3 attempts, validates each section
- `test_render_criterion_text_included` — criteria passed to renderer appear in BOB_HANDOFF.md
- `test_render_agents_md_contains_stack` — AGENTS.md contains stack heading and pnpm commands
- `test_render_stack_md_matches_template` — `.bob/rules/forgeflow-stack.md` content is present

#### `backend/tests/testing/test_handoff_endpoint.py`  ← NEW
Integration tests for the export endpoint:
- `test_export_requires_auth` — 401 without token
- `test_export_404_for_unknown_project` — 404 for nonexistent project_id
- `test_export_404_when_not_escalated` — 404 when repair has no escalation
- `test_zip_contains_three_files` — zip has AGENTS.md, .bob/rules/forgeflow-stack.md,
  BOB_HANDOFF.md

### Frontend

#### `frontend/src/features/testing/api.ts`  ← ADD function
```typescript
export function downloadBobHandoff(projectId: string): Promise<Blob>
```
Uses `apiFetch` with `responseType` blob (or raw `fetch` + URL.createObjectURL).

Actually, since `apiFetch` only supports JSON, we trigger download via a direct `fetch` call
and `URL.createObjectURL` — the same approach used in the data-browser export.  Or we navigate
`window.location` to the download URL (simpler, no JS blob needed). Use `window.location.assign`.

Actually the cleanest pattern for a binary download (no auth header needed if the endpoint accepts
a query-param token, or we pre-fetch a signed URL) — **keep auth**: issue an authenticated `fetch`,
get `response.blob()`, create an `<a>` element, trigger a click.

Add to `api.ts`:
```typescript
export async function exportBobHandoff(projectId: string): Promise<void> {
  const { token } = useAuthStore.getState();
  const res = await fetch(
    `${apiBaseUrl}/projects/${projectId}/repair/export-bob-handoff`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );
  if (!res.ok) throw new ApiError(res.status, 'Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bob-handoff-${projectId.slice(-8)}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
```

#### `frontend/src/features/testing/Escalation.tsx`  ← ADD button
Add a "Continue in IBM Bob ↗" button inside the `<Escalation>` component, below the diffs-tried
list and above the guidance form.  The button:
- Is rendered only when `escalation` is non-null (already guaranteed by the component's prop)
- Calls `exportBobHandoff(projectId)` on click
- Shows a spinner while the fetch is in flight
- On error shows a toast

```tsx
const exportMutation = useMutation({
  mutationFn: () => exportBobHandoff(projectId),
  onError: () => toast({ title: 'Export failed', variant: 'error' }),
});

<Button
  type="button"
  variant="outline"
  size="sm"
  data-testid="export-bob-handoff"
  disabled={exportMutation.isPending}
  onClick={() => exportMutation.mutate()}
>
  {exportMutation.isPending ? 'Preparing…' : 'Continue in IBM Bob ↗'}
</Button>
```

#### `frontend/src/features/testing/Escalation.test.tsx`  ← ADD tests
Add to the existing describe block:
- `it('hides the export button when not escalated')` — rendered without escalation prop doesn't
  show the button (the component always receives escalation, so test that parent hides it)
- `it('downloads the handoff zip when the button is clicked')` — mock fetch returning a blob,
  assert `URL.createObjectURL` was called
- `it('shows a toast when the export fails')` — mock fetch returning 500

## Data flow end to end

```
User sees escalation panel
  │
  └─ clicks "Continue in IBM Bob ↗"
       │
       └─ exportBobHandoff(projectId)
            │
            └─ GET /projects/{id}/repair/export-bob-handoff  (auth header)
                 │
                 ├─ ProjectService.get_owned()           → verify ownership
                 ├─ ArtifactService.get_latest_of_kind() → repair_report artifact
                 ├─ ArtifactService.get_content()        → JSON → parse RepairLoopPublic
                 ├─ escalation check                     → 404 if not escalated
                 ├─ Load context blob (TestRun.repair_context_ref → BlobStore.get)
                 │     → RepairContext.requirement_snippets for criteria text
                 ├─ render_agents_md(project.name)       → AGENTS.md
                 ├─ render_stack_md()                    → .bob/rules/forgeflow-stack.md
                 ├─ render_bob_handoff_md(
                 │     project.name, escalation, criteria)  → BOB_HANDOFF.md
                 └─ ZipFile (in-memory)
                      ├─ AGENTS.md
                      ├─ .bob/rules/forgeflow-stack.md
                      └─ BOB_HANDOFF.md
                   → StreamingResponse (application/zip)
```

## BOB_HANDOFF.md template

```markdown
# Bob Handoff — {project_name}

Generated by ForgeFlow when the self-healing repair loop escalated.
Drop this zip into an IBM Bob workspace and start a new task.

## Why the loop stopped

**Reason:** {reason_label}

{summary}

## Still-failing tests

| Test | Criterion | File | Failure message |
|------|-----------|------|-----------------|
| {name} | {criterion_id or —} | {file or —} | {message} |

## Acceptance criteria

{for each criterion_id in failing tests, if criteria text is available}
### {feature}: `{criterion_id}`
> {text}

## Attempts already tried

| # | Outcome | Files patched |
|---|---------|---------------|
| {iteration} | {outcome} | {target_files joined} |

## Failing count per attempt

{failing_by_iteration joined with " → "}
```

## AGENTS.md template

```markdown
# AGENTS.md — {project_name}

Exported from ForgeFlow for handoff to IBM Bob.

## Stack

- Frontend: React 18 + Vite + TypeScript (strict) + Tailwind + React Router
- Backend: Node + Express + TypeScript + Mongoose + Zod
- Tests: Vitest + Testing Library (FE unit), Jest + supertest (BE unit), Playwright (E2E)
- Tooling: pnpm workspaces, ESLint, tsc

## Commands

```bash
pnpm install          # install deps
pnpm dev              # run FE + BE in parallel
pnpm test             # unit suites (Vitest + Jest)
pnpm test:e2e         # Playwright E2E (needs PLAYWRIGHT_BASE_URL)
pnpm lint             # ESLint + tsc --noEmit
```

## Feature code

Feature code is under `frontend/src/features/` and `backend/src/features/`.
The scaffold (build config, Tailwind, API client, app factory, health, test DB helper) is fixed.
```

## Constraints and conventions

- Read config only through `get_config()`, never `os.environ` directly.
- No new DB models, no new config keys.
- The endpoint is additive: existing endpoints, behaviour and tests are unchanged.
- The renderer is pure Python (no I/O), so it is fully unit-testable without MongoDB or a sandbox.
- The zip is built in-memory; no temp files on the control-plane host.
- Auth is enforced at the endpoint (same pattern as every other repair endpoint).
- Ownership is enforced: 404 for another user's project.
- No escalation → 404 (the button should only appear when there is an escalation, but the server
  side enforces it independently).
