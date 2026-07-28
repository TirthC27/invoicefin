-- ═══════════════════════════════════════════════════════
-- InvoiceFi — Complete Supabase Schema
-- Run this ENTIRE script in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════
-- Last updated: investor portfolio + live returns module
-- Roles: INVESTOR | EXPORTER | LAW_FIRM | ADMIN
-- Fix applied: CREATE POLICY does not support IF NOT EXISTS
--              in Postgres — switched to DROP POLICY IF EXISTS
--              followed by CREATE POLICY for idempotency.
-- ═══════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════
-- SECTION 1 — ORIGINAL TABLES
-- ═══════════════════════════════════════════════════════

-- =========================
-- POOLS (Invoice-backed investment pools)
-- =========================
CREATE TABLE IF NOT EXISTS public.pools (
    id BIGSERIAL PRIMARY KEY,
    exporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    contract_address TEXT,
    invoice_amount NUMERIC(18,2) NOT NULL,
    funded_amount NUMERIC(18,2) DEFAULT 0,
    expected_return NUMERIC(5,2),
    interest_rate NUMERIC(5,2),
    risk_score INT,
    status TEXT DEFAULT 'open' CHECK (status IN ('draft','open','partially_funded','fully_funded','repaid','defaulted')),
    due_date DATE,
    funded_at TIMESTAMPTZ,
    repaid_at TIMESTAMPTZ,
    ipfs_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- =========================
-- INVESTMENTS (extended with portfolio fields)
-- =========================
CREATE TABLE IF NOT EXISTS public.investments (
    id BIGSERIAL PRIMARY KEY,
    investor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    pool_id BIGINT REFERENCES public.pools(id) ON DELETE CASCADE,
    amount NUMERIC(18,8) NOT NULL,
    expected_return NUMERIC(18,8),
    actual_return NUMERIC(18,8),
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending','confirmed','active','completed','overdue','defaulted','failed')),
    tx_hash TEXT,
    block_number BIGINT,
    invested_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    -- Investor portfolio fields (computed server-side)
    expected_profit NUMERIC(20,8) DEFAULT 0,
    roi NUMERIC(6,2) DEFAULT 0,
    transaction_fee NUMERIC(20,8) DEFAULT 0,
    returns_due_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_investments_investor ON public.investments(investor_id);
CREATE INDEX IF NOT EXISTS idx_investments_status ON public.investments(status);
CREATE INDEX IF NOT EXISTS idx_investments_returns_due ON public.investments(returns_due_at);

-- =========================
-- TRANSACTIONS (Unified Ledger)
-- =========================
CREATE TABLE IF NOT EXISTS public.transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    pool_id BIGINT REFERENCES public.pools(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('invest','claim','repay','withdraw')),
    amount NUMERIC(18,8),
    tx_hash TEXT,
    block_number BIGINT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','failed')),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================
-- PORTFOLIOS (Cached aggregate — extended)
-- =========================
CREATE TABLE IF NOT EXISTS public.portfolios (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    total_invested NUMERIC(20,8) DEFAULT 0,
    total_returns NUMERIC(20,8) DEFAULT 0,
    active_investments_count INT DEFAULT 0,
    -- Extended portfolio fields
    current_value NUMERIC(20,8) DEFAULT 0,
    total_profit NUMERIC(20,8) DEFAULT 0,
    completed_count INT DEFAULT 0,
    pending_returns NUMERIC(20,8) DEFAULT 0,
    updated_at TIMESTAMPTZ
);


-- ═══════════════════════════════════════════════════════
-- SECTION 2 — MULTI-ROLE & RECOVERY MODULE
-- ═══════════════════════════════════════════════════════
-- NOTE: These tables mirror the Django local DB models.
--       They are kept in Supabase for reference / reporting.
--       Role enforcement is done server-side in Django,
--       not purely via Supabase RLS.
-- ═══════════════════════════════════════════════════════

-- =========================
-- APP_USERS
-- Local mirror of auth.users with role + status.
-- Populated by Django backend on first authenticated request
-- or when Admin creates a new law firm partner.
-- =========================
CREATE TABLE IF NOT EXISTS public.app_users (
    id BIGSERIAL PRIMARY KEY,
    supabase_uid UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'INVESTOR'
        CHECK (role IN ('INVESTOR','EXPORTER','LAW_FIRM','ADMIN')),
    status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE','SUSPENDED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_users_supabase_uid ON public.app_users(supabase_uid);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON public.app_users(role);

-- =========================
-- LAW_FIRMS
-- One-to-one extension of app_users for LAW_FIRM role.
-- =========================
CREATE TABLE IF NOT EXISTS public.law_firms (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    firm_name TEXT NOT NULL,
    country TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    business_email TEXT NOT NULL,
    website TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE','SUSPENDED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_law_firms_status ON public.law_firms(status);

-- =========================
-- RECOVERY_CASES
-- A recovery case links a pool (invoice) to a law firm.
-- Now also links to the specific defaulted investment.
-- Tracks the current stage of the recovery operation.
-- =========================
CREATE TABLE IF NOT EXISTS public.recovery_cases (
    id BIGSERIAL PRIMARY KEY,
    pool_id BIGINT NOT NULL REFERENCES public.pools(id) ON DELETE CASCADE,
    investment_id BIGINT REFERENCES public.investments(id) ON DELETE SET NULL,
    law_firm_id BIGINT REFERENCES public.law_firms(id) ON DELETE SET NULL,
    exporter_id BIGINT NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    investor_id BIGINT NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    outstanding_amount NUMERIC(20,8) NOT NULL,
    recovery_stage TEXT NOT NULL DEFAULT 'DEFAULT'
        CHECK (recovery_stage IN (
            'DEFAULT','LEGAL_NOTICE_SENT','NEGOTIATION',
            'SETTLEMENT','RECOVERED','CLOSED'
        )),
    priority TEXT NOT NULL DEFAULT 'MEDIUM'
        CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    assigned_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recovery_cases_law_firm ON public.recovery_cases(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_recovery_cases_stage ON public.recovery_cases(recovery_stage);
CREATE INDEX IF NOT EXISTS idx_recovery_cases_pool ON public.recovery_cases(pool_id);
CREATE INDEX IF NOT EXISTS idx_recovery_cases_investment ON public.recovery_cases(investment_id);
CREATE INDEX IF NOT EXISTS idx_recovery_cases_investor ON public.recovery_cases(investor_id);

-- Auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recovery_cases_updated_at ON public.recovery_cases;
CREATE TRIGGER trg_recovery_cases_updated_at
    BEFORE UPDATE ON public.recovery_cases
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- RECOVERY_EVENTS
-- Timeline entries on a recovery case.
-- Created by law firm users; automatically advances case stage.
-- =========================
CREATE TABLE IF NOT EXISTS public.recovery_events (
    id BIGSERIAL PRIMARY KEY,
    recovery_case_id BIGINT NOT NULL REFERENCES public.recovery_cases(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL
        CHECK (event_type IN (
            'LEGAL_NOTICE_SENT','NEGOTIATION_STARTED','SETTLEMENT_RECORDED',
            'PARTIAL_RECOVERY','FULL_RECOVERY','CASE_CLOSED',
            'DOCUMENT_UPLOADED','NOTE_ADDED'
        )),
    notes TEXT DEFAULT '',
    document_url TEXT,
    created_by BIGINT REFERENCES public.app_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recovery_events_case ON public.recovery_events(recovery_case_id);
CREATE INDEX IF NOT EXISTS idx_recovery_events_type ON public.recovery_events(event_type);

-- =========================
-- NOTIFICATIONS
-- In-app notifications for all roles.
-- Created server-side by Django when recovery events occur.
-- =========================
CREATE TABLE IF NOT EXISTS public.notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    link TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read);


-- ═══════════════════════════════════════════════════════
-- SECTION 3 — ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════
-- Uses DROP POLICY IF EXISTS + CREATE POLICY for idempotency.

-- ─── Original tables ─────────────────────────────────

-- Pools: anyone can read (public listing)
ALTER TABLE public.pools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read pools" ON public.pools;
CREATE POLICY "Anyone can read pools"
    ON public.pools FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert pools" ON public.pools;
CREATE POLICY "Authenticated users can insert pools"
    ON public.pools FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update pools" ON public.pools;
CREATE POLICY "Authenticated users can update pools"
    ON public.pools FOR UPDATE USING (auth.role() = 'authenticated');

-- Investments: users see their own
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own investments" ON public.investments;
CREATE POLICY "Users read own investments"
    ON public.investments FOR SELECT USING (auth.uid() = investor_id);

DROP POLICY IF EXISTS "Users insert own investments" ON public.investments;
CREATE POLICY "Users insert own investments"
    ON public.investments FOR INSERT WITH CHECK (auth.uid() = investor_id);

DROP POLICY IF EXISTS "Users update own investments" ON public.investments;
CREATE POLICY "Users update own investments"
    ON public.investments FOR UPDATE USING (auth.uid() = investor_id);

-- Transactions: users see their own
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own transactions" ON public.transactions;
CREATE POLICY "Users read own transactions"
    ON public.transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own transactions" ON public.transactions;
CREATE POLICY "Users insert own transactions"
    ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own transactions" ON public.transactions;
CREATE POLICY "Users update own transactions"
    ON public.transactions FOR UPDATE USING (auth.uid() = user_id);

-- Portfolios: users see their own
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own portfolio" ON public.portfolios;
CREATE POLICY "Users read own portfolio"
    ON public.portfolios FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own portfolio" ON public.portfolios;
CREATE POLICY "Users insert own portfolio"
    ON public.portfolios FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own portfolio" ON public.portfolios;
CREATE POLICY "Users update own portfolio"
    ON public.portfolios FOR UPDATE USING (auth.uid() = user_id);


-- ─── New tables RLS ───────────────────────────────────

-- app_users: users read their own row; service role manages all
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own app_user row" ON public.app_users;
CREATE POLICY "Users read own app_user row"
    ON public.app_users FOR SELECT
    USING (auth.uid() = supabase_uid);
-- Admin/service role writes are handled by the Django backend
-- using SUPABASE_SERVICE_ROLE_KEY (bypasses RLS)

-- law_firms: law firm users read their own record;
--            admins & service role read all (via backend)
ALTER TABLE public.law_firms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Law firm users read own record" ON public.law_firms;
CREATE POLICY "Law firm users read own record"
    ON public.law_firms FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM public.app_users
            WHERE supabase_uid = auth.uid()
        )
    );

-- recovery_cases: law firm users see only their assigned cases;
--                 investors see their own cases;
--                 admins see all (backend-enforced via service role)
ALTER TABLE public.recovery_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Law firm users read own cases" ON public.recovery_cases;
CREATE POLICY "Law firm users read own cases"
    ON public.recovery_cases FOR SELECT
    USING (
        law_firm_id IN (
            SELECT lf.id FROM public.law_firms lf
            JOIN public.app_users au ON au.id = lf.user_id
            WHERE au.supabase_uid = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Investors read own recovery cases" ON public.recovery_cases;
CREATE POLICY "Investors read own recovery cases"
    ON public.recovery_cases FOR SELECT
    USING (
        investor_id IN (
            SELECT id FROM public.app_users
            WHERE supabase_uid = auth.uid()
        )
    );

-- recovery_events: law firm users see events for their cases;
--                  investors see events for their cases
ALTER TABLE public.recovery_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Law firm users read events for their cases" ON public.recovery_events;
CREATE POLICY "Law firm users read events for their cases"
    ON public.recovery_events FOR SELECT
    USING (
        recovery_case_id IN (
            SELECT rc.id FROM public.recovery_cases rc
            JOIN public.law_firms lf ON lf.id = rc.law_firm_id
            JOIN public.app_users au ON au.id = lf.user_id
            WHERE au.supabase_uid = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Investors read events for their cases" ON public.recovery_events;
CREATE POLICY "Investors read events for their cases"
    ON public.recovery_events FOR SELECT
    USING (
        recovery_case_id IN (
            SELECT rc.id FROM public.recovery_cases rc
            WHERE rc.investor_id IN (
                SELECT id FROM public.app_users
                WHERE supabase_uid = auth.uid()
            )
        )
    );

-- notifications: users see only their own
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications"
    ON public.notifications FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM public.app_users
            WHERE supabase_uid = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
    ON public.notifications FOR UPDATE
    USING (
        user_id IN (
            SELECT id FROM public.app_users
            WHERE supabase_uid = auth.uid()
        )
    );


-- ═══════════════════════════════════════════════════════
-- SECTION 4 — SEED DATA
-- ═══════════════════════════════════════════════════════

-- Demo invoice pools (original seed, kept as-is)
INSERT INTO public.pools (invoice_amount, funded_amount, interest_rate, risk_score, status, due_date, expected_return) VALUES
  (5.00, 0, 14.20, 85, 'open', '2026-07-12', 14.20),
  (3.00, 0, 12.80, 62, 'open', '2026-06-15', 12.80),
  (2.00, 0, 13.50, 45, 'open', '2026-05-30', 13.50)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════
-- SECTION 5 — MIGRATION NOTES
-- ═══════════════════════════════════════════════════════
-- If you already have the original 4 tables and are adding
-- only the new columns, run these ALTER TABLE statements:
--
-- ALTER TABLE public.investments
--   ADD COLUMN IF NOT EXISTS expected_profit NUMERIC(20,8) DEFAULT 0,
--   ADD COLUMN IF NOT EXISTS roi NUMERIC(6,2) DEFAULT 0,
--   ADD COLUMN IF NOT EXISTS transaction_fee NUMERIC(20,8) DEFAULT 0,
--   ADD COLUMN IF NOT EXISTS returns_due_at TIMESTAMPTZ,
--   ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
--   ADD COLUMN IF NOT EXISTS block_number BIGINT;
--
-- -- Expand status check constraint:
-- ALTER TABLE public.investments
--   DROP CONSTRAINT IF EXISTS investments_status_check,
--   ADD CONSTRAINT investments_status_check
--     CHECK (status IN ('pending','confirmed','active','completed','overdue','defaulted','failed'));
--
-- ALTER TABLE public.portfolios
--   ADD COLUMN IF NOT EXISTS current_value NUMERIC(20,8) DEFAULT 0,
--   ADD COLUMN IF NOT EXISTS total_profit NUMERIC(20,8) DEFAULT 0,
--   ADD COLUMN IF NOT EXISTS completed_count INT DEFAULT 0,
--   ADD COLUMN IF NOT EXISTS pending_returns NUMERIC(20,8) DEFAULT 0;
--
-- ALTER TABLE public.recovery_cases
--   ADD COLUMN IF NOT EXISTS investment_id BIGINT REFERENCES public.investments(id) ON DELETE SET NULL;
--
-- The Django backend (SQLite) holds the authoritative local copy
-- of all models. These Supabase tables are for:
--   (a) Supabase Dashboard visibility / reporting
--   (b) Direct Supabase client queries if needed in the future
--   (c) Documentation of the full data model
--
-- All write operations go through Django API
-- with SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
-- ═══════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════
-- SECTION 6 — SCHEMA COMPLETION (drift reconciliation)
-- ═══════════════════════════════════════════════════════
-- Added: 2026-07-24
-- Source: Step-1 inventory comparing all Django models,
--         migrations, serializers, views, and frontend
--         Supabase client calls against this file.
--
-- Tables added in this pass:
--   • profiles        — read/written directly by Supabase
--                       client (Signup.jsx) and by Django
--                       backend REST calls (views.py)
--   • invoices        — Django migration 0006, never mirrored
--   • invoice_pools   — Django migration 0006, never mirrored
--   • upload_history  — Django migration 0006, never mirrored
--
-- Conflict C-1 resolved (Option A):
--   profiles.role stores lowercase values ('investor' etc.)
--   matching what Signup.jsx actually writes.
--   app_users.role stays uppercase — they serve different
--   purposes (profiles = frontend cosmetic, app_users =
--   authoritative backend role enforcement).
--
-- All statements are guarded with IF NOT EXISTS /
-- DROP POLICY IF EXISTS for full re-runnability.
-- ═══════════════════════════════════════════════════════


-- =========================
-- PROFILES
-- Direct Supabase-client table. Written by Signup.jsx at
-- user registration; read by Django backend (views.py) to
-- retrieve wallet_address and full_name for on-chain
-- wallet ownership verification and /api/user/me/ response.
--
-- • id matches auth.users.id exactly (UUID PK).
-- • role is lowercase (see Conflict C-1 note above).
-- • wallet_address is the MetaMask address saved by the
--   user after connecting their wallet; read by
--   _get_user_wallet() in views.py before verifying a TX.
-- =========================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT DEFAULT '',
    role TEXT DEFAULT 'INVESTOR'
        CHECK (role IN ('investor', 'exporter', 'law_firm', 'admin', 'INVESTOR', 'EXPORTER', 'LAW_FIRM', 'ADMIN')),
    wallet_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_wallet ON public.profiles(wallet_address);

-- =========================
-- TRIGGER: Auto-create app_users row on auth.users insert
-- Ensures there is NEVER a Supabase user without an app_users row.
-- =========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    user_name TEXT;
BEGIN
    user_role := UPPER(COALESCE(NEW.raw_user_meta_data->>'role', 'INVESTOR'));
    IF user_role NOT IN ('INVESTOR', 'EXPORTER', 'LAW_FIRM', 'ADMIN') THEN
        user_role := 'INVESTOR';
    END IF;
    user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '');

    INSERT INTO public.app_users (supabase_uid, email, full_name, role, status)
    VALUES (NEW.id, NEW.email, user_name, user_role, 'ACTIVE')
    ON CONFLICT (supabase_uid) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();



-- =========================
-- INVOICES
-- Mirror of Django Invoice model (migration 0006).
-- Managed exclusively by the Django backend via
-- SUPABASE_SERVICE_ROLE_KEY; not written from the frontend
-- directly. Linked to app_users (BIGINT FK), not auth.users,
-- because the exporter relationship is via AppUser.
-- =========================
CREATE TABLE IF NOT EXISTS public.invoices (
    id BIGSERIAL PRIMARY KEY,
    exporter_id BIGINT REFERENCES public.app_users(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL UNIQUE,
    buyer_name TEXT NOT NULL,
    buyer_company TEXT NOT NULL,
    amount NUMERIC(20, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD'
        CHECK (currency IN ('USD', 'EUR', 'GBP', 'INR', 'AED', 'SGD', 'JPY', 'CNY')),
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    po_number TEXT DEFAULT '',
    country TEXT DEFAULT 'United States',
    description TEXT DEFAULT '',
    pdf_url TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Verified'
        CHECK (status IN ('Draft', 'Verified', 'Funding', 'Funded', 'Active', 'Completed')),
    funded_amount NUMERIC(20, 2) DEFAULT 0,
    blockchain_hash TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_exporter ON public.invoices(exporter_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);

-- Auto-update updated_at on any row change (reuses set_updated_at() from Section 2)
DROP TRIGGER IF EXISTS trg_invoices_updated_at ON public.invoices;
CREATE TRIGGER trg_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =========================
-- INVOICE_POOLS
-- Mirror of Django InvoicePool model (migration 0006).
-- 1:1 extension of invoices — one pool per invoice.
-- Holds the crowdfunding parameters set by the exporter
-- when they open an invoice for investor funding.
-- =========================
CREATE TABLE IF NOT EXISTS public.invoice_pools (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT UNIQUE NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    pool_size NUMERIC(20, 2) NOT NULL,
    expected_roi NUMERIC(6, 2) NOT NULL,
    funding_deadline DATE NOT NULL,
    min_investment NUMERIC(20, 2) NOT NULL,
    max_investment NUMERIC(20, 2) NOT NULL,
    amount_funded NUMERIC(20, 2) DEFAULT 0,
    is_visible_to_investors BOOLEAN DEFAULT TRUE,
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'fully_funded', 'closed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_pools_invoice ON public.invoice_pools(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_pools_status ON public.invoice_pools(status);

-- Auto-update updated_at on any row change
DROP TRIGGER IF EXISTS trg_invoice_pools_updated_at ON public.invoice_pools;
CREATE TRIGGER trg_invoice_pools_updated_at
    BEFORE UPDATE ON public.invoice_pools
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =========================
-- UPLOAD_HISTORY
-- Mirror of Django UploadHistory model (migration 0006).
-- Activity log for invoice lifecycle events. Written by
-- _log_activity() in exporter_views.py on every status
-- transition, pool creation, or maturity event.
-- =========================
CREATE TABLE IF NOT EXISTS public.upload_history (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    pool_id BIGINT REFERENCES public.invoice_pools(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL
        CHECK (action_type IN (
            'uploaded', 'verified', 'pool_created',
            'funded', 'matured', 'status_changed'
        )),
    description TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_upload_history_invoice ON public.upload_history(invoice_id);
CREATE INDEX IF NOT EXISTS idx_upload_history_pool ON public.upload_history(pool_id);
CREATE INDEX IF NOT EXISTS idx_upload_history_action ON public.upload_history(action_type);


-- ═══════════════════════════════════════════════════════
-- SECTION 6 — ROW LEVEL SECURITY (new tables only)
-- ═══════════════════════════════════════════════════════

-- ─── profiles ────────────────────────────────────────
-- Users can read and update their own profile row.
-- Insert is allowed at signup (Signup.jsx calls upsert).
-- No other user can read another user's profile.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);


-- ─── invoices ────────────────────────────────────────
-- Exporters see only their own invoices (matched via
-- app_users.supabase_uid → invoices.exporter_id).
-- Authenticated investors get read access for investment
-- discovery. All writes go through Django service role.
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Exporters read own invoices" ON public.invoices;
CREATE POLICY "Exporters read own invoices"
    ON public.invoices FOR SELECT
    USING (
        exporter_id IN (
            SELECT id FROM public.app_users
            WHERE supabase_uid = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Authenticated users read visible invoices" ON public.invoices;
CREATE POLICY "Authenticated users read visible invoices"
    ON public.invoices FOR SELECT
    USING (
        auth.role() = 'authenticated'
        AND status IN ('Funding', 'Funded', 'Active', 'Completed')
    );

-- Writes are service-role only (Django backend bypasses RLS).
-- No INSERT/UPDATE/DELETE policies for anon or authenticated
-- roles — all mutations go through Django API.


-- ─── invoice_pools ───────────────────────────────────
-- Authenticated users can read pools that are visible to
-- investors (is_visible_to_investors = TRUE).
-- Exporters can also read their own pools (even non-visible).
-- All writes go through Django service role.
ALTER TABLE public.invoice_pools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users read visible invoice pools" ON public.invoice_pools;
CREATE POLICY "Authenticated users read visible invoice pools"
    ON public.invoice_pools FOR SELECT
    USING (
        auth.role() = 'authenticated'
        AND is_visible_to_investors = TRUE
    );

DROP POLICY IF EXISTS "Exporters read own invoice pools" ON public.invoice_pools;
CREATE POLICY "Exporters read own invoice pools"
    ON public.invoice_pools FOR SELECT
    USING (
        invoice_id IN (
            SELECT inv.id FROM public.invoices inv
            JOIN public.app_users au ON au.id = inv.exporter_id
            WHERE au.supabase_uid = auth.uid()
        )
    );


-- ─── upload_history ──────────────────────────────────
-- Exporters can read activity history for their own invoices.
-- Admins use service role. No direct writes from frontend.
ALTER TABLE public.upload_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Exporters read own upload history" ON public.upload_history;
CREATE POLICY "Exporters read own upload history"
    ON public.upload_history FOR SELECT
    USING (
        invoice_id IN (
            SELECT inv.id FROM public.invoices inv
            JOIN public.app_users au ON au.id = inv.exporter_id
            WHERE au.supabase_uid = auth.uid()
        )
    );

-- ═══════════════════════════════════════════════════════
-- END OF SECTION 6
-- Full file is re-runnable end-to-end:
--   • All CREATE TABLE / CREATE INDEX use IF NOT EXISTS.
--   • All policies use DROP POLICY IF EXISTS + CREATE POLICY.
--   • All triggers use DROP TRIGGER IF EXISTS + CREATE TRIGGER.
--   • set_updated_at() function defined once in Section 2
--     via CREATE OR REPLACE FUNCTION — safe to reuse here.
-- ═══════════════════════════════════════════════════════