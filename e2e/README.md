# E2E smoke tests

Playwright drives a **login → dashboard → settings → wireframes → new PRD → PRD “Wireframes” deep link** path.

## Prerequisites (local)

1. PostgreSQL reachable with `DATABASE_URL` (see repo `.env.example`).
2. `cd server && npx prisma db push && npm run seed:user` (default user `demo@pm-ai-tool.local` / `demo12345`).
3. Install browsers once: `npx playwright install chromium`

## Suites

| File | Purpose |
|------|---------|
| `smoke.spec.ts` | Auth and navigation through PRD → wireframes deep link. |
| `a11y.spec.ts` | [axe-core](https://github.com/dequelabs/axe-core) scans (serious/critical), including color contrast. |

## Commands

| Command | Purpose |
|--------|---------|
| `npm run test:e2e` | Build web app, start API + `vite preview`, run tests (see root `package.json`). |
| `PLAYWRIGHT_SKIP_WEBSERVER=1 npm run test:e2e` | Run tests only; you must already serve API (`3001`) and web (`5173`) yourself. |
| `npm run test:e2e:ui` | Playwright UI mode. |

Override credentials with `E2E_EMAIL` / `E2E_PASSWORD` if needed.

## CI

GitHub Actions workflow [`.github/workflows/e2e.yml`](../.github/workflows/e2e.yml) runs the same suite against Postgres service.
