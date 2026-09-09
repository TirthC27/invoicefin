import React, { useEffect, useState, useRef } from 'react';
import { investorApi } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { Clock, TrendingUp, CheckCircle2, ChevronRight } from 'lucide-react';

const POLL_INTERVAL = 10000;

const STATUS_STYLES = {
  active:    { bg: 'rgba(59,130,246,0.08)', color: '#2563eb', label: 'Active' },
  confirmed: { bg: 'rgba(59,130,246,0.08)', color: '#2563eb', label: 'Confirmed' },
  completed: { bg: 'rgba(0,0,0,0.06)',  color: '#111111', label: 'Completed' },
  overdue:   { bg: 'rgba(245,158,11,0.08)', color: '#d97706', label: 'Overdue' },
  defaulted: { bg: 'rgba(239,68,68,0.08)',  color: '#dc2626', label: 'Defaulted' },
};

function Countdown({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate) - Date.now();
      setIsUrgent(diff > 0 && diff < 86400000 * 3);
      if (diff <= 0) { setTimeLeft('Due'); return; }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      if (days > 0) setTimeLeft(`${days}d ${hours}h`);
      else if (hours > 0) setTimeLeft(`${hours}h ${mins}m`);
      else if (mins > 0) setTimeLeft(`${mins}m ${secs}s`);
      else setTimeLeft(`${secs}s`);
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <span style={{
      color: timeLeft === 'Due' ? 'var(--color-negative)' : isUrgent ? '#d97706' : 'var(--fg-muted)',
      fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4
    }}>
      <Clock size={13} /> {timeLeft}
    </span>
  );
}

function LiveYield({ amount, apy, confirmedAt }) {
  const [earned, setEarned] = useState(0);
  useEffect(() => {
    if (!amount || !apy || !confirmedAt) return;
    const amountNum = Number(amount);
    const apyNum = Number(apy) / 100;
    const startMs = new Date(confirmedAt).getTime();
    const YEAR_MS = 365 * 24 * 3600 * 1000;
    const yieldPerMs = (amountNum * apyNum) / YEAR_MS;
    const tick = () => setEarned(yieldPerMs * (Date.now() - startMs));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [amount, apy, confirmedAt]);

  return (
    <span style={{ color: 'var(--color-positive)', fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>
      +{earned.toFixed(8)} MATIC
    </span>
  );
}

export default function PortfolioPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const prevInvestmentsRef = useRef(null);
  const navigate = useNavigate();
  const intervalRef = useRef(null);

  const fetchData = async () => {
    try {
      const result = await investorApi.getPortfolio();
      if (prevInvestmentsRef.current && result.investments) {
        for (const inv of result.investments) {
          const prev = prevInvestmentsRef.current.find(p => p.id === inv.id);
          if (prev && prev.status === 'active' && inv.status === 'completed') {
            setToast({ type: 'return', pool: inv.pool_name || `Pool #${inv.pool}`, profit: Number(inv.expected_profit).toFixed(6) });
            setTimeout(() => setToast(null), 5000);
          }
        }
      }
      prevInvestmentsRef.current = result.investments;
      setData(result);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, []);

  const investments = data?.investments || [];
  const p = data?.portfolio || {};

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 80, color: 'var(--fg-muted)' }}>
      <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--color-accent-strong)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      Loading portfolio...
    </div>
  );

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Portfolio</h1>
          <p>Track your investments, returns, and recovery status</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Invested', value: `${Number(p.total_invested || 0).toFixed(4)} MATIC` },
          { label: 'Current Value', value: `${Number(p.current_value || 0).toFixed(4)} MATIC`, accent: 'var(--color-investor)' },
          { label: 'Total Profit',  value: `+${Number(p.total_profit || 0).toFixed(4)} MATIC`, accent: 'var(--color-positive)' },
          { label: 'Pending Returns', value: `${Number(p.pending_returns || 0).toFixed(4)} MATIC`, accent: '#d97706' },
        ].map(card => (
          <div key={card.label} className="metric-card">
            <div className="metric-card-label" style={{ marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: card.accent || 'var(--fg-primary)', fontFamily: 'monospace' }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      {investments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--fg-muted)' }}>
          <TrendingUp size={40} style={{ marginBottom: 12, opacity: 0.3, margin: '0 auto 12px' }} />
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: 'var(--fg-secondary)' }}>No investments yet</p>
          <p style={{ fontSize: 13 }}>Browse pools and start investing to build your portfolio.</p>
        </div>
      ) : (
        <div className="data-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pool</th><th>Amount</th><th>Yield Earned (Live)</th>
                  <th>Expected Profit</th><th>ROI</th><th>Status</th>
                  <th>Returns Due</th><th>Recovery</th>
                </tr>
              </thead>
              <tbody>
                {investments.map(inv => {
                  const st = STATUS_STYLES[inv.status] || STATUS_STYLES.active;
                  return (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: 600 }}>{inv.pool_name || `Pool #${inv.pool}`}</td>
                      <td style={{ fontFamily: 'monospace' }}>{Number(inv.amount).toFixed(4)} MATIC</td>
                      <td>
                        {['active', 'confirmed'].includes(inv.status) && inv.confirmed_at ? (
                          <LiveYield amount={inv.amount} apy={inv.pool_apy} confirmedAt={inv.confirmed_at} />
                        ) : (
                          <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--color-positive)', fontWeight: 600 }}>+{Number(inv.expected_profit).toFixed(4)}</td>
                      <td style={{ fontWeight: 600 }}>{Number(inv.roi).toFixed(1)}%</td>
                      <td>
                        <span style={{ padding: '3px 10px', borderRadius: 50, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </td>
                      <td>
                        {inv.returns_due_at ? <Countdown targetDate={inv.returns_due_at} /> : <span style={{ color: 'var(--fg-muted)' }}>—</span>}
                      </td>
                      <td>
                        {inv.recovery ? (
                          <button onClick={() => navigate('/investor/recovery')}
                            style={{ background: 'none', border: 'none', color: 'var(--color-accent-fg)', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                            {inv.recovery.recovery_stage} <ChevronRight size={12} />
                          </button>
                        ) : inv.status === 'defaulted' ? (
                          <span style={{ color: 'var(--color-negative)', fontSize: 12 }}>Pending</span>
                        ) : (
                          <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Return Toast */}
      <AnimatePresence>
        {toast && (
          <Motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20 }}
            style={{
              position: 'fixed', bottom: 32, right: 32, zIndex: 9999,
              padding: '20px 28px', background: 'var(--bg-card)',
              border: '1px solid rgba(0,0,0,0.12)', borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: 14,
            }}>
            <CheckCircle2 size={28} color="var(--color-positive)" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Return Received!</div>
              <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
                {toast.pool}: <span style={{ color: 'var(--color-positive)', fontWeight: 600 }}>+{toast.profit} MATIC</span>
              </div>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
