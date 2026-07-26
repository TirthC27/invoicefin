import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { investInPool } from '../lib/contractService';
import { POLYGON_AMOY } from '../lib/networkConfig';

// Lucide icons
import {
    LayoutDashboard,
    Wallet,
    Receipt,
    TrendingUp,
    Briefcase,
    History,
    BarChart3,
    Settings as SettingsIcon,
    Bell,
    ChevronRight,
    ChevronDown,
    LogOut,
    Shield,
    Info,
    ArrowUpRight,
    ArrowDownRight,
    Globe,
    Coins,
    Percent,
    Users,
    Menu,
    X,
    Copy,
    Check
} from 'lucide-react';

/* ── HELPERS ── */
const fmt = (n, d = 2) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const short = (h) => h ? `${h.slice(0, 6)}...${h.slice(-4)}` : '';

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
    if (score >= 80) return { label: 'Low Risk', color: '#22C55E' };
    if (score >= 50) return { label: 'Medium', color: '#F59E0B' };
    return { label: 'High Risk', color: '#EF4444' };
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,5,8,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={onClose}>
            <div style={{ background: '#18181D', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 20, padding: '32px', width: 440, maxWidth: '90vw', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>

                {step === 'input' && <>
                    <h3 style={{ margin: '0 0 6px', fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.4px' }}>Invest in {pool.company || pool.name || `Pool #${pool.id}`}</h3>
                    <p style={{ margin: '0 0 24px', fontSize: '0.85rem', color: '#A1A1AA' }}>{fmt(remaining)} ETH remaining · {interestRate}% APY</p>

                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Investment Amount (ETH)</label>
                        <input
                            type="number"
                            step="0.001"
                            min="0"
                            max={remaining}
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="0.00"
                            style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: `1px solid rgba(255,255,255,0.08)`, background: '#0B0B0F', color: '#FFFFFF', fontSize: '1.05rem', fontWeight: 600, outline: 'none', boxSizing: 'border-box' }}
                        />
                    </div>

                    {error && <p style={{ color: '#EF4444', fontSize: '0.8rem', margin: '4px 0 12px', fontWeight: 500 }}>{error}</p>}

                    <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                        <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1px solid rgba(255,255,255,0.08)`, background: 'transparent', color: '#A1A1AA', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem', transition: 'all 0.2s' }}>Cancel</button>
                        <button onClick={handleInvest} style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, #7C5CFC, #6B48F5)`, color: '#FFFFFF', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem', boxShadow: '0 4px 16px rgba(124,92,252,0.25)', transition: 'transform 0.2s' }}>Confirm Investment</button>
                    </div>
                </>}

                {step === 'pending' && (
                    <div style={{ textAlign: 'center', padding: '30px 0' }}>
                        <div style={{ width: 44, height: 44, border: `3px solid rgba(124,92,252,0.15)`, borderTopColor: '#7C5CFC', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
                        <p style={{ color: '#FFFFFF', fontSize: '0.95rem', fontWeight: 600, marginBottom: 4 }}>MetaMask Action Required</p>
                        <p style={{ color: '#A1A1AA', fontSize: '0.8rem' }}>Please confirm the transaction in your wallet extension.</p>
                    </div>
                )}

                {step === 'confirming' && (
                    <div style={{ textAlign: 'center', padding: '30px 0' }}>
                        <div style={{ width: 44, height: 44, border: `3px solid rgba(124,92,252,0.15)`, borderTopColor: '#7C5CFC', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
                        <p style={{ color: '#FFFFFF', fontSize: '0.95rem', fontWeight: 600, marginBottom: 4 }}>Confirming on Polygon</p>
                        <p style={{ color: '#A1A1AA', fontSize: '0.8rem', marginBottom: 12 }}>Waiting for block confirmation on-chain…</p>
                        <p style={{ color: '#71717A', fontSize: '0.72rem', fontFamily: 'monospace', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: 8, display: 'inline-block' }}>{short(txHash)}</p>
                    </div>
                )}

                {step === 'success' && (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', justifycontent: 'center', margin: '0 auto 20px', fontSize: 24, color: '#22C55E' }}>✓</div>
                        <h3 style={{ color: '#FFFFFF', fontWeight: 800, fontSize: '1.25rem', margin: '0 0 6px', letterSpacing: '-0.3px' }}>Investment Confirmed</h3>
                        <p style={{ color: '#A1A1AA', fontSize: '0.85rem', marginBottom: 16 }}>{amount} ETH funded successfully to Block #{blockNumber}</p>

                        <a href={`${POLYGON_AMOY.blockExplorerUrls[0]}tx/${txHash}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#7C5CFC', fontSize: '0.8rem', fontFamily: 'monospace', textDecoration: 'none', marginBottom: 24 }}>
                            View on Block Explorer →
                        </a>

                        <button onClick={onClose} style={{ display: 'block', width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: '#7C5CFC', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}>Done</button>
                    </div>
                )}

                {step === 'error' && (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifycontent: 'center', margin: '0 auto 20px', fontSize: 24, color: '#EF4444' }}>✗</div>
                        <h3 style={{ color: '#FFFFFF', fontWeight: 800, fontSize: '1.25rem', margin: '0 0 6px', letterSpacing: '-0.3px' }}>Transaction Failed</h3>
                        <p style={{ color: '#A1A1AA', fontSize: '0.82rem', margin: '0 0 24px', lineHeight: 1.5 }}>{error}</p>

                        <button onClick={() => { setStep('input'); setError(''); }} style={{ padding: '10px 24px', borderRadius: 12, border: `1px solid rgba(255,255,255,0.08)`, background: 'transparent', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>Try Again</button>
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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const wallet = useWallet();

    /* Invoice pools */
    const [pools, setPools] = useState([]);
    const [poolsLoading, setPoolsLoading] = useState(false);
    const [investModal, setInvestModal] = useState(null);
    const [selectedPool, setSelectedPool] = useState(null);

    /* Portfolio & Investments — fetched from backend API */
    const [investments, setInvestments] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [portfolioSummary, setPortfolioSummary] = useState(null);

    const loadUserData = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
            const headers = { 'Authorization': `Bearer ${session.access_token}` };

            const [pRes, iRes] = await Promise.all([
                fetch(`${API_BASE}/portfolio/`, { headers }).catch(() => null),
                fetch(`${API_BASE}/investments/`, { headers }).catch(() => null),
            ]);

            if (pRes?.ok) {
                const pData = await pRes.json();
                setPortfolioSummary(pData.portfolio || pData);
                if (pData.investments) setInvestments(pData.investments);
            }
            if (iRes?.ok) {
                const iData = await iRes.json();
                setInvestments(Array.isArray(iData) ? iData : iData.results || []);
            }
        } catch (err) {
            console.error('Failed to load user portfolio data:', err);
        }
    }, []);

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

    const loadPools = useCallback(async () => {
        setPoolsLoading(true);
        try {
            const { data, error } = await supabase.from('pools').select('*').order('created_at', { ascending: false });
            if (!error && data) {
                setPools(data);
                if (!selectedPool && data.length > 0) setSelectedPool(data[0]);
            } else {
                setPools([]);
            }
        } catch {
            setPools([]);
        }
        setPoolsLoading(false);
    }, [selectedPool]);

    useEffect(() => {
        if (activeNav === 'invoices' || activeNav === 'home') loadPools();
        if (activeNav === 'portfolio' || activeNav === 'home' || activeNav === 'transactions') loadUserData();
    }, [activeNav, loadPools, loadUserData]);

    /* ── Record investment ── */
    const recordInvestment = useCallback(async (poolId, amount, txHash, blockNumber, interestRate) => {
        const expectedReturn = Number(amount) * (interestRate / 100);
        const now = new Date().toISOString();

        // Instant local state update for responsive UI
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

        // Send ONLY tx_hash to the backend — it verifies everything on-chain
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

            const res = await fetch(`${API_BASE}/api/investments/verify/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ tx_hash: txHash }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                console.warn('Backend verify response:', res.status, err);
            } else {
                console.log('Investment verified on backend ✓');
            }
        } catch (err) {
            // Backend verification failure should not break the UI
            console.error('Backend verify call failed:', err);
        }
    }, [selectedPool]);

    const handleCopy = () => {
        if (wallet.walletAddress) {
            navigator.clipboard.writeText(wallet.walletAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (loading) return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0B0B0F]">
            <div className="w-8 h-8 border-2 border-white/10 border-t-[#7C5CFC] rounded-full animate-spin mb-3" />
            <p className="text-[#A1A1AA] text-xs font-semibold tracking-wider uppercase">Loading Invoicefi…</p>
        </div>
    );

    const firstName = user?.email?.split('@')[0] || 'shubhampanchal0729';
    const totalInvested = investments.reduce((s, i) => s + Number(i.amount || 0), 0);
    const totalReturns = investments.reduce((s, i) => s + Number(i.expected_return || 0), 0);
    const activeCount = investments.filter(i => i.status === 'active').length;

    // Sidebar items layout configuration
    const SIDEBAR_ITEMS = [
        { id: 'home', label: 'Overview', icon: LayoutDashboard },
        { id: 'invoices', label: 'Investments', icon: Briefcase },
        { id: 'portfolio', label: 'Portfolio', icon: TrendingUp },
        { id: 'transactions', label: 'Transactions', icon: History },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'settings', label: 'Settings', icon: SettingsIcon },
    ];

    const getPageTitle = () => {
        switch (activeNav) {
            case 'home': return 'Overview';
            case 'invoices': return 'Investments & Invoices';
            case 'portfolio': return 'Portfolio Details';
            case 'transactions': return 'Transactions Ledger';
            case 'analytics': return 'Performance & Analytics';
            case 'settings': return 'Platform Settings';
            default: return 'Overview';
        }
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-[#0B0B0F] text-white font-sans selection:bg-[#7C5CFC]/20">

            {/* Custom Animations & Interactions Overrides */}
            <style>{`
                .nav-btn-stripe { height: 46px; border-radius: 12px; transition: background 200ms, transform 200ms, color 200ms; }
                .nav-btn-stripe:hover { background: rgba(255,255,255,0.04) !important; color: #FFFFFF !important; }
                .nav-btn-stripe-active { background: #7C5CFC !important; color: #FFFFFF !important; box-shadow: 0 4px 12px rgba(124,92,252,0.25) !important; }
                .card-stripe { background: #18181D; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; transition: transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease; }
                .card-stripe:hover { transform: translateY(-2px); border-color: rgba(124,92,252,0.2); box-shadow: 0 12px 30px rgba(0,0,0,0.3); }
                .btn-stripe-grad { background: linear-gradient(135deg, #7C5CFC 0%, #6B48F5 100%); border-radius: 12px; transition: transform 200ms, filter 200ms, box-shadow 200ms; }
                .btn-stripe-grad:hover { transform: translateY(-1.5px); filter: brightness(1.1); box-shadow: 0 4px 14px rgba(124,92,252,0.25); }
                .btn-stripe-outline { background: transparent; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; transition: background 200ms, border-color 200ms, transform 200ms; }
                .btn-stripe-outline:hover { background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.15); transform: translateY(-1px); }
            `}</style>

            {/* ══════════ LEFT FIXED SIDEBAR ══════════ */}
            <aside className="hidden lg:flex w-[260px] flex-col bg-[#101015] border-r border-white/8 py-6 px-4 shrink-0 justify-between">
                <div>
                    {/* Invoicefi Logo */}
                    <div className="flex items-center gap-3.5 px-3 mb-8 cursor-pointer" onClick={() => setActiveNav('home')}>
                        <div className="w-8.5 h-8.5 rounded-[10px] bg-gradient-to-tr from-[#7C5CFC] to-[#6B48F5] flex items-center justify-center shadow-lg shadow-[#7C5CFC]/20">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <span className="font-extrabold text-[19px] tracking-tight text-white">Invoicefi</span>
                    </div>

                    {/* Centered Navigation */}
                    <nav className="flex flex-col gap-1">
                        {SIDEBAR_ITEMS.map(item => {
                            const targetNav = item.target || item.id;
                            const isActive = activeNav === targetNav && (item.id === 'home' ? activeNav === 'home' : true);
                            const Icon = item.icon;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => { setActiveNav(targetNav); setIsMobileMenuOpen(false); }}
                                    className={`nav-btn-stripe flex items-center gap-[16px] w-full px-4 font-semibold text-sm transition-all cursor-pointer ${isActive
                                        ? 'nav-btn-stripe-active text-white'
                                        : 'text-[#A1A1AA] hover:text-white'
                                        }`}
                                >
                                    <Icon className="w-4.5 h-4.5 shrink-0" />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Bottom Fixed Area: Wallet Card + Profile Card */}
                <div className="flex flex-col gap-3 mt-8">
                    {/* Wallet Connected Card */}
                    <div className="bg-[#18181D] border border-white/8 rounded-2xl p-4 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${wallet.isConnected ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`} />
                                <span className="text-[10px] uppercase tracking-wider text-[#A1A1AA] font-extrabold">
                                    {wallet.isConnected ? 'Wallet Connected' : 'Wallet Disconnected'}
                                </span>
                            </div>
                        </div>
                        {wallet.isConnected ? (
                            <div>
                                <div className="flex items-center justify-between gap-1.5 mt-0.5">
                                    <p className="text-xs font-mono text-white truncate font-bold">{short(wallet.walletAddress)}</p>
                                    <button onClick={handleCopy} className="p-1 hover:bg-white/5 text-[#A1A1AA] hover:text-white rounded transition-colors cursor-pointer" title="Copy Address">
                                        {copied ? <Check className="w-3 h-3 text-[#22C55E]" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                </div>
                                <div className="flex items-center gap-1.5 mt-2">
                                    <svg width="12" height="12" viewBox="0 0 38 33" fill="none">
                                        <path d="M29.27 10.06a2.88 2.88 0 0 0-2.84 0L20.8 13.65l-3.79 2.13-5.6 3.59a2.88 2.88 0 0 1-2.85 0L4 16.17a2.76 2.76 0 0 1-1.42-2.4v-5.3a2.75 2.75 0 0 1 1.42-2.4l4.55-2.6a2.88 2.88 0 0 1 2.84 0l4.55 2.6a2.76 2.76 0 0 1 1.43 2.4v3.59l3.79-2.19V8.3a2.75 2.75 0 0 0-1.42-2.4L11.4 1.12a2.88 2.88 0 0 0-2.84 0L.71 5.9A2.75 2.75 0 0 0 0 8.37v9.52a2.75 2.75 0 0 0 1.42 2.4l7.9 4.5a2.88 2.88 0 0 0 2.84 0l5.6-3.18 3.79-2.19 5.6-3.18a2.88 2.88 0 0 1 2.84 0l4.55 2.6a2.76 2.76 0 0 1 1.42 2.4v5.3a2.75 2.75 0 0 1-1.42 2.4l-4.55 2.6a2.88 2.88 0 0 1-2.84 0L23 29.45a2.76 2.76 0 0 1-1.42-2.4v-3.59l-3.79 2.19v3.59a2.75 2.75 0 0 0 1.42 2.4l7.9 4.5a2.88 2.88 0 0 0 2.84 0l7.9-4.5A2.75 2.75 0 0 0 38 29.3V19.7a2.75 2.75 0 0 0-1.43-2.4l-7.3-4.18z" fill="#8247E5" />
                                    </svg>
                                    <span className="text-[10px] text-[#A1A1AA] font-extrabold tracking-wide">Sepolia Testnet</span>
                                </div>
                            </div>
                        ) : (
                            <button onClick={wallet.connectWallet} className="text-left text-[10px] text-[#7C5CFC] hover:text-[#9278FF] font-semibold cursor-pointer">Connect Wallet</button>
                        )}
                    </div>

                    {/* Profile Card */}
                    <div className="bg-[#18181D] border border-white/8 rounded-2xl p-4 flex items-center justify-between relative group">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7C5CFC] to-[#6B48F5] flex items-center justify-center font-black text-sm text-white capitalize shadow-md">
                                {firstName.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-white truncate capitalize leading-none mb-1">{firstName}</p>
                                <p className="text-[10px] text-[#A1A1AA] truncate leading-none">Investor</p>
                            </div>
                        </div>
                        <button onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }} className="p-1 rounded-lg hover:bg-white/5 text-[#A1A1AA] hover:text-white cursor-pointer transition-colors" title="Logout">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* ══════════ MOBILE SIDEBAR DRAWER ══════════ */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 flex lg:hidden bg-black/80 backdrop-filter backdrop-blur-md" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="w-64 bg-[#101015] border-r border-white/8 h-full p-5 flex flex-col justify-between" onClick={e => e.stopPropagation()}>
                        <div>
                            {/* Drawer Header */}
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-[#7C5CFC] flex items-center justify-center">
                                        <TrendingUp className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="font-extrabold text-lg tracking-tight">Invoicefi</span>
                                </div>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 rounded-lg hover:bg-white/5 cursor-pointer text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Drawer Navigation */}
                            <nav className="flex flex-col gap-1">
                                {SIDEBAR_ITEMS.map(item => {
                                    const targetNav = item.target || item.id;
                                    const isActive = activeNav === targetNav && (item.id === 'home' ? activeNav === 'home' : true);
                                    const Icon = item.icon;

                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => { setActiveNav(targetNav); setIsMobileMenuOpen(false); }}
                                            className={`nav-btn-stripe flex items-center gap-[16px] w-full px-4 font-semibold text-sm transition-all cursor-pointer ${isActive
                                                ? 'nav-btn-stripe-active text-white'
                                                : 'text-[#A1A1AA] hover:text-white'
                                                }`}
                                        >
                                            <Icon className="w-4.5 h-4.5 shrink-0" />
                                            <span>{item.label}</span>
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* Drawer Bottom Profile */}
                        <div className="flex flex-col gap-3">
                            <div className="bg-[#18181D] border border-white/8 rounded-2xl p-4 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] uppercase tracking-wider text-[#A1A1AA] font-bold">Wallet Connection</span>
                                    <span className={`w-1.5 h-1.5 rounded-full ${wallet.isConnected ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`} />
                                </div>
                                {wallet.isConnected ? (
                                    <p className="text-xs font-mono text-white truncate">{wallet.truncatedAddress}</p>
                                ) : (
                                    <p className="text-xs text-[#71717A] font-bold">Wallet Disconnected</p>
                                )}
                            </div>

                            <div className="bg-[#18181D] border border-white/8 rounded-2xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-[#7C5CFC] flex items-center justify-center font-bold text-sm text-white">
                                        {firstName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-white truncate capitalize">{firstName}</p>
                                        <p className="text-[10px] text-[#A1A1AA] truncate">{user?.email}</p>
                                    </div>
                                </div>
                                <button onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }} className="p-1 text-[#A1A1AA] hover:text-white cursor-pointer">
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════ MAIN CONTENT ══════════ */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {/* ── TOP NAVIGATION (80px Height) ── */}
                <header className="h-20 px-8 border-b border-white/8 flex items-center justify-between shrink-0 bg-[#101015]">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-white/5 cursor-pointer text-white">
                            <Menu className="w-5.5 h-5.5" />
                        </button>
                        <h1 className="text-2xl font-black text-white tracking-tight uppercase leading-none">{getPageTitle()}</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Notification Button */}
                        <button className="p-2.5 bg-[#18181D] border border-white/8 rounded-xl hover:bg-white/5 text-[#A1A1AA] hover:text-white cursor-pointer transition-all relative">
                            <Bell className="w-4.5 h-4.5" />
                            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#EF4444] ring-2 ring-[#18181D]" />
                            <span className="absolute -top-1 -right-1 bg-[#7C5CFC] text-white rounded-full w-4 h-4 text-[9px] font-black flex items-center justify-center border border-[#18181D]">2</span>
                        </button>

                        {/* Wallet Button */}
                        {wallet.isConnected ? (
                            <div className="flex items-center gap-2 bg-[#18181D] border border-white/8 px-4 py-2.5 rounded-xl">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                                <span className="text-xs font-mono text-[#A1A1AA]">{wallet.truncatedAddress}</span>
                            </div>
                        ) : wallet.isWrongNetwork ? (
                            <button onClick={wallet.switchToPolygonAmoy} className="px-4 py-2.5 rounded-xl border border-[#EF4444] bg-[#EF4444]/8 text-[#EF4444] font-bold text-xs cursor-pointer hover:bg-[#EF4444]/15">
                                Switch to Polygon
                            </button>
                        ) : (
                            <button onClick={wallet.connectWallet} className="btn-stripe-grad flex items-center gap-2.5 px-4 py-2.5 text-white font-bold text-xs cursor-pointer">
                                <Wallet className="w-4 h-4" />
                                Connect Wallet
                            </button>
                        )}

                        {/* Avatar Circle */}
                        <div className="w-9 h-9 bg-white/5 border border-white/8 rounded-full flex items-center justify-center text-xs text-white font-bold capitalize">
                            {firstName.charAt(0)}
                        </div>
                    </div>
                </header>

                {/* ── SCROLL CONTENT AREA ── */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#0B0B0F] max-w-7xl mx-auto w-full">

                    {/* ═══ TAB: HOME / OVERVIEW ═══ */}
                    {activeNav === 'home' && (
                        <div className="flex flex-col gap-6">

                            {/* Welcome Card (Adaptive Height, Rounded 16px) */}
                            <div className="min-h-[140px] rounded-2xl border border-white/8 py-6 px-6 md:px-8 relative overflow-hidden bg-gradient-to-r from-[#1E124A] via-[#101015] to-[#18181D] flex items-center justify-between gap-6">
                                <div className="z-10">
                                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2">Welcome back, {firstName} 👋</h1>
                                    <p className="text-sm text-[#A1A1AA] max-w-md font-medium">Your on-chain invoice finance portfolio status.</p>
                                </div>
                                <div className="absolute right-8 bottom-0 opacity-15 md:opacity-100 md:static shrink-0 select-none">
                                    {/* Poly illustration */}
                                    <svg width="150" height="120" viewBox="0 0 150 120" fill="none" className="shrink-0">
                                        <g transform="translate(10, 20)">
                                            <path d="M25 25L5 35V65L25 55V25Z" fill="#7C5CFC" opacity="0.4" />
                                            <path d="M25 25L45 35V65L25 55V25Z" fill="#7C5CFC" opacity="0.6" />
                                            <path d="M25 25L5 35L25 45L45 35L25 25Z" fill="#9278FF" opacity="0.8" />
                                            <path d="M25 25L5 35V65L25 55L45 65V35L25 25Z M25 45V55 M5 35L25 45L45 35" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
                                        </g>
                                        <g transform="translate(60, 20)">
                                            <path d="M10 50L30 35L50 45L70 15" stroke="#9278FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                            <circle cx="70" cy="15" r="5" fill="#22C55E" />
                                            <circle cx="70" cy="15" r="10" stroke="#22C55E" strokeWidth="2" fill="#0B0B0F" />
                                            <path d="M67 15L69 17L73 13" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
                                        </g>
                                    </svg>
                                </div>
                            </div>

                            {/* Statistics Row (4 equal cards, gap 24px) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                    { label: 'Total Invested', val: `${fmt(totalInvested)} ETH`, sub: `$${fmt(totalInvested * 3300)} USD`, icon: Wallet, bg: 'bg-[#7C5CFC]/10', text: 'text-[#7C5CFC]', valClass: 'text-white' },
                                    { label: 'Expected Returns', val: `${fmt(totalReturns)} ETH`, sub: `$${fmt(totalReturns * 3300)} USD`, icon: TrendingUp, bg: 'bg-[#22C55E]/10', text: 'text-[#22C55E]', valClass: 'text-[#22C55E]' },
                                    { label: 'Active Positions', val: activeCount.toString(), sub: activeCount === 0 ? 'No active investments' : activeCount === 1 ? '1 active position' : `${activeCount} active positions`, icon: Briefcase, bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]', valClass: 'text-white' },
                                    { label: 'Available Pools', val: pools.filter(p => p.status === 'open' || p.status === 'partially_funded').length.toString(), sub: 'Explore new opportunities', icon: Coins, bg: 'bg-[#7C5CFC]/10', text: 'text-[#7C5CFC]', valClass: 'text-white' },
                                ].map((stat, i) => {
                                    const Icon = stat.icon;
                                    return (
                                        <div key={i} className="card-stripe p-5 flex flex-col justify-between min-h-[125px] h-auto">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-extrabold text-[#A1A1AA] uppercase tracking-wider">{stat.label}</span>
                                                <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center ${stat.bg} ${stat.text}`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                            </div>
                                            <div>
                                                <div className={`text-[22px] font-black tracking-tight leading-none mb-1 ${stat.valClass}`}>{stat.val}</div>
                                                <p className="text-[11px] text-[#71717A] font-bold uppercase tracking-wide">{stat.sub}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Content Grid (Left 65%, Right 35%) */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                                {/* Left Panel (65%) */}
                                <div className="card-stripe p-5 lg:col-span-2 flex flex-col min-h-[280px]">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-sm font-extrabold text-white tracking-wider uppercase">Recent Investments</h3>
                                        <button onClick={() => setActiveNav('portfolio')} className="btn-stripe-outline px-4 py-2 text-xs font-bold text-[#A1A1AA] hover:text-white cursor-pointer">
                                            View All
                                        </button>
                                    </div>

                                    {investments.length === 0 ? (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                                            {/* Centered Folder Glass Illustration */}
                                            <svg width="140" height="120" viewBox="0 0 140 120" fill="none" className="mx-auto mb-6">
                                                <defs>
                                                    <filter id="purpleGlow" x="-20%" y="-20%" width="140%" height="140%">
                                                        <feGaussianBlur stdDeviation="10" result="blur" />
                                                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                                    </filter>
                                                </defs>
                                                <circle cx="70" cy="60" r="30" fill="#7C5CFC" opacity="0.15" filter="url(#purpleGlow)" />
                                                <path d="M20 30C20 24.4772 24.4772 20 30 20H55L65 32H110C115.523 32 120 36.4772 120 42V90C120 95.5228 115.523 100 110 100H30C24.4772 100 20 95.5228 20 90V30Z" fill="url(#folderGrad)" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />
                                                <path d="M20 42C20 38.6863 22.6863 36 26 36H114C117.314 36 120 38.6863 120 42V90C120 95.5228 115.523 100 110 100H30C24.4772 100 20 95.5228 20 90V42Z" fill="url(#frontFlapGrad)" opacity="0.9" />
                                                <g transform="translate(10, 10)">
                                                    <circle cx="75" cy="65" r="14" stroke="#9278FF" strokeWidth="2.5" fill="none" />
                                                    <path d="M85 75L98 88" stroke="#9278FF" strokeWidth="2.5" strokeLinecap="round" />
                                                </g>
                                                <linearGradient id="folderGrad" x1="20" y1="20" x2="120" y2="100">
                                                    <stop offset="0%" stopColor="#251b4f" />
                                                    <stop offset="100%" stopColor="#120e2e" />
                                                </linearGradient>
                                                <linearGradient id="frontFlapGrad" x1="20" y1="36" x2="120" y2="100">
                                                    <stop offset="0%" stopColor="#30246a" />
                                                    <stop offset="100%" stopColor="#18123b" />
                                                </linearGradient>
                                            </svg>

                                            <h4 className="text-base font-bold text-white mb-1.5">No active investments found.</h4>
                                            <p className="text-xs text-[#A1A1AA] max-w-xs mb-6">Start exploring invoice pools and make your first investment.</p>
                                            <button onClick={() => setActiveNav('invoices')} className="btn-stripe-grad px-5 py-2.5 text-white font-bold text-xs cursor-pointer shadow-lg shadow-[#7C5CFC]/15">
                                                Browse Invoices
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-4">
                                            {investments.slice(0, 4).map(inv => (
                                                <div key={inv.id} className="flex justify-between items-center py-3.5 border-b border-white/[0.04] last:border-0">
                                                    <div>
                                                        <p className="text-xs font-bold text-white">Pool #{inv.pool_id}</p>
                                                        <p className="text-[10px] text-[#71717A] font-semibold mt-0.5">{new Date(inv.invested_at).toLocaleDateString()}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-black text-white">{fmt(inv.amount)} ETH</p>
                                                        <p className="text-[10px] text-[#22C55E] font-bold mt-0.5">+{fmt(inv.expected_return)} return</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Right Panel (35%) */}
                                <div className="card-stripe p-5 flex flex-col gap-4">
                                    <h3 className="text-sm font-extrabold text-white tracking-wider uppercase">Quick Actions</h3>

                                    <div className="flex flex-col gap-3">
                                        {[
                                            { title: 'Browse Invoice Pools', desc: 'Explore and buy trade finance invoices', icon: Coins, target: 'invoices', bg: 'bg-[#7C5CFC]/10', text: 'text-[#7C5CFC]' },
                                            { title: 'View Portfolio', desc: 'Track your active investments & returns', icon: TrendingUp, target: 'portfolio', bg: 'bg-[#22C55E]/10', text: 'text-[#22C55E]' },
                                            { title: 'Transaction History', desc: 'View your all transactions', icon: History, target: 'transactions', bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]' },
                                            { title: 'Analytics', desc: 'View performance insights', icon: BarChart3, target: 'analytics', bg: 'bg-[#3B82F6]/10', text: 'text-[#3B82F6]' },
                                        ].map((act, i) => {
                                            const Icon = act.icon;
                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => setActiveNav(act.target)}
                                                    className="flex items-center justify-between p-4 border border-white/6 rounded-2xl hover:border-[#7C5CFC]/30 bg-transparent transition-all duration-200 text-left cursor-pointer group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${act.bg} ${act.text}`}>
                                                            <Icon className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-white group-hover:text-[#7C5CFC] transition-colors">{act.title}</p>
                                                            <p className="text-[10px] text-[#71717A] mt-0.5 font-semibold leading-none">{act.desc}</p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-[#71717A] group-hover:text-[#7C5CFC] group-hover:translate-x-0.5 transition-all" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ TAB: INVOICES / MARKETPLACE ═══ */}
                    {activeNav === 'invoices' && (
                        <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-140px)] min-h-0">

                            {/* Left Column: List */}
                            <div className="card-stripe w-full lg:w-80 flex flex-col shrink-0 overflow-hidden">
                                <div className="p-4 bg-[#101015] border-b border-white/6 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Invoice Pools</h3>
                                        <p className="text-[10px] text-[#71717A] font-semibold mt-0.5">{pools.length} available investments</p>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                                    {poolsLoading ? (
                                        <div className="flex justify-center items-center py-10">
                                            <div className="w-5 h-5 border-2 border-white/5 border-t-[#7C5CFC] rounded-full animate-spin" />
                                        </div>
                                    ) : pools.map(pool => {
                                        const sc = STATUS_COLORS[pool.status] || STATUS_COLORS.open;
                                        const pctFunded = pool.invoice_amount > 0 ? ((pool.funded_amount || 0) / pool.invoice_amount * 100) : 0;
                                        const active = selectedPool?.id === pool.id;

                                        return (
                                            <div
                                                key={pool.id}
                                                onClick={() => setSelectedPool(pool)}
                                                className={`p-3.5 rounded-xl cursor-pointer border transition-all duration-200 ${active
                                                    ? 'bg-[#7C5CFC]/5 border-[#7C5CFC]/30 shadow-md'
                                                    : 'bg-white/[0.01] border-white/4 hover:bg-white/[0.03] hover:border-white/8'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-center mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">{pool.logo || '📄'}</span>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold text-white truncate">{pool.company || pool.name}</p>
                                                            <p className="text-[10px] text-[#71717A] font-semibold truncate mt-0.5">{pool.industry}</p>
                                                        </div>
                                                    </div>
                                                    <span className="px-2 py-0.5 rounded-md text-[8px] font-bold tracking-wider uppercase border" style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}>{pool.status}</span>
                                                </div>

                                                <p className="text-sm font-extrabold text-white">{fmt(pool.invoice_amount)} ETH</p>

                                                <div className="h-1.5 bg-white/5 rounded-full mt-2.5 overflow-hidden">
                                                    <div className="h-full bg-[#7C5CFC] rounded-full" style={{ width: `${Math.min(pctFunded, 100)}%` }} />
                                                </div>

                                                <div className="flex justify-between mt-1.5 text-[9px] text-[#A1A1AA] font-bold">
                                                    <span>{fmt(pctFunded, 1)}% funded</span>
                                                    <span className="text-[#7C5CFC]">{pool.interest_rate}% APY</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Right Column: Detail */}
                            {selectedPool ? (
                                <div className="card-stripe flex-1 flex flex-col overflow-hidden min-w-0">
                                    {/* Header Detail */}
                                    <div className="p-6 bg-[#101015] border-b border-white/6 flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-xl bg-white/3 flex items-center justify-center text-2xl border border-white/6">{selectedPool.logo || '📄'}</div>
                                            <div>
                                                <h2 className="text-base font-extrabold text-white tracking-tight">{selectedPool.company || selectedPool.name}</h2>
                                                <p className="text-xs text-[#A1A1AA] font-semibold mt-0.5">{selectedPool.invoiceNo || `INV-${selectedPool.id}`} · {fmt(selectedPool.invoice_amount)} ETH · {selectedPool.interest_rate}% APY</p>
                                            </div>
                                        </div>
                                        {(() => {
                                            const sc = STATUS_COLORS[selectedPool.status] || STATUS_COLORS.open;
                                            return <span className="px-3 py-1 rounded-md text-xs font-bold border uppercase tracking-wider" style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}>{selectedPool.status}</span>;
                                        })()}
                                    </div>

                                    {/* Scroll content */}
                                    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                                        {selectedPool.description && (
                                            <div className="p-4 rounded-xl border border-white/6 bg-white/[0.01] border-l-2 border-l-[#7C5CFC]">
                                                <p className="text-xs text-[#A1A1AA] leading-relaxed font-medium">{selectedPool.description}</p>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {[
                                                { label: 'Invoice Size', value: `${fmt(selectedPool.invoice_amount)} ETH`, color: '#FFFFFF', bg: 'rgba(255,255,255,0.02)' },
                                                { label: 'Funded amount', value: `${fmt(selectedPool.funded_amount || 0)} ETH`, color: '#7C5CFC', bg: 'rgba(124,92,252,0.04)' },
                                                { label: 'Interest Rate', value: `${selectedPool.interest_rate}% APY`, color: '#22C55E', bg: 'rgba(34,197,94,0.03)' },
                                                { label: 'Risk Rating', value: selectedPool.risk_score ? RISK_LABELS(selectedPool.risk_score).label : 'Medium', color: selectedPool.risk_score ? RISK_LABELS(selectedPool.risk_score).color : '#A1A1AA', bg: 'rgba(255,255,255,0.02)' },
                                            ].map((s, i) => (
                                                <div key={i} className="p-4 rounded-xl border border-white/6 text-center" style={{ background: s.bg }}>
                                                    <span className="text-[9px] font-extrabold text-[#71717A] uppercase tracking-wider block mb-1.5">{s.label}</span>
                                                    <div className="text-sm font-black" style={{ color: s.color }}>{s.value}</div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="p-4 rounded-xl border border-white/6 bg-white/[0.01]">
                                            <div className="flex justify-between text-xs font-bold mb-2">
                                                <span className="text-white">Funding Progress</span>
                                                <span className="text-[#7C5CFC]">{fmt((selectedPool.funded_amount || 0) / (selectedPool.invoice_amount || 1) * 100, 1)}%</span>
                                            </div>
                                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-[#7C5CFC] to-[#6B48F5] rounded-full transition-all duration-500" style={{ width: `${Math.min((selectedPool.funded_amount || 0) / (selectedPool.invoice_amount || 1) * 100, 100)}%` }} />
                                            </div>
                                            <div className="flex justify-between text-[10px] text-[#A1A1AA] font-bold mt-2">
                                                <span>{fmt(selectedPool.funded_amount || 0)} ETH funded</span>
                                                <span>{fmt(Number(selectedPool.invoice_amount) - Number(selectedPool.funded_amount || 0))} ETH remaining</span>
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-xl border border-white/6 bg-white/[0.01]">
                                            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Invoice Specifications</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                                                {[
                                                    { label: 'Debtor Name', value: selectedPool.debtor || 'Undisclosed Exporter' },
                                                    { label: 'Exporter Country', value: selectedPool.country || 'N/A' },
                                                    { label: 'Repayment Date', value: selectedPool.due_date || 'TBD' },
                                                    { label: 'Tenure', value: selectedPool.tenure || 'N/A' },
                                                    { label: 'Contract Address', value: selectedPool.contract_address ? short(selectedPool.contract_address) : 'N/A', mono: true },
                                                    { label: 'Invoice ID', value: selectedPool.invoiceNo || 'N/A' },
                                                ].map((d, i) => (
                                                    <div key={i} className="flex justify-between py-2 border-b border-white/[0.04] last:border-0">
                                                        <span className="text-xs text-[#71717A] font-semibold">{d.label}</span>
                                                        <span className={`text-xs font-bold text-white ${d.mono ? 'font-mono' : ''}`}>{d.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {(selectedPool.status === 'open' || selectedPool.status === 'partially_funded') ? (
                                            !wallet.isConnected ? (
                                                <button onClick={wallet.connectWallet} className="btn-stripe-outline w-full py-3.5 text-white font-bold text-sm cursor-pointer flex items-center justify-center gap-2">
                                                    <Wallet className="w-4.5 h-4.5" />
                                                    Connect Wallet to Invest
                                                </button>
                                            ) : (
                                                <button onClick={() => setInvestModal(selectedPool)} className="btn-stripe-grad w-full py-3.5 text-white font-bold text-sm cursor-pointer shadow-lg shadow-[#7C5CFC]/20">
                                                    Invest in this Invoice →
                                                </button>
                                            )
                                        ) : (
                                            <div className="p-3 text-center rounded-xl bg-white/2 text-[#71717A] font-bold text-xs border border-white/6">
                                                {selectedPool.status === 'fully_funded' ? '✓ Fully Funded' : selectedPool.status === 'repaid' ? '✓ Repaid' : 'Pool Closed'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="card-stripe flex-1 flex flex-col items-center justify-center text-center p-8">
                                    <p className="text-[#71717A] text-xs font-bold uppercase tracking-wider">Select a pool to inspect details</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ TAB: PORTFOLIO ═══ */}
                    {activeNav === 'portfolio' && (
                        <div className="card-stripe p-6 overflow-hidden">
                            <h2 className="text-sm font-extrabold text-white tracking-wider uppercase mb-6">Active Positions</h2>
                            {investments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <p className="text-xs text-[#A1A1AA] font-bold mb-4">No active portfolio positions found.</p>
                                    <button onClick={() => setActiveNav('invoices')} className="btn-stripe-grad px-4 py-2.5 text-white font-bold text-xs cursor-pointer shadow-md">
                                        Browse Invoices
                                    </button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-white/8">
                                                <th className="py-3 px-2 text-[#71717A] font-bold uppercase tracking-wider">Target Pool</th>
                                                <th className="py-3 px-2 text-right text-[#71717A] font-bold uppercase tracking-wider">Principal Funding</th>
                                                <th className="py-3 px-2 text-right text-[#71717A] font-bold uppercase tracking-wider">Projected APY Returns</th>
                                                <th className="py-3 px-2 text-center text-[#71717A] font-bold uppercase tracking-wider">Status</th>
                                                <th className="py-3 px-2 text-right text-[#71717A] font-bold uppercase tracking-wider">Ledger Tx</th>
                                                <th className="py-3 px-2 text-right text-[#71717A] font-bold uppercase tracking-wider">Timestamp</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.04]">
                                            {investments.map(inv => (
                                                <tr key={inv.id} className="hover:bg-white/[0.01] transition-colors">
                                                    <td className="py-4 px-2 font-bold text-white">Pool #{inv.pool_id}</td>
                                                    <td className="py-4 px-2 text-right font-black text-white">{fmt(inv.amount)} ETH</td>
                                                    <td className="py-4 px-2 text-right font-bold text-[#22C55E]">+{fmt(inv.expected_return)} ETH</td>
                                                    <td className="py-4 px-2 text-center">
                                                        <span className="px-2 py-0.5 rounded-md text-[8px] font-bold bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] uppercase tracking-wider">{inv.status}</span>
                                                    </td>
                                                    <td className="py-4 px-2 text-right">
                                                        {inv.tx_hash ? (
                                                            <a href={`${POLYGON_AMOY.blockExplorerUrls[0]}tx/${inv.tx_hash}`} target="_blank" rel="noreferrer" className="text-[#7C5CFC] hover:underline font-mono text-[10px]">{short(inv.tx_hash)}</a>
                                                        ) : (
                                                            <span className="text-[#71717A]">—</span>
                                                        )}
                                                    </td>
                                                    <td className="py-4 px-2 text-right text-[#A1A1AA] font-bold">{new Date(inv.invested_at).toLocaleDateString()}</td>
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
                        <div className="card-stripe p-6 overflow-hidden">
                            <h2 className="text-sm font-extrabold text-white tracking-wider uppercase mb-6">On-Chain Transactions</h2>
                            {transactions.length === 0 ? (
                                <div className="py-12 text-center">
                                    <p className="text-xs text-[#71717A] font-bold">No transactions found.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-white/8">
                                                <th className="py-3 px-2 text-[#71717A] font-bold uppercase tracking-wider">Method</th>
                                                <th className="py-3 px-2 text-[#71717A] font-bold uppercase tracking-wider">Target</th>
                                                <th className="py-3 px-2 text-right text-[#71717A] font-bold uppercase tracking-wider">Amount</th>
                                                <th className="py-3 px-2 text-center text-[#71717A] font-bold uppercase tracking-wider">Receipt</th>
                                                <th className="py-3 px-2 text-right text-[#71717A] font-bold uppercase tracking-wider">Hash URL</th>
                                                <th className="py-3 px-2 text-right text-[#71717A] font-bold uppercase tracking-wider">Block Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.04]">
                                            {transactions.map(tx => (
                                                <tr key={tx.id} className="hover:bg-white/[0.01] transition-colors">
                                                    <td className="py-4 px-2">
                                                        <span className="px-2 py-0.5 rounded-md text-[8px] font-bold bg-[#7C5CFC]/10 border border-[#7C5CFC]/20 text-[#7C5CFC] uppercase tracking-wider">{tx.type}</span>
                                                    </td>
                                                    <td className="py-4 px-2 font-bold text-white">Pool #{tx.pool_id || '—'}</td>
                                                    <td className="py-4 px-2 text-right font-black text-white">{fmt(tx.amount)} ETH</td>
                                                    <td className="py-4 px-2 text-center">
                                                        <span className="px-2 py-0.5 rounded-md text-[8px] font-bold bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] uppercase tracking-wider">{tx.status}</span>
                                                    </td>
                                                    <td className="py-4 px-2 text-right">
                                                        {tx.tx_hash ? (
                                                            <a href={`${POLYGON_AMOY.blockExplorerUrls[0]}tx/${tx.tx_hash}`} target="_blank" rel="noreferrer" className="text-[#7C5CFC] hover:underline font-mono text-[10px]">{short(tx.tx_hash)}</a>
                                                        ) : (
                                                            <span className="text-[#71717A]">—</span>
                                                        )}
                                                    </td>
                                                    <td className="py-4 px-2 text-right text-[#A1A1AA] font-bold">{new Date(tx.created_at).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ TAB: ANALYTICS ═══ */}
                    {activeNav === 'analytics' && (
                        <div className="card-stripe p-6">
                            <h3 className="text-sm font-extrabold text-white tracking-wider uppercase mb-4">Analytics Overview</h3>
                            <p className="text-xs text-[#A1A1AA] leading-relaxed mb-6">Visual representation of your global export finance margins.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-4 rounded-xl border border-white/6 bg-white/[0.01]">
                                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Yield Analytics</h4>
                                    <div className="h-44 flex items-end gap-2.5 justify-around pt-6 px-4">
                                        {[45, 62, 55, 78, 90, 85, 95].map((h, i) => (
                                            <div key={i} className="flex-1 flex flex-col items-center">
                                                <div className="w-full bg-[#7C5CFC]/80 rounded-t-md hover:bg-[#9278FF] transition-colors" style={{ height: `${h}%` }} />
                                                <span className="text-[9px] text-[#71717A] font-bold mt-2">Pool #{i + 1}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl border border-white/6 bg-white/[0.01] flex flex-col justify-between">
                                    <div>
                                        <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Historical Yield Data</h4>
                                        <p className="text-[11px] text-[#A1A1AA] leading-relaxed">Transactions confirmed across Polygon Amoy networks are archived in on-chain block logs.</p>
                                    </div>
                                    <div className="pt-4 border-t border-white/[0.04] flex justify-between items-center text-xs font-bold text-white">
                                        <span>Average APY</span>
                                        <span className="text-[#22C55E]">
                                            {pools.length > 0
                                                ? `${(pools.reduce((s, p) => s + Number(p.interest_rate || 0), 0) / pools.length).toFixed(2)}%`
                                                : '0.00%'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ TAB: SETTINGS ═══ */}
                    {activeNav === 'settings' && (
                        <div className="card-stripe p-6 max-w-xl">
                            <h3 className="text-sm font-extrabold text-white tracking-wider uppercase mb-6">User Profiles & Settings</h3>

                            <div className="flex flex-col gap-5">
                                <div>
                                    <label className="text-[10px] font-extrabold text-[#A1A1AA] uppercase tracking-wider block mb-2">Connected Username</label>
                                    <input type="text" readOnly value={user?.email || 'investor@Invoicefi.io'} className="w-full p-3.5 rounded-xl border border-white/8 bg-white/2 text-white font-semibold text-xs outline-none" />
                                </div>

                                <div>
                                    <label className="text-[10px] font-extrabold text-[#A1A1AA] uppercase tracking-wider block mb-2">Identity UUID</label>
                                    <input type="text" readOnly value={user?.id || ''} className="w-full p-3.5 rounded-xl border border-white/8 bg-white/2 text-white font-mono text-[9px] outline-none" />
                                </div>
                            </div>
                        </div>
                    )}

                </main>
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
