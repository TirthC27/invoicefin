import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { investInPool } from '../lib/contractService';
import { POLYGON_AMOY } from '../lib/networkConfig';

/* ── helpers ── */
const fmt = (n, d = 2) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const short = (h) => h ? `${h.slice(0, 10)}…${h.slice(-6)}` : '';

/* ── Theme (jup.ag inspired) ── */
const T = {
    bg: '#131a2a',
    bgCard: '#1b2336',
    bgCardHover: '#222c42',
    border: 'rgba(255,255,255,0.06)',
    borderLight: 'rgba(255,255,255,0.1)',
    accent: '#c7f284',
    accentDark: '#9fc95e',
    green: '#22c55e',
    red: '#ef4444',
    yellow: '#f59e0b',
    blue: '#3b82f6',
    purple: '#8b5cf6',
    text: '#e2e8f0',
    textMuted: '#64748b',
    textDim: '#475569',
    white: '#f8fafc',
};

/* ── Sidebar nav items ── */
const NAV_ITEMS = [
    { id: 'home', label: 'Dashboard', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
    { id: 'invoices', label: 'Invoices', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6' },
    { id: 'portfolio', label: 'Portfolio', icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
    { id: 'transactions', label: 'History', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
];

/* ── Status helpers ── */
const STATUS_COLORS = {
    open: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
    partially_funded: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
    fully_funded: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' },
    repaid: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
    defaulted: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
    draft: { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6' },
};

const RISK_LABELS = (score) => {
    if (score >= 80) return { label: 'Low Risk', color: T.green };
    if (score >= 50) return { label: 'Medium', color: T.yellow };
    return { label: 'High Risk', color: T.red };
};

/* ══════════════════════════════════════════════════════════
   INVEST MODAL
══════════════════════════════════════════════════════════ */
function InvestModal({ pool, onClose, signer, walletAddress, userId, onSuccess }) {
    const [amount, setAmount] = useState('');
    const [step, setStep] = useState('input');
    const [txHash, setTxHash] = useState('');
    const [error, setError] = useState('');
    const [blockNumber, setBlockNumber] = useState(null);

    const remaining = Number(pool.invoice_amount) - Number(pool.funded_amount || 0);
    const interestRate = Number(pool.interest_rate || 0);

    const handleInvest = async () => {
        if (!amount || Number(amount) <= 0) return;
        if (Number(amount) > remaining) { setError(`Max investable: ${remaining.toFixed(2)} ETH`); return; }
        setStep('pending'); setError('');
        try {
            const result = await investInPool(signer, pool.id, amount);
            setTxHash(result.txHash);
            setStep('confirming');
            const receipt = await result.wait();
            if (receipt.status === 'confirmed') {
                setBlockNumber(receipt.blockNumber);
                setStep('success');
                onSuccess?.(pool.id, amount, result.txHash, receipt.blockNumber, interestRate);
            } else { setStep('error'); setError('Transaction reverted on-chain.'); }
        } catch (err) {
            console.error('Invest error:', err);
            setStep('error');
            setError(err?.info?.error?.message || err?.message || 'Transaction failed');
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={onClose}>
            <div style={{ background: T.bgCard, border: `1px solid ${T.borderLight}`, borderRadius: 20, padding: '28px 32px', width: 440, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
                {step === 'input' && <>
                    <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 700, color: T.white }}>Invest in {pool.company || pool.name || `Pool #${pool.id}`}</h3>
                    <p style={{ margin: '0 0 20px', fontSize: '0.8rem', color: T.textMuted }}>{fmt(remaining)} ETH remaining · {interestRate}% APY</p>
                    <input type="number" step="0.001" min="0" max={remaining} value={amount} onChange={e => setAmount(e.target.value)}
                        placeholder="Amount in ETH" style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: `1px solid ${T.borderLight}`, background: T.bg, color: T.white, fontSize: '1rem', fontWeight: 600, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
                    {error && <p style={{ color: T.red, fontSize: '0.78rem', margin: '4px 0' }}>{error}</p>}
                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1px solid ${T.borderLight}`, background: 'transparent', color: T.textMuted, fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                        <button onClick={handleInvest} style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, color: '#111', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>Confirm Investment →</button>
                    </div>
                </>}
                {step === 'pending' && <div style={{ textAlign: 'center', padding: '30px 0' }}><div style={{ width: 40, height: 40, border: `3px solid ${T.borderLight}`, borderTopColor: T.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} /><p style={{ color: T.textMuted, fontSize: '0.85rem' }}>Confirm in MetaMask…</p></div>}
                {step === 'confirming' && <div style={{ textAlign: 'center', padding: '30px 0' }}><div style={{ width: 40, height: 40, border: `3px solid ${T.borderLight}`, borderTopColor: T.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} /><p style={{ color: T.textMuted, fontSize: '0.85rem' }}>Waiting for block confirmation…</p><p style={{ color: T.textDim, fontSize: '0.72rem', fontFamily: 'monospace' }}>{short(txHash)}</p></div>}
                {step === 'success' && <div style={{ textAlign: 'center', padding: '20px 0' }}><div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>✓</div><h3 style={{ color: T.green, fontWeight: 700, margin: '0 0 6px' }}>Investment Confirmed!</h3><p style={{ color: T.textMuted, fontSize: '0.78rem', margin: 0 }}>{amount} ETH → Block #{blockNumber}</p><a href={`${POLYGON_AMOY.blockExplorerUrls[0]}tx/${txHash}`} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 12, color: T.accent, fontSize: '0.78rem', fontFamily: 'monospace' }}>View on Etherscan →</a><button onClick={onClose} style={{ display: 'block', width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: T.accent, color: '#111', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', marginTop: 16 }}>Done</button></div>}
                {step === 'error' && <div style={{ textAlign: 'center', padding: '20px 0' }}><div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24, color: T.red }}>✗</div><h3 style={{ color: T.red, fontWeight: 700, margin: '0 0 6px' }}>Transaction Failed</h3><p style={{ color: T.textMuted, fontSize: '0.78rem', margin: '0 0 16px' }}>{error}</p><button onClick={() => { setStep('input'); setError(''); }} style={{ padding: '10px 24px', borderRadius: 12, border: `1px solid ${T.borderLight}`, background: 'transparent', color: T.text, fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }}>Try Again</button></div>}
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}


/* ══════════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════════ */
export default function Dashboard() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeNav, setActiveNav] = useState('home');
    const wallet = useWallet();

    /* Invoice pools */
    const [pools, setPools] = useState([]);
    const [poolsLoading, setPoolsLoading] = useState(false);
    const [investModal, setInvestModal] = useState(null);
    const [selectedPool, setSelectedPool] = useState(null);

    /* Portfolio — localStorage-backed */
    const LS_INV = 'invoicefi_investments';
    const LS_TX = 'invoicefi_transactions';
    const [investments, setInvestments] = useState(() => { try { return JSON.parse(localStorage.getItem(LS_INV) || '[]'); } catch { return []; } });
    const [transactions, setTransactions] = useState(() => { try { return JSON.parse(localStorage.getItem(LS_TX) || '[]'); } catch { return []; } });
    useEffect(() => { localStorage.setItem(LS_INV, JSON.stringify(investments)); }, [investments]);
    useEffect(() => { localStorage.setItem(LS_TX, JSON.stringify(transactions)); }, [transactions]);

    const navigate = useNavigate();

    /* ── Auth ── */
    useEffect(() => {
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { navigate('/auth'); return; }
            setUser(session.user);
            setLoading(false);
        })();
    }, [navigate]);

    /* ── Demo pools ── */
    const CONTRACT_ADDR = '0x338aAe9fee222bC542f8010c8E6486A8CC8EC4CC';
    const DEMO_POOLS = [
        { id: 1, invoice_amount: 5.00, funded_amount: 0, interest_rate: 14.20, risk_score: 85, status: 'open', due_date: '2026-07-12', expected_return: 14.20, contract_address: CONTRACT_ADDR, name: 'Tata Steel Export Invoice', company: 'Tata Steel Ltd.', logo: '🏭', description: 'Export receivable for 500 metric tons of hot-rolled steel shipped to Rotterdam, Netherlands.', industry: 'Steel & Metals', country: '🇮🇳 India', debtor: 'ArcelorMittal Distribution', invoiceNo: 'TSE-2026-04871', tenure: '90 days' },
        { id: 2, invoice_amount: 3.00, funded_amount: 0.75, interest_rate: 12.80, risk_score: 62, status: 'partially_funded', due_date: '2026-06-15', expected_return: 12.80, contract_address: CONTRACT_ADDR, name: 'Payverge Fintech Receivable', company: 'Payverge Technologies', logo: '💳', description: 'SaaS subscription receivable from enterprise clients across East Africa — payment gateway services.', industry: 'Fintech', country: '🇰🇪 Kenya', debtor: 'M-Pesa Business Solutions', invoiceNo: 'PVG-2026-00293', tenure: '60 days' },
        { id: 3, invoice_amount: 2.00, funded_amount: 0, interest_rate: 13.50, risk_score: 45, status: 'open', due_date: '2026-05-30', expected_return: 13.50, contract_address: CONTRACT_ADDR, name: 'Flowtap Logistics Freight', company: 'Flowtap Logistics', logo: '🚛', description: 'Cross-border freight invoice for 120 TEU container shipment — Lagos to Durban corridor.', industry: 'Logistics & Shipping', country: '🇳🇬 Nigeria', debtor: 'Maersk Africa Line', invoiceNo: 'FTL-2026-01582', tenure: '45 days' },
    ];

    const loadPools = useCallback(async () => {
        setPoolsLoading(true);
        try {
            const { data, error } = await supabase.from('pools').select('*').order('created_at', { ascending: false });
            if (!error && data?.length > 0) { setPools(data); if (!selectedPool) setSelectedPool(data[0]); }
            else { setPools(DEMO_POOLS); if (!selectedPool) setSelectedPool(DEMO_POOLS[0]); }
        } catch { setPools(DEMO_POOLS); if (!selectedPool) setSelectedPool(DEMO_POOLS[0]); }
        setPoolsLoading(false);
    }, [selectedPool]);

    useEffect(() => { if (activeNav === 'invoices' || activeNav === 'home') loadPools(); }, [activeNav, loadPools]);

    /* ── Record investment ── */
    const recordInvestment = useCallback((poolId, amount, txHash, blockNumber, interestRate) => {
        const expectedReturn = Number(amount) * (interestRate / 100);
        const now = new Date().toISOString();
        setInvestments(prev => [{ id: Date.now(), pool_id: poolId, amount: Number(amount), expected_return: expectedReturn, status: 'active', tx_hash: txHash, invested_at: now, block_number: blockNumber }, ...prev]);
        setTransactions(prev => [{ id: Date.now() + 1, pool_id: poolId, type: 'invest', amount: Number(amount), tx_hash: txHash, block_number: blockNumber, status: 'confirmed', created_at: now }, ...prev]);
        setPools(prev => prev.map(p => {
            if (p.id === poolId) {
                const newFunded = Number(p.funded_amount || 0) + Number(amount);
                const updated = { ...p, funded_amount: newFunded, status: newFunded >= Number(p.invoice_amount) ? 'fully_funded' : 'partially_funded' };
                if (selectedPool?.id === poolId) setSelectedPool(updated);
                return updated;
            }
            return p;
        }));
        supabase.from('investments').insert({ pool_id: poolId, amount: Number(amount), expected_return: expectedReturn, status: 'active', tx_hash: txHash }).then(() => { });
        supabase.from('transactions').insert({ pool_id: poolId, type: 'invest', amount: Number(amount), tx_hash: txHash, status: 'confirmed' }).then(() => { });
    }, [selectedPool]);

    if (loading) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg }}>
            <p style={{ color: T.textMuted, fontFamily: 'Inter, sans-serif' }}>Loading…</p>
        </div>
    );

    const firstName = user?.email?.split('@')[0] || 'User';
    const totalInvested = investments.reduce((s, i) => s + Number(i.amount || 0), 0);
    const totalReturns = investments.reduce((s, i) => s + Number(i.expected_return || 0), 0);
    const activeCount = investments.filter(i => i.status === 'active').length;

    /* ── Shared card style ── */
    const card = { background: T.bgCard, borderRadius: 16, border: `1px solid ${T.border}`, overflow: 'hidden' };

    return (
        <div style={{ display: 'flex', height: '100vh', background: T.bg, fontFamily: "'Inter', system-ui, sans-serif", overflow: 'hidden', boxSizing: 'border-box' }}>

            {/* ══ SIDEBAR ══ */}
            <aside style={{ width: 68, flexShrink: 0, background: T.bgCard, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16, paddingBottom: 16, gap: 4 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, cursor: 'pointer', boxShadow: `0 4px 16px rgba(199,242,132,0.2)` }} onClick={() => setActiveNav('home')}>
                    <svg width="18" height="18" fill="none" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                </div>
                {NAV_ITEMS.map(item => {
                    const active = activeNav === item.id;
                    return (
                        <button key={item.id} onClick={() => setActiveNav(item.id)} title={item.label}
                            style={{ width: 44, height: 44, borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? 'rgba(199,242,132,0.12)' : 'transparent', color: active ? T.accent : T.textDim, position: 'relative', transition: 'all 0.15s' }}>
                            {active && <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 18, background: T.accent, borderRadius: '0 3px 3px 0' }} />}
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon} /></svg>
                        </button>
                    );
                })}
                <div style={{ flex: 1 }} />
                <button title="Logout" onClick={async () => { await supabase.auth.signOut(); navigate('/auth'); }}
                    style={{ width: 44, height: 44, borderRadius: 12, border: 'none', cursor: 'pointer', background: 'transparent', color: T.textDim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                </button>
            </aside>

            {/* ══ MAIN AREA ══ */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

                {/* ── HEADER ── */}
                <div style={{ padding: '12px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: T.white, letterSpacing: '-0.3px' }}>
                        {activeNav === 'home' ? 'Dashboard' : activeNav === 'invoices' ? 'Invoice Marketplace' : activeNav === 'portfolio' ? 'My Portfolio' : 'Transactions'}
                    </h1>
                    <div style={{ flex: 1 }} />

                    {wallet.isConnected ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.green, boxShadow: `0 0 8px ${T.green}` }} />
                            <span style={{ fontSize: '0.76rem', fontWeight: 600, color: T.textMuted, fontFamily: 'monospace' }}>{wallet.truncatedAddress}</span>
                            <span style={{ fontSize: '0.65rem', color: T.accent, fontWeight: 700, background: 'rgba(199,242,132,0.1)', padding: '2px 8px', borderRadius: 999 }}>Sepolia</span>
                            <button onClick={wallet.disconnectWallet} style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${T.borderLight}`, background: 'transparent', fontSize: '0.72rem', cursor: 'pointer', color: T.textMuted }}>Disconnect</button>
                        </div>
                    ) : wallet.isWrongNetwork ? (
                        <button onClick={wallet.switchToPolygonAmoy} style={{ padding: '6px 14px', borderRadius: 999, border: 'none', background: 'rgba(239,68,68,0.15)', color: T.red, fontWeight: 700, fontSize: '0.76rem', cursor: 'pointer' }}>⚠ Switch to Sepolia</button>
                    ) : (
                        <button onClick={wallet.connectWallet} style={{ padding: '8px 18px', borderRadius: 999, border: 'none', background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, color: '#111', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M22 10H18a2 2 0 0 0 0 4h4" /></svg>
                            Connect Wallet
                        </button>
                    )}

                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>
                        {firstName.charAt(0).toUpperCase()}
                    </div>
                </div>

                {/* ── CONTENT ── */}
                <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>

                    {/* ═══ HOME ═══ */}
                    {activeNav === 'home' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Welcome */}
                            <div style={{ ...card, padding: '24px 28px', background: `linear-gradient(135deg, ${T.bgCard}, #1e293b)` }}>
                                <h2 style={{ margin: '0 0 6px', fontSize: '1.3rem', fontWeight: 800, color: T.white }}>Welcome back, {firstName} 👋</h2>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: T.textMuted }}>Your InvoiceFi portfolio at a glance</p>
                            </div>

                            {/* Stats Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                                {[
                                    { label: 'Total Invested', value: `${fmt(totalInvested)} ETH`, icon: '💰', color: T.accent },
                                    { label: 'Expected Returns', value: `${fmt(totalReturns)} ETH`, icon: '📈', color: T.green },
                                    { label: 'Active Positions', value: activeCount.toString(), icon: '⚡', color: T.blue },
                                    { label: 'Available Pools', value: pools.filter(p => p.status === 'open' || p.status === 'partially_funded').length.toString(), icon: '🏦', color: T.purple },
                                ].map(s => (
                                    <div key={s.label} style={{ ...card, padding: '20px 18px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <span style={{ fontSize: '1.4rem' }}>{s.icon}</span>
                                        </div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color, letterSpacing: '-0.5px', lineHeight: 1 }}>{s.value}</div>
                                        <div style={{ fontSize: '0.72rem', color: T.textMuted, marginTop: 6 }}>{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Recent investments + Quick Actions */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                {/* Recent Investments */}
                                <div style={{ ...card, padding: '20px 22px' }}>
                                    <h3 style={{ margin: '0 0 14px', fontSize: '0.9rem', fontWeight: 700, color: T.white }}>Recent Investments</h3>
                                    {investments.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '24px 0' }}>
                                            <p style={{ color: T.textDim, fontSize: '0.82rem', margin: 0 }}>No investments yet</p>
                                            <button onClick={() => setActiveNav('invoices')} style={{ marginTop: 12, padding: '8px 18px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, color: '#111', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>Browse Invoices →</button>
                                        </div>
                                    ) : investments.slice(0, 4).map(inv => (
                                        <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
                                            <div>
                                                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: T.text }}>Pool #{inv.pool_id}</p>
                                                <p style={{ margin: 0, fontSize: '0.68rem', color: T.textDim }}>{new Date(inv.invested_at).toLocaleDateString()}</p>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: T.accent }}>{fmt(inv.amount)} ETH</p>
                                                <p style={{ margin: 0, fontSize: '0.65rem', color: T.green }}>+{fmt(inv.expected_return)} return</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Quick Actions */}
                                <div style={{ ...card, padding: '20px 22px' }}>
                                    <h3 style={{ margin: '0 0 14px', fontSize: '0.9rem', fontWeight: 700, color: T.white }}>Quick Actions</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <button onClick={() => setActiveNav('invoices')} style={{ padding: '16px', borderRadius: 12, border: `1px solid ${T.borderLight}`, background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = T.bgCardHover} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: T.white }}>🏦 Browse Invoice Pools</p>
                                            <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: T.textMuted }}>Find invoice-backed pools to invest in</p>
                                        </button>
                                        <button onClick={() => setActiveNav('portfolio')} style={{ padding: '16px', borderRadius: 12, border: `1px solid ${T.borderLight}`, background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = T.bgCardHover} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: T.white }}>📊 View Portfolio</p>
                                            <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: T.textMuted }}>Track your active investments & returns</p>
                                        </button>
                                        <button onClick={() => setActiveNav('transactions')} style={{ padding: '16px', borderRadius: 12, border: `1px solid ${T.borderLight}`, background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = T.bgCardHover} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: T.white }}>📜 Transaction History</p>
                                            <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: T.textMuted }}>View all on-chain transactions</p>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ INVOICES ═══ */}
                    {activeNav === 'invoices' && (
                        <div style={{ display: 'flex', gap: 14, height: 'calc(100vh - 100px)', overflow: 'hidden' }}>
                            {/* Left: Pool list */}
                            <div style={{ width: 300, display: 'flex', flexDirection: 'column', ...card, overflow: 'hidden', flexShrink: 0 }}>
                                <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${T.border}` }}>
                                    <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: T.white }}>Invoice Pools</h2>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: T.textMuted }}>{pools.length} available</p>
                                </div>
                                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                                    {poolsLoading ? (
                                        <p style={{ textAlign: 'center', color: T.textMuted, fontSize: '0.82rem', padding: 20 }}>Loading…</p>
                                    ) : pools.map(pool => {
                                        const sc = STATUS_COLORS[pool.status] || STATUS_COLORS.open;
                                        const pctFunded = pool.invoice_amount > 0 ? ((pool.funded_amount || 0) / pool.invoice_amount * 100) : 0;
                                        return (
                                            <div key={pool.id} onClick={() => setSelectedPool(pool)}
                                                style={{ padding: '12px 14px', margin: '2px 8px', borderRadius: 12, cursor: 'pointer', background: selectedPool?.id === pool.id ? 'rgba(199,242,132,0.08)' : 'transparent', border: `1px solid ${selectedPool?.id === pool.id ? 'rgba(199,242,132,0.2)' : 'transparent'}`, transition: 'all 0.15s' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span style={{ fontSize: '1.2rem' }}>{pool.logo || '📄'}</span>
                                                        <div>
                                                            <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: T.white }}>{pool.company || pool.name || `Pool #${pool.id}`}</p>
                                                            <p style={{ margin: 0, fontSize: '0.6rem', color: T.textDim }}>{pool.industry || 'Invoice'} · {pool.country || ''}</p>
                                                        </div>
                                                    </div>
                                                    <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '0.58rem', fontWeight: 700, background: sc.bg, color: sc.color }}>{pool.status}</span>
                                                </div>
                                                <p style={{ margin: '6px 0 0', fontWeight: 700, fontSize: '0.9rem', color: T.accent }}>{fmt(pool.invoice_amount)} ETH</p>
                                                <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99, marginTop: 6 }}>
                                                    <div style={{ height: '100%', width: `${Math.min(pctFunded, 100)}%`, background: `linear-gradient(90deg, ${T.accent}, ${T.accentDark})`, borderRadius: 99 }} />
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                                    <span style={{ fontSize: '0.6rem', color: T.textDim }}>{fmt(pctFunded, 1)}% funded</span>
                                                    <span style={{ fontSize: '0.6rem', color: T.textDim }}>{pool.interest_rate || 0}% APY</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Right: Pool detail */}
                            {selectedPool ? (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', ...card, overflow: 'hidden', minWidth: 0 }}>
                                    <div style={{ padding: '16px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(199,242,132,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>{selectedPool.logo || '📄'}</div>
                                            <div>
                                                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: T.white }}>{selectedPool.company || selectedPool.name || `Pool #${selectedPool.id}`}</h2>
                                                <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: T.textMuted }}>{selectedPool.invoiceNo || `INV-${selectedPool.id}`} · {fmt(selectedPool.invoice_amount)} ETH · {selectedPool.interest_rate || 0}% APY</p>
                                            </div>
                                        </div>
                                        {(() => { const sc = STATUS_COLORS[selectedPool.status] || STATUS_COLORS.open; return <span style={{ padding: '4px 12px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, background: sc.bg, color: sc.color }}>{selectedPool.status}</span>; })()}
                                    </div>
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                                        {/* Description */}
                                        {selectedPool.description && (
                                            <div style={{ background: 'rgba(199,242,132,0.05)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, borderLeft: `3px solid ${T.accent}` }}>
                                                <p style={{ margin: 0, fontSize: '0.8rem', color: T.textMuted, lineHeight: 1.5 }}>{selectedPool.description}</p>
                                            </div>
                                        )}
                                        {/* Stats */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                                            {[
                                                { label: 'Invoice Amount', value: fmt(selectedPool.invoice_amount), color: T.accent, bg: 'rgba(199,242,132,0.08)' },
                                                { label: 'Funded', value: fmt(selectedPool.funded_amount || 0), color: T.blue, bg: 'rgba(59,130,246,0.08)' },
                                                { label: 'Interest Rate', value: `${selectedPool.interest_rate || 0}%`, color: T.purple, bg: 'rgba(139,92,246,0.08)' },
                                                { label: 'Risk Score', value: selectedPool.risk_score ? `${selectedPool.risk_score}/100` : 'N/A', color: selectedPool.risk_score ? RISK_LABELS(selectedPool.risk_score).color : T.textDim, bg: 'rgba(245,158,11,0.08)' },
                                            ].map(s => (
                                                <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '0.62rem', color: T.textMuted, marginBottom: 4 }}>{s.label}</div>
                                                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Progress */}
                                        <div style={{ marginBottom: 20 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: 6 }}>
                                                <span style={{ color: T.text, fontWeight: 600 }}>Funding Progress</span>
                                                <span style={{ color: T.textMuted }}>{fmt((selectedPool.funded_amount || 0) / (selectedPool.invoice_amount || 1) * 100, 1)}%</span>
                                            </div>
                                            <div style={{ height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 99 }}>
                                                <div style={{ height: '100%', width: `${Math.min((selectedPool.funded_amount || 0) / (selectedPool.invoice_amount || 1) * 100, 100)}%`, background: `linear-gradient(90deg, ${T.accent}, ${T.accentDark})`, borderRadius: 99, transition: 'width 0.5s' }} />
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: T.textDim, marginTop: 4 }}>
                                                <span>{fmt(selectedPool.funded_amount || 0)} funded</span>
                                                <span>{fmt(Number(selectedPool.invoice_amount) - Number(selectedPool.funded_amount || 0))} remaining</span>
                                            </div>
                                        </div>
                                        {/* Details */}
                                        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: '14px 16px', marginBottom: 20, border: `1px solid ${T.border}` }}>
                                            <h4 style={{ margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 700, color: T.white }}>Invoice Details</h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                                {[
                                                    { label: 'Debtor', value: selectedPool.debtor || 'Undisclosed' },
                                                    { label: 'Industry', value: selectedPool.industry || 'N/A' },
                                                    { label: 'Country', value: selectedPool.country || 'N/A' },
                                                    { label: 'Tenure', value: selectedPool.tenure || 'N/A' },
                                                    { label: 'Due Date', value: selectedPool.due_date || 'TBD' },
                                                    { label: 'Expected Return', value: selectedPool.expected_return ? `${selectedPool.expected_return}%` : 'N/A' },
                                                    { label: 'Contract', value: selectedPool.contract_address ? short(selectedPool.contract_address) : 'N/A' },
                                                    { label: 'Invoice No.', value: selectedPool.invoiceNo || 'N/A' },
                                                ].map(d => (
                                                    <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${T.border}` }}>
                                                        <span style={{ fontSize: '0.76rem', color: T.textDim }}>{d.label}</span>
                                                        <span style={{ fontSize: '0.76rem', fontWeight: 600, color: T.text, fontFamily: d.label === 'Contract' ? 'monospace' : 'inherit' }}>{d.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Invest button */}
                                        {(selectedPool.status === 'open' || selectedPool.status === 'partially_funded') ? (
                                            !wallet.isConnected ? (
                                                <button onClick={wallet.connectWallet} style={{ width: '100%', padding: '14px', borderRadius: 12, border: `1px solid ${T.borderLight}`, background: 'transparent', color: T.textMuted, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M22 10H18a2 2 0 0 0 0 4h4" /></svg>
                                                    Connect Wallet to Invest
                                                </button>
                                            ) : (
                                                <button onClick={() => setInvestModal(selectedPool)} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, color: '#111', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: `0 4px 20px rgba(199,242,132,0.25)` }}>
                                                    Invest in this Invoice →
                                                </button>
                                            )
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', color: T.textDim, fontWeight: 600, fontSize: '0.82rem', border: `1px solid ${T.border}` }}>
                                                {selectedPool.status === 'fully_funded' ? '✓ Fully Funded' : selectedPool.status === 'repaid' ? '✓ Repaid' : 'Pool Closed'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ flex: 1, ...card, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <p style={{ color: T.textDim, fontSize: '0.85rem' }}>Select a pool to view details</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ PORTFOLIO ═══ */}
                    {activeNav === 'portfolio' && (
                        <div style={{ ...card, padding: '20px 24px' }}>
                            <h2 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 700, color: T.white }}>My Investments</h2>
                            {investments.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                    <p style={{ color: T.textDim, fontSize: '0.9rem', margin: '0 0 12px' }}>No investments yet</p>
                                    <button onClick={() => setActiveNav('invoices')} style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, color: '#111', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>Browse Invoice Pools →</button>
                                </div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                    <thead><tr style={{ borderBottom: `1px solid ${T.border}` }}>
                                        <th style={{ textAlign: 'left', padding: '8px 10px', color: T.textDim, fontWeight: 600, fontSize: '0.72rem' }}>Pool</th>
                                        <th style={{ textAlign: 'right', padding: '8px 10px', color: T.textDim, fontWeight: 600, fontSize: '0.72rem' }}>Amount</th>
                                        <th style={{ textAlign: 'right', padding: '8px 10px', color: T.textDim, fontWeight: 600, fontSize: '0.72rem' }}>Expected</th>
                                        <th style={{ textAlign: 'center', padding: '8px 10px', color: T.textDim, fontWeight: 600, fontSize: '0.72rem' }}>Status</th>
                                        <th style={{ textAlign: 'right', padding: '8px 10px', color: T.textDim, fontWeight: 600, fontSize: '0.72rem' }}>TX Hash</th>
                                        <th style={{ textAlign: 'right', padding: '8px 10px', color: T.textDim, fontWeight: 600, fontSize: '0.72rem' }}>Date</th>
                                    </tr></thead>
                                    <tbody>{investments.map(inv => (
                                        <tr key={inv.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                                            <td style={{ padding: '10px', fontWeight: 600, color: T.text }}>Pool #{inv.pool_id}</td>
                                            <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: T.accent }}>{fmt(inv.amount)} ETH</td>
                                            <td style={{ padding: '10px', textAlign: 'right', color: T.green }}>{fmt(inv.expected_return)} ETH</td>
                                            <td style={{ padding: '10px', textAlign: 'center' }}>
                                                <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(34,197,94,0.15)', color: T.green }}>{inv.status}</span>
                                            </td>
                                            <td style={{ padding: '10px', textAlign: 'right' }}>
                                                {inv.tx_hash ? <a href={`${POLYGON_AMOY.blockExplorerUrls[0]}tx/${inv.tx_hash}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.72rem', color: T.accent, fontFamily: 'monospace' }}>{short(inv.tx_hash)}</a> : <span style={{ color: T.textDim }}>—</span>}
                                            </td>
                                            <td style={{ padding: '10px', textAlign: 'right', fontSize: '0.72rem', color: T.textDim }}>{new Date(inv.invested_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {/* ═══ TRANSACTIONS ═══ */}
                    {activeNav === 'transactions' && (
                        <div style={{ ...card, padding: '20px 24px' }}>
                            <h2 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 700, color: T.white }}>Transaction History</h2>
                            {transactions.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                    <p style={{ color: T.textDim, fontSize: '0.9rem' }}>No transactions yet — invest in an invoice pool to get started.</p>
                                </div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                    <thead><tr style={{ borderBottom: `1px solid ${T.border}` }}>
                                        <th style={{ textAlign: 'left', padding: '8px 10px', color: T.textDim, fontWeight: 600, fontSize: '0.72rem' }}>Type</th>
                                        <th style={{ textAlign: 'left', padding: '8px 10px', color: T.textDim, fontWeight: 600, fontSize: '0.72rem' }}>Pool</th>
                                        <th style={{ textAlign: 'right', padding: '8px 10px', color: T.textDim, fontWeight: 600, fontSize: '0.72rem' }}>Amount</th>
                                        <th style={{ textAlign: 'center', padding: '8px 10px', color: T.textDim, fontWeight: 600, fontSize: '0.72rem' }}>Status</th>
                                        <th style={{ textAlign: 'right', padding: '8px 10px', color: T.textDim, fontWeight: 600, fontSize: '0.72rem' }}>TX Hash</th>
                                        <th style={{ textAlign: 'right', padding: '8px 10px', color: T.textDim, fontWeight: 600, fontSize: '0.72rem' }}>Time</th>
                                    </tr></thead>
                                    <tbody>{transactions.map(tx => (
                                        <tr key={tx.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                                            <td style={{ padding: '10px' }}>
                                                <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(199,242,132,0.12)', color: T.accent }}>{tx.type}</span>
                                            </td>
                                            <td style={{ padding: '10px', fontWeight: 500, color: T.text }}>Pool #{tx.pool_id || '—'}</td>
                                            <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: T.accent }}>{fmt(tx.amount)} ETH</td>
                                            <td style={{ padding: '10px', textAlign: 'center' }}>
                                                <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700, background: tx.status === 'confirmed' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', color: tx.status === 'confirmed' ? T.green : T.yellow }}>{tx.status}</span>
                                            </td>
                                            <td style={{ padding: '10px', textAlign: 'right' }}>
                                                {tx.tx_hash ? <a href={`${POLYGON_AMOY.blockExplorerUrls[0]}tx/${tx.tx_hash}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.72rem', color: T.accent, fontFamily: 'monospace' }}>{short(tx.tx_hash)}</a> : <span style={{ color: T.textDim }}>—</span>}
                                            </td>
                                            <td style={{ padding: '10px', textAlign: 'right', fontSize: '0.72rem', color: T.textDim }}>{new Date(tx.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ══ INVEST MODAL ══ */}
            {investModal && wallet.signer && (
                <InvestModal
                    pool={investModal}
                    signer={wallet.signer}
                    walletAddress={wallet.walletAddress}
                    userId={user?.id}
                    onClose={() => setInvestModal(null)}
                    onSuccess={(poolId, amount, txHash, blockNumber, interestRate) => {
                        recordInvestment(poolId, amount, txHash, blockNumber, interestRate);
                    }}
                />
            )}
        </div>
    );
}
