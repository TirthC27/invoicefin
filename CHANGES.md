# InvoiceFin End-to-End Fix Log

## Summary

- Architecture decision: Option A — Django/SQLite is the single source of truth for invoices, pools, investments, transactions, portfolios, recovery, and notifications. Supabase remains for Auth/JWT/profile identity; Supabase SQL business tables are treated as legacy/deprecated.
- Blockchain network: Polygon Amoy testnet (chain ID 80002, POL, Amoy Polygonscan).

## Phase 0 — Architecture Decision

### Changed
- No code changed in this step.

### Deleted
- Nothing deleted.

### Decisions
- Chose Option A after checking active frontend usage. Active role-based pages are routed through Django API-backed portals, while the only direct Supabase business-table pool read found was in `frontend/src/pages/Dashboard.jsx`, which is not rendered by the current router. `Signup.jsx` still writes `profiles`, which is authentication/profile setup rather than business data.
- Supabase `pools`, `investments`, `transactions`, and `portfolios` tables will be documented as legacy/deprecated instead of deleted.

### Verified
- Checked direct Supabase table usage with ripgrep.
- Checked `frontend/src/App.jsx` routing and confirmed active role layouts are under `pages/exporter`, `pages/investor`, `pages/admin`, and `pages/lawfirm`.
- Checked Django model split between `Pool` and `InvoicePool`.

### Not addressed (out of scope)
- Production security hardening items from the audit remain out of scope for this college project pass.

## Phase 1 — Compile and Lint Fixes

### Changed
- Split React context values/hooks into separate modules for Auth and Wallet so Fast Refresh lint rules pass:
  - `frontend/src/context/authContextValue.js`
  - `frontend/src/context/useAuth.js`
  - `frontend/src/context/walletContextValue.js`
  - `frontend/src/context/useWallet.js`
- Updated app/page imports to use the new `useAuth` and `useWallet` hook modules.
- Moved exporter `StatusBadge` from `exporterUtils.jsx` into `frontend/src/pages/exporter/StatusBadge.jsx`.
- Fixed hook dependency and stale state warnings in exporter, investor, dashboard, and law firm pages.
- Removed or rewired unused variables/props that were causing lint failures.

### Deleted
- Nothing deleted.

### Decisions
- Kept existing behavior and API boundaries intact; changes were limited to lint/build health and small component extraction.

### Verified
- `npm run lint` passes in `frontend`.
- `npm run build` passes in `frontend` when run outside the sandbox; the sandboxed run failed before source compilation with a Windows native dependency `spawn EPERM` error.
- `python manage.py test` passes Django system checks in `backend`, with 0 tests discovered.

### Not addressed (out of scope)
- Frontend bundle size/code-splitting warnings remain informational and were not addressed.
- Backend has no discovered tests; adding test coverage remains future work.
- Production security hardening items from the audit remain out of scope for this college project pass.

## Phase 2 — Remove Dead and Duplicate Code

### Changed
- `frontend/src/App.jsx` — removed the unused legacy `Dashboard` import after confirming `/dashboard` now uses `RoleRedirect` and role-based layouts.

### Deleted
- `frontend/components/exporter_dashboard.jsx` — confirmed unused with ripgrep and not referenced by the router.
- `frontend/components/investor_dashboard.jsx` — confirmed unused with ripgrep and not referenced by the router.
- `frontend/src/pages/Dashboard.jsx` — confirmed legacy direct-Supabase investor dashboard; `/dashboard` routes through `RoleRedirect` instead.
- `frontend/src/pages/ExporterDashboard.jsx` — confirmed duplicate legacy exporter dashboard; active route imports `frontend/src/pages/exporter/ExporterDashboard.jsx`.
- `frontend/src/pages/UploadInvoice.jsx` — confirmed duplicate legacy uploader; active route imports `frontend/src/pages/exporter/UploadInvoice.jsx`.
- `frontend/src/pages/InvoiceDetails.jsx` — confirmed legacy detail page with no router/import references.
- `frontend/src/components/InvoiceVerificationModal.jsx` — confirmed duplicate legacy modal; active exporter flow imports `frontend/src/pages/exporter/InvoiceVerificationModal.jsx`.
- `frontend/src/lib/invoiceService.js` — confirmed only used by deleted legacy pages.
- `frontend/src/lib/ethPrice.js` — confirmed zero live imports.
- `frontend/src/assets/react.svg`, `frontend/src/assets/vite.svg`, `frontend/src/assets/hero.png` — confirmed zero live imports.
- `smart_contracts/` — removed after confirming it was empty.

### Decisions
- Kept all active role-based pages under `frontend/src/pages/exporter`, `frontend/src/pages/investor`, `frontend/src/pages/admin`, and `frontend/src/pages/lawfirm`.
- Did not delete any active exporter modal/page files that are referenced by `ExporterLayout` or exporter routes.

### Verified
- Checked `frontend/src/App.jsx` and nested layouts to confirm the active route graph.
- Ran ripgrep for all deleted file/module names and confirmed no dangling references remained.

### Not addressed (out of scope)
- No production security hardening addressed.

## Phase 3 — Connect Exporter Invoice Pools to Investor/Contract Pools

### Changed
- `backend/core/models.py` — extended `Pool` with invoice/exporter-facing fields (`invoice`, `exporter`, invoice number, buyer info, currency, due date, funding deadline, min/max investment, status, risk score) so the investor-facing pool table can represent exporter-created invoice pools.
- `backend/core/models.py` — added `InvoicePool.investment_pool` as a one-to-one link to the unified investor-facing `Pool` row; `InvoicePool` remains exporter UI metadata, not a separate investable source of truth.
- `backend/core/migrations/0007_invoicepool_investment_pool_pool_buyer_company_and_more.py` — created the schema migration for the unified pool fields and link.
- `backend/core/serializers.py` — exposed invoice-backed pool details on `PoolSerializer`/`PoolDetailSerializer` and exposed linked `investment_pool_id`/`contract_pool_id` on `InvoicePoolSerializer`.
- `backend/core/services/blockchain_service.py` — added `create_pool_on_chain`, which calls the contract owner-only `createPool` function and reads the emitted `PoolCreated` event; Web3 is imported lazily so Django commands still run when the dependency is not installed.
- `backend/core/exporter_views.py` — changed exporter pool creation to create the on-chain pool first, then save the unified `Pool` row and linked `InvoicePool` metadata in a database transaction.
- `backend/core/views.py` — updated investment confirmation/verification paths so funding updates the unified `Pool.remaining_size/status` plus linked `Invoice.funded_amount/status` and `InvoicePool.amount_funded/status`.

### Deleted
- Nothing deleted in this phase.

### Decisions
- Kept `InvoicePool` as exporter-facing metadata for compatibility with the existing exporter UI, but made the canonical investable pool the existing `Pool` table used by investor APIs and contract verification.
- Because `InvoicePool.sol` has an owner-only `createPool`, exporter pool creation now requires backend blockchain configuration (`CONTRACT_ADDRESS` and `CONTRACT_OWNER_PRIVATE_KEY` or `PRIVATE_KEY`). If missing, the endpoint fails clearly instead of creating a fake/non-investable pool.
- Existing legacy Supabase SQL pool tables remain deprecated/documented only per the Phase 0 Option A decision; they were not migrated or deleted.

### Verified
- Confirmed `InvoicePool.sol` requires on-chain pool creation via owner-only `createPool` and investor funding via `invest(poolId)`.
- Ran `python manage.py makemigrations core` and generated migration `0007`.
- Ran `python manage.py check` successfully.
- Ran `python manage.py test`; Django system checks pass and 0 tests are discovered.
- Ran `python manage.py migrate`; migration `core.0007_invoicepool_investment_pool_pool_buyer_company_and_more` applied successfully to local SQLite.

### Not addressed (out of scope)
- Did not redeploy or verify the contract/network in this phase; that remains Phase 4.
- Did not add production security hardening.

## Phase 4 — Fix Blockchain Network Configuration

### Changed
- `frontend/src/lib/networkConfig.js` — changed `POLYGON_AMOY` from Sepolia values to Polygon Amoy values: chain ID `0x13882` / `80002`, native token `POL`, RPC `https://polygon-amoy.drpc.org`, explorer `https://amoy.polygonscan.com/`.
- `backend/core/services/blockchain_service.py` — changed backend RPC lookup from `SEPOLIA_RPC_URL` to `POLYGON_AMOY_RPC_URL`, with Amoy fallback RPC.
- `backend/.env` — changed blockchain RPC and explorer env values from Sepolia to Polygon Amoy/Amoy Polygonscan.
- `backend/core/services/email_service.py` — changed the default transaction explorer URL from Sepolia Etherscan to Amoy Polygonscan.
- `backend/core/management/commands/sync_pools.py` — kept the existing Amoy behavior and aligned its fallback RPC with the chosen Amoy endpoint.
- `blockchain/hardhat.config.js` — replaced the Sepolia network entry with an `amoy` network using `POLYGON_AMOY_RPC_URL`, and changed verification config to `polygonAmoy`.

### Deleted
- Nothing deleted in this phase.

### Decisions
- Chose Polygon Amoy because `InvoicePool.sol` states Polygon Amoy as the intended network and the sync command was already Amoy-oriented.
- Used the current Polygon documentation values for Amoy: chain ID `80002`, gas token `POL`, explorer `https://amoy.polygonscan.com/`, and RPC `https://polygon-amoy.drpc.org`.
- Did not redeploy the contract because the configured `CONTRACT_ADDRESS` returned deployed bytecode on Polygon Amoy.

### Verified
- Ran repo-wide grep for `sepolia`, `Sepolia`, `11155111`, and `SEPOLIA_RPC_URL`; no matches remain.
- Queried Polygon Amoy `eth_getCode` for the configured `CONTRACT_ADDRESS`; deployed bytecode was present.
- Ran `python manage.py check` successfully.
- Ran `npm run lint` successfully.

### Not addressed (out of scope)
- Did not add production blockchain operations hardening, multisig, timelocks, or upgrade mechanisms.

## Phase 5 — Fix Investment Integrity Issues

### Changed
- `backend/core/views.py` — added role enforcement to investor-only investment, portfolio, calculator, recovery, and transaction endpoints; `create_pool` now requires `EXPORTER` or `ADMIN`.
- `backend/core/views.py` — removed the legacy `/investments/initiate/` and `/investments/confirm/` handlers because no live frontend code calls them and they trusted client-declared wallet, amount, pool, tx hash, and block number.
- `backend/core/urls.py` — removed the legacy initiate/confirm investment routes.
- `backend/core/serializers.py` — removed serializers that only supported the deleted legacy investment endpoints.
- `backend/core/views.py` — changed `/investments/verify/` to fail closed when the user's registered wallet cannot be fetched, instead of accepting the transaction without proving ownership.
- `backend/core/views.py` — kept investment verification atomic and added local pool status/capacity guards before recording investment, transaction, pool, invoice, invoice-pool, and portfolio updates.
- `frontend/src/lib/api.js` — added `investorApi.verifyInvestment` for the live investor flow.
- `frontend/src/pages/investor/PoolDetailPage.jsx` — changed the investment UI to wait for backend verification before showing success; backend verification failure is now shown to the user.
- `backend/core/exporter_views.py` — replaced random invoice verification hashes with deterministic SHA-256 hashes derived from validated invoice fields.
- `backend/core/exporter_views.py` — made invoice verification require a future due date, positive amount, buyer name/company, and valid issue/due dates before marking the invoice Verified.
- `backend/core/exporter_views.py` — added strict status transition validation for `Draft -> Verified -> Funding -> Funded -> Active -> Completed`, while allowing same-status idempotent updates.

### Deleted
- `/api/investments/initiate/` route — confirmed unused by live frontend via ripgrep and removed because it accepted client-declared financial data.
- `/api/investments/confirm/` route — confirmed unused by live frontend via ripgrep and removed because confirmation must use independent on-chain verification.

### Decisions
- Kept `/api/investments/verify/` as the single live investment recording path because it independently verifies the chain event and wallet ownership.
- Treated missing Supabase wallet lookup as a hard failure, not a warning, because ownership cannot be proven.
- Did not add production security controls beyond the correctness fixes explicitly required by the prompt.

### Verified
- Ran ripgrep to confirm no live frontend calls to the deleted legacy investment endpoints.
- Ran ripgrep to confirm no remaining initiate/confirm investment handlers, routes, or serializers.
- Ran `python manage.py check` successfully.
- Ran `python manage.py test`; Django system checks pass and 0 tests are discovered.
- Ran `python manage.py makemigrations --check --dry-run`; no model changes detected.
- Ran `npm run lint` successfully.

### Not addressed (out of scope)
- Did not add rate limiting, API versioning, OpenAPI, CI/CD, or production security hardening.

## Phase 6 — Fix Scheduled Jobs

### Changed
- `backend/core/scheduler.py` — added a lightweight in-process scheduler for the four existing management commands, avoiding Celery/queues for this college project demo.
- `backend/core/apps.py` — starts the scheduler from `CoreConfig.ready()` when the backend app process starts.
- `backend/core/scheduler.py` — skips scheduler startup during one-off commands such as `check`, `test`, `migrate`, `makemigrations`, `shell`, `collectstatic`, and `createsuperuser`.
- `backend/core/scheduler.py` — avoids duplicate startup in Django `runserver` autoreload parent processes.

### Deleted
- Nothing deleted in this phase.

### Decisions
- Used an in-process daemon-thread scheduler because the project is a local/single-server college demo and the prompt explicitly says not to over-engineer with a queue.
- Scheduler can be disabled with `INVOICEFIN_BACKGROUND_JOBS=false` if a manual-only backend process is needed.
- Exact schedule:
  - `mature_invoices` every 60 seconds, first run after 10 seconds.
  - `sync_pools` every 5 minutes, first run after 20 seconds.
  - `process_returns` every 15 minutes, first run after 30 seconds.
  - `check_overdue` every 1 hour, first run after 45 seconds.

### Verified
- Ran `python manage.py check` successfully.
- Ran `python manage.py test`; Django system checks pass and 0 tests are discovered.
- Ran `python manage.py makemigrations --check --dry-run`; no model changes detected.
- Ran `python manage.py shell -c "from django.apps import apps; print(apps.get_app_config('core').__class__.__name__)"` and confirmed Django loads `CoreConfig`.

### Not addressed (out of scope)
- Did not add Celery, Redis, OS-level cron deployment automation, Docker, or CI/CD.
- Did not add production-grade distributed scheduler locking; this is intentionally scoped for a single demo backend process.

## Phase 7 — Contract Settlement Pull-Payment Fix

### Changed
- `blockchain/contracts/InvoicePool.sol` — replaced push-style settlement that looped over every investor and transferred inside `settlePool`.
- `blockchain/contracts/InvoicePool.sol` — changed `settlePool` to owner-only settlement marking plus optional settlement funding; it no longer iterates investors or pushes payouts.
- `blockchain/contracts/InvoicePool.sol` — added `claimPayout(poolId)` so each investor withdraws their own principal plus yield after settlement.
- `blockchain/contracts/InvoicePool.sol` — added `getClaimableAmount(poolId, investor)` for checking the pull-payment amount before claiming.
- `blockchain/contracts/InvoicePool.sol` — added `PayoutClaimed` event and changed `PoolSettled` to report settlement funding instead of total pushed distributions.
- `frontend/src/lib/networkConfig.js` — updated the frontend ABI with `claimPayout`, `getClaimableAmount`, payable `settlePool`, and the updated events.
- `frontend/src/lib/contractService.js` — added helper functions for `settlePool`, `claimPayout`, and `getClaimableAmount`.

### Deleted
- No files deleted in this phase.

### Decisions
- Kept the settlement change narrow: owner marks/funds settlement, investors pull their own payouts. This fixes the loop/revert denial-of-service risk without redesigning maturity/oracle/business rules.
- Kept the existing investor list for count/read purposes, but it is no longer used for payout distribution.

### Verified
- Ran ripgrep to confirm the old investor payout loop and `totalDistributed` settlement logic are gone.
- Ran `npm run lint` successfully in `frontend`.
- Ran `python manage.py check` successfully in `backend`.
- Ran `.\node_modules\.bin\hardhat.cmd compile` successfully after repairing/installing blockchain dependencies and allowing Hardhat to create its user cache directory; Solidity compiled successfully.

### Not addressed (out of scope)
- Did not add oracle-based repayment conditions, multisig, timelocks, pause mechanisms, or full production settlement redesign.

## Phase 8 - Notification UI Wiring

### Changed
- `frontend/src/components/NotificationBell.jsx` - added a reusable notification bell/dropdown wired to the existing Django notification endpoints through `notificationsApi`.
- `frontend/src/components/NotificationBell.jsx` - displays unread count, refreshes notifications every 30 seconds, supports single-notification mark-read, mark-all-read, empty/error/loading states, and navigates to notification links when present.
- `frontend/src/pages/investor/InvestorLayout.jsx` - replaced the static bell button with the functional notification bell.
- `frontend/src/pages/exporter/ExporterLayout.jsx` - replaced the static bell button with the functional notification bell.
- `frontend/src/pages/admin/AdminLayout.jsx` - replaced the static bell button with the functional notification bell.
- `frontend/src/pages/lawfirm/LawFirmLayout.jsx` - replaced the static bell button with the functional notification bell.

### Deleted
- Nothing deleted in this phase.

### Decisions
- Reused the existing backend notification list/read/read-all endpoints instead of adding new API surface.
- Kept the component role-neutral and passed each portal accent color from its layout so the UI matches existing portal styling.

### Verified
- Ran ripgrep to confirm the live portal layouts now import and render `NotificationBell` and no static layout bell imports remain.
- Ran `npm run lint` successfully in `frontend`.
- Ran `npm run build` successfully in `frontend` outside the sandbox; the sandboxed run failed before app compilation on the known Windows native Tailwind/Vite `spawn EPERM` issue.
- Ran `python manage.py check` successfully in `backend`.

### Not addressed (out of scope)
- Did not add push/websocket notifications; this phase uses polling against the existing API.
- Did not address the existing frontend chunk-size warning.

## Phase 9 - Missing Route Handling

### Changed
- `frontend/src/pages/NotFound.jsx` - added an application-level 404 page with a dashboard link for unmatched public routes.
- `frontend/src/App.jsx` - imported `NotFound` and added a top-level `path="*"` catch-all route after all known app routes.
- `frontend/src/pages/investor/InvestorLayout.jsx` - added an index redirect so `/investor` goes to `/investor/dashboard`, and a nested wildcard redirect so unknown investor subroutes do not render an empty shell.
- `frontend/src/pages/admin/AdminLayout.jsx` - added an index redirect so `/admin` goes to `/admin/dashboard`, and a nested wildcard redirect so unknown admin subroutes do not render an empty shell.
- `frontend/src/pages/lawfirm/LawFirmLayout.jsx` - added an index redirect so `/lawfirm` goes to `/lawfirm/dashboard`, and a nested wildcard redirect so unknown law-firm subroutes do not render an empty shell.

### Deleted
- Nothing deleted in this phase.

### Decisions
- Kept exporter routing as-is because it already had a nested wildcard redirect to `dashboard`.
- Used dashboard redirects for protected portal subroutes so users stay inside their role-specific shell instead of seeing blank content.

### Verified
- Ran ripgrep to confirm the top-level 404 route and nested index/wildcard redirects are present.
- Ran `npm run lint` successfully in `frontend`.
- Ran `npm run build` successfully in `frontend` outside the sandbox; the sandboxed run failed before app compilation on the known Windows native Tailwind/Vite `spawn EPERM` issue.
- Ran `python manage.py check` successfully in `backend`.

### Not addressed (out of scope)
- Did not add production analytics, error tracking, or route telemetry.

## Phase 10 - Full End-to-End Verification

### Changed
- No code changed in this phase; this was a verification pass over the completed Phase 1-9 work.

### Deleted
- Nothing deleted in this phase.

### Decisions
- Treated the real wallet transaction and role signup/login flow as live external operations. They were not fabricated with mock success data because the project now requires real Supabase auth/JWTs and real Polygon Amoy contract verification.
- Reported the exact live-flow blocker instead of bypassing it: backend pool creation requires `CONTRACT_OWNER_PRIVATE_KEY` or `PRIVATE_KEY`, but the loaded backend environment currently has neither.

### Verified
- Confirmed `frontend/.env` contains Supabase frontend keys and `VITE_CONTRACT_ADDRESS`.
- Confirmed `backend/.env` contains Supabase backend keys, `CONTRACT_ADDRESS`, and `POLYGON_AMOY_RPC_URL`.
- Confirmed frontend and backend contract addresses match.
- Confirmed frontend and backend Supabase URLs match.
- Confirmed the configured Polygon Amoy `CONTRACT_ADDRESS` has deployed bytecode via `eth_getCode` when run with outbound RPC access.
- Ran `python manage.py makemigrations --check --dry-run`; no model changes detected.
- Ran `python manage.py migrate --plan`; no pending migrations.
- Ran `python manage.py check`; no issues reported.
- Ran `python manage.py test`; Django system checks pass, with 0 tests discovered.
- Ran local API smoke via Django test client using `HTTP_HOST=localhost`: `/api/health/` returned 200, `/api/pools/` returned 200, and `/api/notifications/` returned 403 without auth as expected.
- Ran `npm run lint` successfully in `frontend`.
- Ran `npm run build` successfully in `frontend` outside the sandbox; the sandboxed run fails before app compilation on the known Windows native Tailwind/Vite `spawn EPERM` issue.
- Ran `hardhat compile`; no Solidity compile errors and no files needed recompilation.
- Checked local SQLite data counts: 0 users, 0 invoices, 3 pools, 0 invoice pools, 0 investments, 0 portfolios, 0 recovery cases, and 0 notifications. There is no existing completed local demo trail to inspect.

### Live flow result
- Signup/Login/Role redirect: not executed live because this session does not have an interactive authenticated Supabase browser session for creating and logging into all four roles.
- Exporter uploads invoice: not executed live because it requires authenticated Supabase JWT flow.
- Real verification runs: code path exists from Phase 5, but not exercised live without an exporter JWT.
- Pool created on unified model and linked to contract: currently blocked. `create_pool_on_chain` requires `CONTRACT_OWNER_PRIVATE_KEY` or `PRIVATE_KEY`; the loaded backend environment reports `contract_owner_key_present False`.
- Investor sees pool/invests/verification/portfolio updates: not executed live because pool creation is blocked and a funded Polygon Amoy wallet transaction is required.
- Maturity/return/recovery/law-firm propagation: not executed live because the upstream invoice->pool->investment flow was not completed.

### Not addressed (out of scope)
- Did not change production hardening settings such as `DEBUG`, `ALLOWED_HOSTS`, CORS, HSTS, or secure cookies.
- Did not add production monitoring, CI/CD, Docker, or deployment automation.
