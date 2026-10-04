# Generated-app stack (fixed)

Every app ForgeFlow generates is filled in from `templates/app-skeleton/`. Never rescaffold it.

- Frontend: React 18 + Vite + TypeScript (strict) + Tailwind + React Router.
- Backend: Node + Express + TypeScript + Mongoose + Zod.
- Tests: Vitest + Testing Library (frontend unit), Jest + supertest (backend), Playwright (E2E).
- Tooling: pnpm workspaces, ESLint, `tsc`.
- All frontend HTTP calls go through `frontend/src/lib/api.ts`; it reads `VITE_API_BASE_URL`.
- Feature code goes under `src/features/` in the instantiated copy, never back into the template.
- Deploy target: SPA and API on Vercel, data on MongoDB Atlas.
