# Precision Finance — E2E Test & Fix Report

**Date:** July 5, 2026 · **Tested target:** https://precisionfinance-ca.netlify.app/ (frontend) + backend run from this repo's `server/` code with your Plaid sandbox keys.

## How testing was done

The deployed frontend was exercised in Chrome (screens, console, network traces). The backend could not be reached from the deployed site (see Issue #1), so the Express server from this repo was built and run in an isolated Linux sandbox and its full API surface was tested with 30+ HTTP test cases. The sandbox has no route to Plaid's servers, so Plaid link/exchange/sync were verified up to the outbound Plaid call (clean error paths confirmed); the live Plaid sandbox flow still needs one browser run against your deployed backend — see "What's left" below.

---

## Issues found, by severity

### CRITICAL

**1. Deployed app has no backend — nobody can register, log in, or link banks.**
The Netlify build was created without `VITE_API_URL`, so the shipped bundle falls back to `http://localhost:3001`. Every visitor gets *"Cannot connect to backend"* on any action. This is the root cause of your "unable to link new bank accounts."
*Repro:* open the site → enter any credentials → Sign In → red error under the form; DevTools shows `fetch http://localhost:3001/api/auth/login → net::ERR_CONNECTION_REFUSED` (also mixed-content blocked from an https page).
*Fix (code, done):* added a pre-login "API server" button on the sign-in card so the backend URL can be set at runtime, plus `netlify.toml` with instructions.
*Fix (deploy, you):* deploy `server/` (Railway/Render), then set `VITE_API_URL` in Netlify env vars and redeploy. Exact steps at the end.

**2. Account-takeover vector: password-reset link returned to the caller.**
When SMTP isn't configured, `POST /api/auth/forgot-password` returned the `resetUrl` (with token) **in the API response** — anyone could reset any user's password.
*Fix (done):* the URL is only included when `NODE_ENV !== 'production'`; verified by test (prod mode → no `resetUrl`; reset for unknown emails never leaks).

**3. JWT secret silently fell back to `dev-secret-key`.**
`auth.ts` read `JWT_SECRET` at import time — *before* `dotenv.config()` ran in `index.ts` — so with a `.env` file the app signed every token with the known dev key (forgeable sessions).
*Fix (done):* `import 'dotenv/config'` is now the first import, and the secret is read lazily and **throws in production if unset**.

### HIGH

**4. `/api/plaid/liabilities-db` always returned 500.**
The SQL selected `a.institution_name`, a column that doesn't exist on `accounts` (it lives on `plaid_items`). Proven with the schema: `no such column: a.institution_name`.
*Fix (done):* `pi.institution_name`; endpoint now returns 200 (regression-tested).

**5. Re-linking a bank crashed the exchange endpoint.**
`plaid_items` has `UNIQUE(item_id)` but the insert had no conflict handling — relinking the same institution threw a constraint error → "Failed to exchange token."
*Fix (done):* upsert that refreshes `access_token` and reactivates the item.

**6. Unlinked accounts could never come back.**
`accounts.status` was set to `'deleted'` on unlink but the sync upsert never reset it — after re-linking, accounts stayed invisible forever.
*Fix (done):* sync now sets `status='active'` on upsert.

**7. Failed login reloaded the page instead of showing an error.**
The API client treated **every** 401 as "session expired" and did `window.location.reload()` — so typing a wrong password wiped the form with no message.
*Fix (done):* 401s from login/register/forgot/reset now surface the real error; reload only happens for genuine session expiry.

### MEDIUM

**8. No server-side password/email validation.** Register accepted 1-character passwords and non-email strings (client-only `minLength`). *Fixed:* min 6 chars + email format check (tested: both → 400).
**9. CORS denial threw an unhandled error** (500 with stack instead of a clean denial). *Fixed:* `callback(null, false)`. Also added `CORS_ORIGINS` env var for extra origins.
**10. The "set API URL in Settings" escape hatch was unreachable** — Settings only renders after login, but you can't log in without the API URL. *Fixed:* server icon on the auth screen (Issue #1 fix).

### LOW / notes

**11. Accessibility:** form labels weren't associated with inputs (no `htmlFor`/`id`) and error text wasn't announced. *Fixed on the auth screen* (`htmlFor`, `id`, `autocomplete`, `role="alert"`); dashboard modal inputs still could use ids — noted as follow-up.
**12. Analytics date bucketing uses UTC** (`toISOString`) — transactions near midnight local time can land in the wrong day bucket. Not fixed (cosmetic; flag if you care).
**13. `transactionsGet` fetches max 500 transactions with no pagination** — long histories will be truncated. Recommend migrating to Plaid's `/transactions/sync` endpoint.
**14. No rate limiting on auth endpoints** — recommend `express-rate-limit` on `/api/auth/*` before serious production use.
**15. Register/login inputs kept values when switching modes** — password now clears on mode switch.

### Verified working (no issues)

Register/login/me token flows, duplicate-email rejection, wrong-password and unknown-user 401s, SQL-injection probe (parameterized queries hold), full forgot→reset→re-login cycle, reset-token single-use and expiry checks, ownership checks on schedules/accounts (can't touch other users' records), 404s for ghost records, payment-schedule create/update/delete validation, malformed-JSON handling, analytics/transactions/accounts empty states.

---

## UI redesign (glassmorphic dark) — shipped

Per your request, the whole UI was restyled: ambient red/violet gradient mesh background; frosted-glass cards (`backdrop-filter` blur + saturation, gradient borders, inner highlight) for every panel, modal, and stat card; gradient-glow primary buttons; pill chips and glowing gradient progress bars; gradient accent headlines ("Command Center", "Insights", auth headings); hover lift + red glow on interactive cards; glass tooltips on charts and a gradient bar chart; hero stat tiles are now glass cards and the badge is a pill. Files touched: `index.css` (new design system), `AuthScreen`, `Navigation`, `HeroSection`, `DashboardSection`, `AnalyticsSection`, `SavingsOptimization`, `ServiceEcosystem`, `FooterSection`.

## Verification performed

- Server TypeScript compiles cleanly with all fixes (`tsc` exit 0).
- 30+ API tests re-run against the fixed server — all pass (see issue list).
- Production-mode checks: reset-URL gated; JWT enforcement verified.
- Frontend: no leftover old-style classes; edited regions reviewed. **Run `npm run build` once locally (or let Netlify build) before deploying** — the sandbox couldn't run the frontend build because its filesystem mount was read-flaky for the unmodified vendor files.

## What's left (needs you)

1. **Deploy the backend** — Railway/Render: root `server/`, build `npm install && npm run build`, start `npm start`, env vars from `server/.env` **plus `NODE_ENV=production`** and `FRONTEND_URL=https://precisionfinance-ca.netlify.app`.
2. **Netlify:** set `VITE_API_URL=https://<your-backend-url>` in Site settings → Environment variables → redeploy.
3. **Plaid dashboard:** register `https://precisionfinance-ca.netlify.app/` as an OAuth redirect URI.
4. **Send me the backend URL** — I'll point the live site at it, run the real Plaid-sandbox link test (`user_good`/`pass_good`), sync, and verify dashboards end-to-end in your browser.

## Recommendations for reliability

Add a health endpoint (`GET /api/health`) for uptime checks; adopt Plaid `/transactions/sync` with cursors; add `express-rate-limit` + `helmet`; add a CI step running the API test suite (the test cases in this report are easily portable to supertest/vitest); consider Playwright smoke tests for register→login→link→sync as a deploy gate; move the SQLite file to a persistent volume on your host (Railway ephemeral disks wipe on redeploy — consider Postgres or Turso for durability).
