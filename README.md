# ForgeFlow

> **IBM Bob 2.0 Hackathon submission** (lablab.ai, 25–27 Sep 2026)
> Challenge area: **testing, debugging, and release & deployment workflows**.
>
> - **Live app:** https://forgeflow-ecru.vercel.app
> - **Video demo:** https://youtu.be/cjVYj87INMo
> - **Slides:** [`presentation/ForgeFlow_IBM_Bob_Hackathon.html`](./presentation/ForgeFlow_IBM_Bob_Hackathon.html) ([PDF](./presentation/ForgeFlow_IBM_Bob_Hackathon.pdf))
> - **Submission text:** [`presentation/IBM_Bob_Hackathon_Submission.md`](./presentation/IBM_Bob_Hackathon_Submission.md)
> - **IBM Bob evidence:** [`bob_sessions/`](./bob_sessions/) (exported task histories and consumption screenshots)

AI-native, human-in-the-loop **PWA** that carries a web-app idea — from screenshots or a
structured spec — through **requirements → design → build → test + self-healing repair →
deploy → live validation**, letting you refine, revisit, or skip **any** stage.

## Working on ForgeFlow with IBM Bob

This repository is set up for [IBM Bob](https://www.ibm.com/products/bob) 2.0:

- [`AGENTS.md`](./AGENTS.md) — project context Bob loads at the start of every task: layout,
  commands, conventions and the no-go areas.
- [`.bob/rules/`](./.bob/rules/) — custom rules for the fixed generated-app stack and for the
  bounded repair loop.
- [`bob_sessions/`](./bob_sessions/) — each team member's exported Bob task histories and
  consumption-summary screenshots.

Open the repository folder in IBM Bob IDE, start in **Ask** mode to explore, **Plan** mode to
design a change, and **Code**/**Agent** mode to implement it.

## Repository layout

```
backend/     FastAPI control plane (Python 3.11, uv)
frontend/    React + Vite + TS + Tailwind PWA (pnpm)
templates/   app-skeleton/ — fixed-stack generated-app template (filled in phase 22)
sandbox/     per-project sandbox image (built in phase 10)
infra/       docker-compose.yml + Caddy reverse proxy
eval/        benchmark specs (phase 43)
presentation/ hackathon slides and submission text
bob_sessions/ IBM Bob task-session exports
```

## Prerequisites

- **Docker** via **Colima** (`colima start`) — for `make dev`.
- **[uv](https://docs.astral.sh/uv/)** (Python 3.11 is fetched/managed by uv).
- **Node 20** + **pnpm 9** (pinned via `corepack`; run `corepack enable` once).

## Quickstart

```bash
cp .env.example .env            # fill in values as needed (safe defaults for local)
make dev                        # boots api + web + mongo + proxy (needs Colima/Docker)
# API:  http://localhost:8000/health
# Web:  http://localhost:5173   (also proxied at http://localhost via Caddy)
```

Running the API and web app **on the host** instead (`uvicorn` + `pnpm dev`)? The per-project
preview URLs (`http://<project>.preview.localhost`) are served by the Caddy proxy, so start it or
they will refuse to connect:

```bash
make proxy                      # just the reverse proxy on :80 (api/web stay on the host)
```

Run the checks locally (no Docker required):

```bash
make test                       # backend pytest + frontend vitest
make lint                       # ruff + black --check + mypy + eslint + prettier --check
make fmt                        # auto-format both apps
```

### Backend only

```bash
cd backend
uv sync                         # create env + install deps (Python 3.11 via uv)
uv run uvicorn app.api.app:app --reload
uv run pytest
```

### Frontend only

```bash
cd frontend
corepack enable                 # once; pins pnpm 9 (Node 20 compatible)
pnpm install
pnpm dev
pnpm test
```

## Configuration

All settings resolve through a **layered config** with precedence
**admin panel (DB) > env > code default**. Phase 01 ships the *env + default* layers and the
resolver seam; the DB/admin layer and dashboard arrive in phases 51–52. Every variable is
documented in [`.env.example`](./.env.example). Never commit `.env`.

## License

[MIT](./LICENSE) © 2026 Sanidhya Awasthi and the ForgeFlow team.
