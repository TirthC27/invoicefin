# InvoiceFin Audit Report

Date: 2026-07-28

This report summarizes the post-merge audit of the current repository state. It reflects what was actually traced and executed, not what prior changelog entries claimed.

## Summary Table

| Area | Status | Confidence | Notes |
|---|---|---:|---|
| Build/Compile | CONFIRMED BROKEN | High | Frontend build passed, backend checks and migrations passed, but frontend lint failed with 59 errors. |
| Dead code / duplicates | CONFIRMED BROKEN | High | The repo still contains a large tracked `.history` tree and a live exporter dashboard file with broken duplicate-style logic. |
| Environment config | CONFIRMED BROKEN | High | `DJANGO_SECRET_KEY` is read by backend settings, but the checked-in env files define `SECRET_KEY`. Several env vars read by code are missing from `.env.example` files. |
| Auth / RBAC | CONFIRMED WORKING | Medium | Frontend route guards and backend `require_role` decorators are present for investor, exporter, admin, and law-firm flows. |
| Data model consistency | CONFIRMED WORKING | Medium | The configured database is Postgres via `DATABASE_URL`, and `manage.py migrate` reported no pending migrations. |
| Investment flow | UNVERIFIED | Medium | The code path looks coherent, but a live wallet-backed transaction could not be executed in this environment. |
| Exporter/Admin/Law Firm flows | CONFIRMED BROKEN | High | `frontend/src/pages/exporter/ExporterDashboard.jsx` is mounted by the exporter layout but references undefined state and helper symbols. |
| Routing / UI | UNVERIFIED | Medium | Route graph and 404 exist, but browser-level role/session verification was not run. |
| Deployment sanity | UNVERIFIED | Medium | Docker could not be exercised because the Docker daemon was unavailable locally. |

## Confirmed Broken Items

1. The live exporter dashboard route is broken.
   - File: [frontend/src/pages/exporter/ExporterDashboard.jsx](frontend/src/pages/exporter/ExporterDashboard.jsx)
   - Mounted by: [frontend/src/pages/exporter/ExporterLayout.jsx](frontend/src/pages/exporter/ExporterLayout.jsx)
   - Problem: the component references undefined symbols such as `setSaving`, `setError`, `loadInvoices`, `poolInputs`, and `setPoolInputs`.

2. Frontend lint is hard-failing.
   - Result: 59 errors were reported.
   - Biggest sources: tracked `.history` files, [frontend/src/pages/exporter/ExporterDashboard.jsx](frontend/src/pages/exporter/ExporterDashboard.jsx), and [frontend/vite.config.js](frontend/vite.config.js).

3. Backend secret-key configuration is inconsistent.
   - File: [backend/invoicefin_backend/settings.py](backend/invoicefin_backend/settings.py)
   - Problem: settings read `DJANGO_SECRET_KEY`, while the checked-in env files define `SECRET_KEY`.

4. Environment documentation is incomplete and drifted from code.
   - Files: [frontend/.env.example](frontend/.env.example), [backend/.env.example](backend/.env.example)
   - Problem: multiple variables read by code are not documented there, including `VITE_POLYGON_AMOY_RPC_URL`, `CONTRACT_OWNER_PRIVATE_KEY`, `POLYGON_AMOY_CHAIN_ID`, `INVOICEFIN_BACKGROUND_JOBS`, `CORS_ALLOW_ALL_ORIGINS`, and `DJANGO_LOG_LEVEL`.

5. Checked-in env files contain real credentials and private-key material.
   - Problem: this is a security and deployment hygiene issue regardless of runtime behavior.

## Unverified Items

1. Real investment execution.
   - Needed: a browser session with a connected wallet and a valid test account to attempt the transaction end to end.

2. Docker build.
   - Needed: a running Docker Desktop daemon in the current environment.

3. Browser-level route/UI behavior.
   - Needed: a live browser session with authenticated investor, exporter, admin, and law-firm identities.

4. Deployment parity.
   - Needed: access to the actual deployed environment to compare it against the current repo state.

## Overall Verdict

This is not demo-ready yet. Backend checks are clean and the overall architecture is coherent, but the repo still has a broken live exporter dashboard, repo-wide lint failures, and config drift around secrets and environment variables. Those issues are enough to prevent a confident demo claim.

## Evidence Captured During the Audit

- Frontend build: passed.
- Frontend lint: failed with 59 errors.
- Backend `manage.py check`: passed.
- Backend `manage.py makemigrations --check --dry-run`: passed with no changes.
- Backend `manage.py migrate`: passed with no pending migrations.
- Docker build: could not run because the local Docker daemon was unavailable.
