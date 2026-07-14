import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { investInPool } from '../lib/contractService';
import { POLYGON_AMOY } from '../lib/networkConfig';

/* ── HELPERS ── */
const fmt = (n, d = 2) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const short = (h) => h ? `${h.slice(0, 10)}…${h.slice(-6)}` : '';

/* ── PREMIUM DARK FINTECH THEME SYSTEM ── */
const T = {
    bg: '#0B0B0F',
    bgSecondary: '#121216',
    surface: '#17171C',
    bgCard: '#18181D',
    bgCardHover: '#22222A',
    border: 'rgba(255,255,255,0.08)',
    borderLight: 'rgba(255,255,255,0.12)',
    accent: '#7C5CFC',
    accentDark: '#6B48F5',
    hoverPurple: '#9278FF',
    green: '#22C55E',
    red: '#EF4444',
    yellow: '#F59E0B',
    blue: '#3B82F6',
    purple: '#7C5CFC',
    text: '#FFFFFF',
    textMuted: '#A1A1AA',
    textDim: '#71717A',
    white: '#FFFFFF',
};

/* ── SIDEBAR NAV ITEMS ── */
const NAV_ITEMS = [
    { id: 'home', label: 'Dashboard', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
    { id: 'invoices', label: 'Invoices', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6' },
    { id: 'portfolio', label: 'Portfolio', icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
    { id: 'transactions', label: 'History', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
];

/* ── STATUS BADGES COLOR MAPPINGS ── */
const STATUS_COLORS = {
    open: { bg: 'rgba(34,197,94,0.08)', color: '#22C55E', border: 'rgba(34,197,94,0.2)' },
    partially_funded: { bg: 'rgba(245,158,11,0.08)', color: '#F59E0B', border: 'rgba(245,158,11,0.2)' },
    fully_funded: { bg: 'rgba(124,92,252,0.08)', color: '#7C5CFC', border: 'rgba(124,92,252,0.2)' },
    repaid: { bg: 'rgba(34,197,94,0.08)', color: '#22C55E', border: 'rgba(34,197,94,0.2)' },
    defaulted: { bg: 'rgba(239,68,68,0.08)', color: '#EF4444', border: 'rgba(239,68,68,0.2)' },
    draft: { bg: 'rgba(59,130,246,0.08)', color: '#3B82F6', border: 'rgba(59,130,246,0.2)' },
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
            let result;
            if (signer && signer.isMock) {
                // Mock smart contract transaction flow for local preview
                const dummyTxHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
                result = {
                    txHash: dummyTxHash,
                    wait: async () => {
                        await new Promise(r => setTimeout(r, 1200));
                        return {
                            blockNumber: Math.floor(Math.random() * 500000) + 12000000,
                            status: 'confirmed'
                        };
                    }
                };
            } else {
                result = await investInPool(signer, pool.id, amount);
            }
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,5,8,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={onClose}>
            <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 20, padding: '32px', width: 440, maxWidth: '90vw', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>

                {step === 'input' && <>
                    <h3 style={{ margin: '0 0 6px', fontSize: '1.25rem', fontWeight: 800, color: T.white, letterSpacing: '-0.4px' }}>Invest in {pool.company || pool.name || `Pool #${pool.id}`}</h3>
                    <p style={{ margin: '0 0 24px', fontSize: '0.85rem', color: T.textMuted }}>{fmt(remaining)} ETH remaining · {interestRate}% APY</p>

                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Investment Amount (ETH)</label>
                        <input
                            type="number"
                            step="0.001"
                            min="0"
                            max={remaining}
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="0.00"
                            style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: `1px solid ${T.border}`, background: T.bg, color: T.white, fontSize: '1.05rem', fontWeight: 600, outline: 'none', boxSizing: 'border-box' }}
                        />
                    </div>

                    {error && <p style={{ color: T.red, fontSize: '0.8rem', margin: '4px 0 12px', fontWeight: 500 }}>{error}</p>}

                    <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                        <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1px solid ${T.border}`, background: 'transparent', color: T.textMuted, fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem', transition: 'all 0.2s' }}>Cancel</button>
                        <button onClick={handleInvest} style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, color: T.white, fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem', boxShadow: '0 4px 16px rgba(124,92,252,0.25)', transition: 'transform 0.2s' }}>Confirm Investment</button>
                    </div>
                </>}

                {step === 'pending' && (
                    <div style={{ textAlign: 'center', padding: '30px 0' }}>
                        <div style={{ width: 44, height: 44, border: `3px solid rgba(124,92,252,0.15)`, borderTopColor: T.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
                        <p style={{ color: T.white, fontSize: '0.95rem', fontWeight: 600, marginBottom: 4 }}>MetaMask Action Required</p>
                        <p style={{ color: T.textMuted, fontSize: '0.8rem' }}>Please confirm the transaction in your wallet extension.</p>
                    </div>
                )}

                {step === 'confirming' && (
                    <div style={{ textAlign: 'center', padding: '30px 0' }}>
                        <div style={{ width: 44, height: 44, border: `3px solid rgba(124,92,252,0.15)`, borderTopColor: T.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
                        <p style={{ color: T.white, fontSize: '0.95rem', fontWeight: 600, marginBottom: 4 }}>Confirming on Polygon</p>
                        <p style={{ color: T.textMuted, fontSize: '0.8rem', marginBottom: 12 }}>Waiting for block confirmation on-chain…</p>
                        <p style={{ color: T.textDim, fontSize: '0.72rem', fontFamily: 'monospace', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: 8, display: 'inline-block' }}>{short(txHash)}</p>
                    </div>
                )}

                {step === 'success' && (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 24, color: T.green }}>✓</div>
                        <h3 style={{ color: T.white, fontWeight: 800, fontSize: '1.25rem', margin: '0 0 6px', letterSpacing: '-0.3px' }}>Investment Confirmed</h3>
                        <p style={{ color: T.textMuted, fontSize: '0.85rem', marginBottom: 16 }}>{amount} ETH funded successfully to Block #{blockNumber}</p>

                        <a href={`${POLYGON_AMOY.blockExplorerUrls[0]}tx/${txHash}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: T.accent, fontSize: '0.8rem', fontFamily: 'monospace', textDecoration: 'none', marginBottom: 24 }}>
                            View on Block Explorer →
                        </a>

                        <button onClick={onClose} style={{ display: 'block', width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: T.accent, color: T.white, fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}>Done</button>
                    </div>
                )}

                {step === 'error' && (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 24, color: T.red }}>✗</div>
                        <h3 style={{ color: T.white, fontWeight: 800, fontSize: '1.25rem', margin: '0 0 6px', letterSpacing: '-0.3px' }}>Transaction Failed</h3>
                        <p style={{ color: T.textMuted, fontSize: '0.82rem', margin: '0 0 24px', lineHeight: 1.5 }}>{error}</p>

                        <button onClick={() => { setStep('input'); setError(''); }} style={{ padding: '10px 24px', borderRadius: 12, border: `1px solid ${T.border}`, background: 'transparent', color: T.white, fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>Try Again</button>
                    </div>
                )}
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════
   MAIN DASHBOARD COMPONENT
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
            if (!session) { navigate('/login'); return; }
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, border: `2.5px solid rgba(124,92,252,0.15)`, borderTopColor: T.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ color: T.textMuted, fontSize: '0.88rem', fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>Loading Dashboard…</p>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    const firstName = user?.email?.split('@')[0] || 'User';
    const totalInvested = investments.reduce((s, i) => s + Number(i.amount || 0), 0);
    const totalReturns = investments.reduce((s, i) => s + Number(i.expected_return || 0), 0);
    const activeCount = investments.filter(i => i.status === 'active').length;

    /* ── Card CSS variables helper ── */
    const cardStyle = {
        background: T.bgCard,
        borderRadius: 16,
        border: `1px solid ${T.border}`,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden',
        transition: 'transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
    };

    return (
        <div style={{ display: 'flex', height: '100vh', background: T.bg, color: T.text, fontFamily: "'Inter', system-ui, sans-serif", overflow: 'hidden', boxSizing: 'border-box' }}>

            {/* ── Global keyframe and hover overrides ── */}
            <style>{`
                .sidebar-btn:hover { background: rgba(255,255,255,0.03) !important; color: ${T.text} !important; }
                .sidebar-btn-active { background: rgba(124,92,252,0.08) !important; color: ${T.accent} !important; }
                .action-card:hover { transform: translateY(-2px); border-color: rgba(124,92,252,0.3) !important; background: rgba(255,255,255,0.02) !important; }
                .metric-card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.12) !important; }
                .tbl-row { border-bottom: 1px solid ${T.border}; transition: background 0.2s; }
                .tbl-row:hover { background: rgba(255,255,255,0.02); }
                .btn-grad-p:hover { transform: translateY(-1.5px); box-shadow: 0 6px 18px rgba(124,92,252,0.3) !important; filter: brightness(1.1); }
            `}</style>

            {/* ══════════ SIDEBAR ══════════ */}
            <aside style={{ width: 76, flexShrink: 0, background: T.bgSecondary, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 20, paddingBottom: 20, gap: 8 }}>

                {/* Logo */}
                <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28, cursor: 'pointer', boxShadow: `0 4px 16px rgba(124,92,252,0.25)` }} onClick={() => setActiveNav('home')}>
                    <svg width="18" height="18" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                </div>

                {/* Nav buttons */}
                {NAV_ITEMS.map(item => {
                    const active = activeNav === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveNav(item.id)}
                            title={item.label}
                            className={`sidebar-btn ${active ? 'sidebar-btn-active' : ''}`}
                            style={{
                                width: 46,
                                height: 46,
                                borderRadius: 12,
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'transparent',
                                color: active ? T.accent : T.textDim,
                                position: 'relative',
                                transition: 'all 0.2s'
                            }}
                        >
                            {active && <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 18, background: T.accent, borderRadius: '0 3px 3px 0' }} />}
                            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d={item.icon} />
                            </svg>
                        </button>
                    );
                })}

                <div style={{ flex: 1 }} />

                {/* Logout Button */}
                <button
                    title="Logout"
                    onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }}
                    className="sidebar-btn"
                    style={{
                        width: 46,
                        height: 46,
                        borderRadius: 12,
                        border: 'none',
                        cursor: 'pointer',
                        background: 'transparent',
                        color: T.textDim,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                </button>
            </aside>

            {/* ══════════ MAIN AREA ══════════ */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

                {/* ── HEADER ── */}
                <div style={{ padding: '14px 28px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0, background: T.bgSecondary }}>
                    <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: T.white, letterSpacing: '-0.3px' }}>
                        {activeNav === 'home' ? 'Overview' : activeNav === 'invoices' ? 'Marketplace' : activeNav === 'portfolio' ? 'My Portfolio' : 'Transactions'}
                    </h1>
                    <div style={{ flex: 1 }} />

                    {/* Web3 Wallet status indicator */}
                    {wallet.isConnected ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: 10, border: `1px solid ${T.border}` }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: T.green, boxShadow: `0 0 8px ${T.green}` }} />
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: T.textMuted, fontFamily: 'monospace' }}>{wallet.truncatedAddress}</span>
                            <span style={{ fontSize: '0.65rem', color: T.accent, fontWeight: 700, background: 'rgba(124,92,252,0.12)', border: '1px solid rgba(124,92,252,0.2)', padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Polygon</span>
                            <button onClick={wallet.disconnectWallet} style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${T.border}`, background: 'transparent', fontSize: '0.7rem', cursor: 'pointer', color: T.textDim, fontWeight: 600, transition: 'all 0.2s' }} onMouseEnter={e => e.target.style.color = T.white} onMouseLeave={e => e.target.style.color = T.textDim}>Disconnect</button>
                        </div>
                    ) : wallet.isWrongNetwork ? (
                        <button onClick={wallet.switchToPolygonAmoy} style={{ padding: '6px 14px', borderRadius: 10, border: `1px solid ${T.red}`, background: 'rgba(239,68,68,0.08)', color: T.red, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.2s' }}>⚠ Switch to Polygon</button>
                    ) : (
                        <button onClick={wallet.connectWallet} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, color: T.white, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', boxShadow: '0 4px 16px rgba(124,92,252,0.2)' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <rect x="2" y="6" width="20" height="12" rx="2" />
                                <path d="M22 10H18a2 2 0 0 0 0 4h4" />
                            </svg>
                            Connect Wallet
                        </button>
                    )}

                    {/* User profile avatar badge */}
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.white, fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>
                        {firstName.charAt(0).toUpperCase()}
                    </div>
                </div>

                {/* ── CONTENT AREA ── */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: T.bg }}>

                    {/* ═══ TAB: HOME ═══ */}
                    {activeNav === 'home' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                            {/* Welcome Banner */}
                            <div style={{ ...cardStyle, padding: '28px 32px', background: `linear-gradient(135deg, ${T.bgCard}, #1E1E28)` }}>
                                <h2 style={{ margin: '0 0 6px', fontSize: '1.45rem', fontWeight: 800, color: T.white, letterSpacing: '-0.5px' }}>Welcome back, {firstName} 👋</h2>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: T.textMuted }}>Your on-chain invoice finance portfolio status.</p>
                            </div>

                            {/* Stats Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                                {[
                                    { label: 'Total Invested', value: `${fmt(totalInvested)} ETH`, icon: '💰', color: T.white },
                                    { label: 'Expected Returns', value: `${fmt(totalReturns)} ETH`, icon: '📈', color: T.green },
                                    { label: 'Active Positions', value: activeCount.toString(), icon: '⚡', color: T.accent },
                                    { label: 'Available Pools', value: pools.filter(p => p.status === 'open' || p.status === 'partially_funded').length.toString(), icon: '🏦', color: T.blue },
                                ].map(s => (
                                    <div key={s.label} className="metric-card" style={{ ...cardStyle, padding: '22px 20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                            <span style={{ fontSize: '1.25rem' }}>{s.icon}</span>
                                        </div>
                                        <div style={{ fontSize: '1.45rem', fontWeight: 800, color: s.color, letterSpacing: '-0.5px', lineHeight: 1 }}>{s.value}</div>
                                        <div style={{ fontSize: '0.75rem', color: T.textMuted, marginTop: 8, fontWeight: 500 }}>{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Recent investments + Quick Actions */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 14 }}>

                                {/* Recent Investments list */}
                                <div style={{ ...cardStyle, padding: '24px 28px' }}>
                                    <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 800, color: T.white, letterSpacing: '-0.2px' }}>Recent Investments</h3>
                                    {investments.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '36px 0' }}>
                                            <p style={{ color: T.textDim, fontSize: '0.85rem', margin: 0 }}>No active investments found.</p>
                                            <button onClick={() => setActiveNav('invoices')} className="btn-grad-p" style={{ marginTop: 16, padding: '10px 20px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, color: T.white, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(124,92,252,0.2)' }}>Browse Invoices</button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            {investments.slice(0, 4).map(inv => (
                                                <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${T.border}` }}>
                                                    <div>
                                                        <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: T.white }}>Pool #{inv.pool_id}</p>
                                                        <p style={{ margin: 0, fontSize: '0.7rem', color: T.textDim }}>{new Date(inv.invested_at).toLocaleDateString()}</p>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: T.white }}>{fmt(inv.amount)} ETH</p>
                                                        <p style={{ margin: 0, fontSize: '0.7rem', color: T.green, fontWeight: 600 }}>+{fmt(inv.expected_return)} return</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Quick Actions */}
                                <div style={{ ...cardStyle, padding: '24px 28px' }}>
                                    <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 800, color: T.white, letterSpacing: '-0.2px' }}>Quick Actions</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <button onClick={() => setActiveNav('invoices')} className="action-card" style={{ padding: '16px', borderRadius: 12, border: `1px solid ${T.border}`, background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: T.white }}>🏦 Browse Invoice Pools</p>
                                            <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: T.textMuted }}>Explore and buy trade finance invoices</p>
                                        </button>
                                        <button onClick={() => setActiveNav('portfolio')} className="action-card" style={{ padding: '16px', borderRadius: 12, border: `1px solid ${T.border}`, background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: T.white }}>📊 View Portfolio</p>
                                            <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: T.textMuted }}>Track your active investments & returns</p>
                                        </button>
                                        <button onClick={() => setActiveNav('transactions')} className="action-card" style={{ padding: '16px', borderRadius: 12, border: `1px solid ${T.border}`, background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: T.white }}>📜 Transaction History</p>
                                            <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: T.textMuted }}>Check Etherscan ledgers of investments</p>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ TAB: INVOICES ═══ */}
                    {activeNav === 'invoices' && (
                        <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 120px)', overflow: 'hidden' }}>

                            {/* Left Side: Pool list */}
                            <div style={{ width: 320, display: 'flex', flexDirection: 'column', ...cardStyle, overflow: 'hidden', flexShrink: 0 }}>
                                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, background: T.bgSecondary }}>
                                    <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: T.white, letterSpacing: '-0.2px' }}>Invoice Pools</h2>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: T.textMuted }}>{pools.length} available investments</p>
                                </div>
                                <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                                    {poolsLoading ? (
                                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                                            <div style={{ width: 20, height: 20, border: `2px solid rgba(124,92,252,0.15)`, borderTopColor: T.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                        </div>
                                    ) : pools.map(pool => {
                                        const sc = STATUS_COLORS[pool.status] || STATUS_COLORS.open;
                                        const pctFunded = pool.invoice_amount > 0 ? ((pool.funded_amount || 0) / pool.invoice_amount * 100) : 0;
                                        const active = selectedPool?.id === pool.id;

                                        return (
                                            <div
                                                key={pool.id}
                                                onClick={() => setSelectedPool(pool)}
                                                style={{
                                                    padding: '14px',
                                                    margin: '2px 0 8px',
                                                    borderRadius: 12,
                                                    cursor: 'pointer',
                                                    background: active ? 'rgba(124,92,252,0.06)' : 'rgba(255,255,255,0.01)',
                                                    border: `1px solid ${active ? 'rgba(124,92,252,0.25)' : T.border}`,
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span style={{ fontSize: '1.25rem' }}>{pool.logo || '📄'}</span>
                                                        <div>
                                                            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: T.white }}>{pool.company || pool.name || `Pool #${pool.id}`}</p>
                                                            <p style={{ margin: 0, fontSize: '0.65rem', color: T.textDim }}>{pool.industry || 'Invoice'} · {pool.country || ''}</p>
                                                        </div>
                                                    </div>
                                                    <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '0.62rem', fontWeight: 700, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{pool.status}</span>
                                                </div>

                                                <p style={{ margin: '8px 0 0', fontWeight: 800, fontSize: '0.95rem', color: T.white }}>{fmt(pool.invoice_amount)} ETH</p>

                                                {/* Funding progress slider bar */}
                                                <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 99, marginTop: 8 }}>
                                                    <div style={{ height: '100%', width: `${Math.min(pctFunded, 100)}%`, background: `linear-gradient(90deg, ${T.accent}, ${T.accentDark})`, borderRadius: 99 }} />
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.68rem', color: T.textMuted, fontWeight: 500 }}>
                                                    <span>{fmt(pctFunded, 1)}% funded</span>
                                                    <span style={{ color: T.accent }}>{pool.interest_rate || 0}% APY</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Right Side: Pool detail */}
                            {selectedPool ? (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', ...cardStyle, overflow: 'hidden', minWidth: 0 }}>

                                    <div style={{ padding: '16px 28px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.bgSecondary }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(124,92,252,0.08)', border: `1px solid rgba(124,92,252,0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>{selectedPool.logo || '📄'}</div>
                                            <div>
                                                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: T.white, letterSpacing: '-0.3px' }}>{selectedPool.company || selectedPool.name || `Pool #${selectedPool.id}`}</h2>
                                                <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: T.textMuted, fontWeight: 500 }}>{selectedPool.invoiceNo || `INV-${selectedPool.id}`} · {fmt(selectedPool.invoice_amount)} ETH · {selectedPool.interest_rate || 0}% APY</p>
                                            </div>
                                        </div>
                                        {(() => {
                                            const sc = STATUS_COLORS[selectedPool.status] || STATUS_COLORS.open;
                                            return <span style={{ padding: '4px 12px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{selectedPool.status}</span>;
                                        })()}
                                    </div>

                                    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
                                        {/* Description */}
                                        {selectedPool.description && (
                                            <div style={{ background: 'rgba(124,92,252,0.03)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, borderLeft: `3px solid ${T.accent}`, border: `1px solid ${T.border}` }}>
                                                <p style={{ margin: 0, fontSize: '0.82rem', color: T.textMuted, lineHeight: 1.6 }}>{selectedPool.description}</p>
                                            </div>
                                        )}

                                        {/* Grid Stats */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
                                            {[
                                                { label: 'Invoice Amount', value: fmt(selectedPool.invoice_amount), color: T.white, bg: 'rgba(255,255,255,0.02)' },
                                                { label: 'Funded', value: fmt(selectedPool.funded_amount || 0), color: T.accent, bg: 'rgba(124,92,252,0.04)' },
                                                { label: 'Interest Rate', value: `${selectedPool.interest_rate || 0}%`, color: T.green, bg: 'rgba(34,197,94,0.03)' },
                                                { label: 'Risk Score', value: selectedPool.risk_score ? `${selectedPool.risk_score}/100` : 'N/A', color: selectedPool.risk_score ? RISK_LABELS(selectedPool.risk_score).color : T.textDim, bg: 'rgba(255,255,255,0.02)' },
                                            ].map(s => (
                                                <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '14px 12px', textAlign: 'center', border: `1px solid ${T.border}` }}>
                                                    <div style={{ fontSize: '0.65rem', color: T.textMuted, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: 850, color: s.color, letterSpacing: '-0.3px' }}>{s.value}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Progress Bar */}
                                        <div style={{ marginBottom: 24, padding: '16px 20px', background: 'rgba(255,255,255,0.01)', border: `1px solid ${T.border}`, borderRadius: 12 }}>
                                            <div style={{ display: 'flex', justifycontent: 'space-between', fontSize: '0.78rem', marginBottom: 8, fontWeight: 600 }}>
                                                <span style={{ color: T.white }}>Funding Progress</span>
                                                <span style={{ color: T.accent }}>{fmt((selectedPool.funded_amount || 0) / (selectedPool.invoice_amount || 1) * 100, 1)}%</span>
                                            </div>
                                            <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 99 }}>
                                                <div style={{ height: '100%', width: `${Math.min((selectedPool.funded_amount || 0) / (selectedPool.invoice_amount || 1) * 100, 100)}%`, background: `linear-gradient(90deg, ${T.accent}, ${T.accentDark})`, borderRadius: 99, transition: 'width 0.5s' }} />
                                            </div>
                                            <div style={{ display: 'flex', justifycontent: 'space-between', fontSize: '0.7rem', color: T.textMuted, marginTop: 8, fontWeight: 500 }}>
                                                <span>{fmt(selectedPool.funded_amount || 0)} funded</span>
                                                <span>{fmt(Number(selectedPool.invoice_amount) - Number(selectedPool.funded_amount || 0))} remaining</span>
                                            </div>
                                        </div>

                                        {/* Detailed Specifications */}
                                        <div style={{ background: 'rgba(255,255,255,0.01)', border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
                                            <h4 style={{ margin: '0 0 12px', fontSize: '0.85rem', fontWeight: 800, color: T.white, letterSpacing: '-0.1px' }}>Invoice Specifications</h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
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
                                                    <div key={d.label} style={{ display: 'flex', justifycontent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                                                        <span style={{ fontSize: '0.76rem', color: T.textMuted, fontWeight: 500 }}>{d.label}</span>
                                                        <span style={{ fontSize: '0.76rem', fontWeight: 600, color: T.white, fontFamily: d.label === 'Contract' ? 'monospace' : 'inherit' }}>{d.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Invest Button trigger */}
                                        {(selectedPool.status === 'open' || selectedPool.status === 'partially_funded') ? (
                                            !wallet.isConnected ? (
                                                <button onClick={wallet.connectWallet} style={{ width: '100%', padding: '14px', borderRadius: 12, border: `1.5px solid ${T.border}`, background: 'transparent', color: T.white, fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.2s' }} onMouseEnter={e => e.target.style.borderColor = T.accent} onMouseLeave={e => e.target.style.borderColor = T.border}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                                        <rect x="2" y="6" width="20" height="12" rx="2" />
                                                        <path d="M22 10H18a2 2 0 0 0 0 4h4" />
                                                    </svg>
                                                    Connect Wallet to Invest
                                                </button>
                                            ) : (
                                                <button onClick={() => setInvestModal(selectedPool)} className="btn-grad-p" style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, color: T.white, fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: `0 4px 20px rgba(124,92,252,0.25)` }}>
                                                    Invest in this Invoice →
                                                </button>
                                            )
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', color: T.textDim, fontWeight: 700, fontSize: '0.82rem', border: `1px solid ${T.border}` }}>
                                                {selectedPool.status === 'fully_funded' ? '✓ Fully Funded' : selectedPool.status === 'repaid' ? '✓ Repaid' : 'Pool Closed'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ flex: 1, ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <p style={{ color: T.textDim, fontSize: '0.88rem', fontWeight: 500 }}>Select a pool to view details</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ TAB: PORTFOLIO ═══ */}
                    {activeNav === 'portfolio' && (
                        <div style={{ ...cardStyle, padding: '24px 28px' }}>
                            <h2 style={{ margin: '0 0 20px', fontSize: '1.05rem', fontWeight: 800, color: T.white, letterSpacing: '-0.3px' }}>My Investments</h2>
                            {investments.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                    <p style={{ color: T.textDim, fontSize: '0.9rem', margin: '0 0 16px', fontWeight: 500 }}>No active portfolio positions found.</p>
                                    <button onClick={() => setActiveNav('invoices')} className="btn-grad-p" style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, color: T.white, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(124,92,252,0.2)' }}>Browse Invoice Pools</button>
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: `2px solid ${T.border}`, paddingBottom: 10 }}>
                                                <th style={{ textAlign: 'left', padding: '12px 10px', color: T.textMuted, fontWeight: 600, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pool ID</th>
                                                <th style={{ textAlign: 'right', padding: '12px 10px', color: T.textMuted, fontWeight: 600, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Invested Principal</th>
                                                <th style={{ textAlign: 'right', padding: '12px 10px', color: T.textMuted, fontWeight: 600, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Expected Return</th>
                                                <th style={{ textAlign: 'center', padding: '12px 10px', color: T.textMuted, fontWeight: 600, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                                                <th style={{ textAlign: 'right', padding: '12px 10px', color: T.textMuted, fontWeight: 600, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Transaction Ledger</th>
                                                <th style={{ textAlign: 'right', padding: '12px 10px', color: T.textMuted, fontWeight: 600, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {investments.map(inv => (
                                                <tr key={inv.id} className="tbl-row">
                                                    <td style={{ padding: '14px 10px', fontWeight: 700, color: T.white }}>Pool #{inv.pool_id}</td>
                                                    <td style={{ padding: '14px 10px', textAlign: 'right', fontWeight: 800, color: T.white }}>{fmt(inv.amount)} ETH</td>
                                                    <td style={{ padding: '14px 10px', textAlign: 'right', fontWeight: 700, color: T.green }}>+{fmt(inv.expected_return)} ETH</td>
                                                    <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                                                        <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700, background: 'rgba(34,197,94,0.08)', color: T.green, border: '1px solid rgba(34,197,94,0.2)' }}>{inv.status}</span>
                                                    </td>
                                                    <td style={{ padding: '14px 10px', textAlign: 'right' }}>
                                                        {inv.tx_hash ? (
                                                            <a href={`${POLYGON_AMOY.blockExplorerUrls[0]}tx/${inv.tx_hash}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: T.accent, fontFamily: 'monospace', textDecoration: 'none', fontWeight: 600 }}>{short(inv.tx_hash)}</a>
                                                        ) : (
                                                            <span style={{ color: T.textDim }}>—</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '14px 10px', textAlign: 'right', fontSize: '0.76rem', color: T.textMuted, fontWeight: 500 }}>{new Date(inv.invested_at).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ TAB: TRANSACTIONS ═══ */}
                    {activeNav === 'transactions' && (
                        <div style={{ ...cardStyle, padding: '24px 28px' }}>
                            <h2 style={{ margin: '0 0 20px', fontSize: '1.05rem', fontWeight: 800, color: T.white, letterSpacing: '-0.3px' }}>Transaction History</h2>
                            {transactions.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                    <p style={{ color: T.textDim, fontSize: '0.9rem', fontWeight: 500 }}>No transaction ledgers found.</p>
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: `2px solid ${T.border}`, paddingBottom: 10 }}>
                                                <th style={{ textAlign: 'left', padding: '12px 10px', color: T.textMuted, fontWeight: 600, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type</th>
                                                <th style={{ textAlign: 'left', padding: '12px 10px', color: T.textMuted, fontWeight: 600, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pool Target</th>
                                                <th style={{ textAlign: 'right', padding: '12px 10px', color: T.textMuted, fontWeight: 600, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</th>
                                                <th style={{ textAlign: 'center', padding: '12px 10px', color: T.textMuted, fontWeight: 600, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                                                <th style={{ textAlign: 'right', padding: '12px 10px', color: T.textMuted, fontWeight: 600, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Explorer Tx</th>
                                                <th style={{ textAlign: 'right', padding: '12px 10px', color: T.textMuted, fontWeight: 600, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Timestamp</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.map(tx => (
                                                <tr key={tx.id} className="tbl-row">
                                                    <td style={{ padding: '14px 10px' }}>
                                                        <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700, background: 'rgba(124,92,252,0.08)', color: T.accent, border: '1px solid rgba(124,92,252,0.2)' }}>{tx.type}</span>
                                                    </td>
                                                    <td style={{ padding: '14px 10px', fontWeight: 700, color: T.white }}>Pool #{tx.pool_id || '—'}</td>
                                                    <td style={{ padding: '14px 10px', textAlign: 'right', fontWeight: 800, color: T.white }}>{fmt(tx.amount)} ETH</td>
                                                    <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                                                        <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700, background: tx.status === 'confirmed' ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)', color: tx.status === 'confirmed' ? T.green : T.yellow, border: `1px solid ${tx.status === 'confirmed' ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}` }}>{tx.status}</span>
                                                    </td>
                                                    <td style={{ padding: '14px 10px', textAlign: 'right' }}>
                                                        {tx.tx_hash ? (
                                                            <a href={`${POLYGON_AMOY.blockExplorerUrls[0]}tx/${tx.tx_hash}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: T.accent, fontFamily: 'monospace', textDecoration: 'none', fontWeight: 600 }}>{short(tx.tx_hash)}</a>
                                                        ) : (
                                                            <span style={{ color: T.textDim }}>—</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '14px 10px', textAlign: 'right', fontSize: '0.76rem', color: T.textMuted, fontWeight: 500 }}>{new Date(tx.created_at).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ══ INVEST MODAL OVERLAY ══ */}
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
