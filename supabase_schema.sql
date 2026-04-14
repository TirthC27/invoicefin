-- ═══════════════════════════════════════════════════════
-- InvoiceFi — Complete Supabase Schema
-- Run this ENTIRE script in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- Keep existing profiles table, add new investment tables

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

-- =========================
-- Row Level Security
-- =========================

-- Pools: anyone can read (public listing)
ALTER TABLE public.pools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read pools" ON public.pools FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert pools" ON public.pools FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update pools" ON public.pools FOR UPDATE USING (auth.role() = 'authenticated');

-- Investments: users see their own
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own investments" ON public.investments FOR SELECT USING (auth.uid() = investor_id);
CREATE POLICY "Users insert own investments" ON public.investments FOR INSERT WITH CHECK (auth.uid() = investor_id);
CREATE POLICY "Users update own investments" ON public.investments FOR UPDATE USING (auth.uid() = investor_id);

-- Transactions: users see their own
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);

-- Portfolios: users see their own
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own portfolio" ON public.portfolios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own portfolio" ON public.portfolios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own portfolio" ON public.portfolios FOR UPDATE USING (auth.uid() = user_id);

-- =========================
-- Seed 3 demo invoice pools
-- =========================
INSERT INTO public.pools (invoice_amount, funded_amount, interest_rate, risk_score, status, due_date, expected_return) VALUES
  (5.00, 0, 14.20, 85, 'open', '2026-07-12', 14.20),
  (3.00, 0, 12.80, 62, 'open', '2026-06-15', 12.80),
  (2.00, 0, 13.50, 45, 'open', '2026-05-30', 13.50);
