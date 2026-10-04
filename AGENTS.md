# AGENTS.md — ForgeFlow

Project context for IBM Bob (and any other coding agent) working in this repository.
Read this before planning or editing anything.

## What ForgeFlow is

A human-in-the-loop PWA that carries a web-app idea through six stages:
**requirements → design → build → test + self-healing repair → deploy → live validation**.
Any stage can be entered, skipped or revisited. Built for the IBM Bob 2.0 Hackathon
(testing, debugging and release & deployment workflows).

## Layout

| Path | What lives there |
|------|------------------|
| `backend/app/` | FastAPI control plane (Python 3.11, managed by `uv`) |
| `backend/app/orchestrator/` | Stage conductor and stage handlers (`stages/`) |
| `backend/app/agents/` | Codegen, testgen and the diff-aware repair agent (`repair.py`, `repair_context.py`) |
| `backend/app/testing/` | Test runner, result parsers, live-URL validation |
| `backend/app/sandbox/` | Per-project Docker sandbox manager |
| `backend/app/deploy/` | Infra analyzer and deploy providers (Vercel, Render, MongoDB Atlas) |
| `backend/app/core/` | Layered config (admin DB > env > default), logging, metrics, cost |
| `frontend/src/` | React + Vite + TS + Tailwind PWA (`features/` per stage) |
| `templates/app-skeleton/` | The fixed-stack template every generated app starts from |
| `sandbox/` | Sandbox image (Node 20, pnpm, Playwright Chromium, test mongod) |
| `infra/` | docker-compose, Caddy, k8s, Ansible, monitoring |
| `eval/` | 10-app benchmark specs |
| `presentation/` | Hackathon slides and submission text |
| `bob_sessions/` | Exported IBM Bob task histories and consumption screenshots |

## Commands

```bash
make dev            # api + web + mongo + proxy (Docker)
make test           # backend pytest + frontend vitest
make lint           # ruff + black --check + mypy + eslint + prettier --check + tsc
make fmt            # auto-format both apps
make check-env      # no direct os.environ reads outside the config layer
make skeleton-verify
```

Backend only: `cd backend && uv run pytest`. Frontend only: `cd frontend && pnpm test`.

## Conventions

- Every change ships with tests; run `make lint` and `make test` before proposing a commit.
- Config is read only through `app.core.config` (`get_config()`), never `os.environ`.
- Secrets never go in the repo; `.env` is git-ignored.
- Untrusted generated code runs only inside the per-project sandbox, never on the host.
- Keep changes small and local; do not reformat unrelated files.

## Do not

- Edit `templates/app-skeleton/` with app-specific code (it is the shared base for all apps).
- Let the repair agent write to test files; tests are the read-only oracle.
- Remove or weaken the repair-loop guards (regression, no progress, iteration cap, budget cap).
- Run `make sandbox-reap-all` or anything that deletes workspaces without asking.

See `.bob/rules/` for the detailed stack and repair-loop rules.
