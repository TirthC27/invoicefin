-- ═══════════════════════════════════════════════════════
-- InvoiceFi — Complete Supabase Schema
-- Run this ENTIRE script in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════
-- Last updated: multi-role + recovery module release
-- Roles: INVESTOR | EXPORTER | LAW_FIRM | ADMIN
-- ═══════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════
-- SECTION 1 — ORIGINAL TABLES (unchanged)
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
-- INVESTMENTS
-- =========================
CREATE TABLE IF NOT EXISTS public.investments (
    id BIGSERIAL PRIMARY KEY,
    investor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    pool_id BIGINT REFERENCES public.pools(id) ON DELETE CASCADE,
    amount NUMERIC(18,2) NOT NULL,
    expected_return NUMERIC(18,2),
    actual_return NUMERIC(18,2),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','claimed','defaulted')),
    tx_hash TEXT,
    invested_at TIMESTAMPTZ DEFAULT NOW(),
    claimed_at TIMESTAMPTZ
);

-- =========================
-- TRANSACTIONS (Unified Ledger)
-- =========================
CREATE TABLE IF NOT EXISTS public.transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    pool_id BIGINT REFERENCES public.pools(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('invest','claim','repay','withdraw')),
    amount NUMERIC(18,2),
    tx_hash TEXT,
    block_number BIGINT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','failed')),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================
-- PORTFOLIOS (Cached aggregate)
-- =========================
CREATE TABLE IF NOT EXISTS public.portfolios (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    total_invested NUMERIC(18,2) DEFAULT 0,
    total_returns NUMERIC(18,2) DEFAULT 0,
    active_investments_count INT DEFAULT 0,
    updated_at TIMESTAMPTZ
);


-- ═══════════════════════════════════════════════════════
-- SECTION 2 — MULTI-ROLE & RECOVERY MODULE (NEW)
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
-- Tracks the current stage of the recovery operation.
-- =========================
CREATE TABLE IF NOT EXISTS public.recovery_cases (
    id BIGSERIAL PRIMARY KEY,
    pool_id BIGINT NOT NULL REFERENCES public.pools(id) ON DELETE CASCADE,
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

-- ─── Original tables (unchanged) ─────────────────────

-- Pools: anyone can read (public listing)
ALTER TABLE public.pools ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Anyone can read pools"
    ON public.pools FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Authenticated users can insert pools"
    ON public.pools FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Authenticated users can update pools"
    ON public.pools FOR UPDATE USING (auth.role() = 'authenticated');

-- Investments: users see their own
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users read own investments"
    ON public.investments FOR SELECT USING (auth.uid() = investor_id);
CREATE POLICY IF NOT EXISTS "Users insert own investments"
    ON public.investments FOR INSERT WITH CHECK (auth.uid() = investor_id);
CREATE POLICY IF NOT EXISTS "Users update own investments"
    ON public.investments FOR UPDATE USING (auth.uid() = investor_id);

-- Transactions: users see their own
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users read own transactions"
    ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users insert own transactions"
    ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users update own transactions"
    ON public.transactions FOR UPDATE USING (auth.uid() = user_id);

-- Portfolios: users see their own
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users read own portfolio"
    ON public.portfolios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users insert own portfolio"
    ON public.portfolios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users update own portfolio"
    ON public.portfolios FOR UPDATE USING (auth.uid() = user_id);


-- ─── New tables RLS ───────────────────────────────────

-- app_users: users read their own row; service role manages all
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own app_user row"
    ON public.app_users FOR SELECT
    USING (auth.uid() = supabase_uid);
-- Admin/service role writes are handled by the Django backend
-- using SUPABASE_SERVICE_ROLE_KEY (bypasses RLS)

-- law_firms: law firm users read their own record;
--            admins & service role read all (via backend)
ALTER TABLE public.law_firms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Law firm users read own record"
    ON public.law_firms FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM public.app_users
            WHERE supabase_uid = auth.uid()
        )
    );

-- recovery_cases: law firm users see only their assigned cases;
--                 admins see all (backend-enforced via service role)
ALTER TABLE public.recovery_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Law firm users read own cases"
    ON public.recovery_cases FOR SELECT
    USING (
        law_firm_id IN (
            SELECT lf.id FROM public.law_firms lf
            JOIN public.app_users au ON au.id = lf.user_id
            WHERE au.supabase_uid = auth.uid()
        )
    );

-- recovery_events: law firm users see events for their cases
ALTER TABLE public.recovery_events ENABLE ROW LEVEL SECURITY;
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

-- notifications: users see only their own
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications"
    ON public.notifications FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM public.app_users
            WHERE supabase_uid = auth.uid()
        )
    );
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
-- only the new multi-role tables, run ONLY SECTION 2 + 3 (new parts).
--
-- The Django backend (SQLite) holds the authoritative local copy
-- of app_users, law_firms, recovery_cases, recovery_events, notifications.
-- These Supabase tables are for:
--   (a) Supabase Dashboard visibility / reporting
--   (b) Direct Supabase client queries if needed in the future
--   (c) Documentation of the full data model
--
-- All write operations to new tables go through Django API
-- with SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
-- ═══════════════════════════════════════════════════════
