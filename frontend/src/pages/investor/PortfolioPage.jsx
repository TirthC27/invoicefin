import React, { useEffect, useState, useRef } from 'react';
import { investorApi } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, TrendingUp, AlertTriangle, Shield, CheckCircle2, ChevronRight } from 'lucide-react';

const POLL_INTERVAL = 10000;

const STATUS_STYLES = {
  active:    { bg: 'rgba(59,130,246,0.08)', color: '#3B82F6', label: 'Active' },
  confirmed: { bg: 'rgba(59,130,246,0.08)', color: '#3B82F6', label: 'Confirmed' },
  completed: { bg: 'rgba(34,197,94,0.08)', color: '#22C55E', label: 'Completed' },
  overdue:   { bg: 'rgba(245,158,11,0.08)', color: '#F59E0B', label: 'Overdue' },
  defaulted: { bg: 'rgba(239,68,68,0.08)', color: '#EF4444', label: 'Defaulted' },
};

function Countdown({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate) - Date.now();
      if (diff <= 0) { setTimeLeft('Due'); return; }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      if (days > 0) setTimeLeft(`${days}d ${hours}h`);
      else if (hours > 0) setTimeLeft(`${hours}h ${mins}m`);
      else setTimeLeft(`${mins}m`);
    };
    calc();
    const interval = setInterval(calc, 60000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const isUrgent = new Date(targetDate) - Date.now() < 86400000 * 3;
  return (
    <span style={{ color: timeLeft === 'Due' ? '#EF4444' : isUrgent ? '#F59E0B' : '#A0A0A8', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
      <Clock size={14} /> {timeLeft}
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
      // Detect status changes for auto-return animation (Module 9)
      if (prevInvestmentsRef.current && result.investments) {
        for (const inv of result.investments) {
          const prev = prevInvestmentsRef.current.find(p => p.id === inv.id);
          if (prev && prev.status === 'active' && inv.status === 'completed') {
            setToast({
              type: 'return',
              pool: inv.pool_name || `Pool #${inv.pool}`,
              profit: Number(inv.expected_profit).toFixed(6),
            });
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

  if (loading) return <div style={{ textAlign: 'center', padding: 80, color: '#A0A0A8' }}>Loading portfolio...</div>;

  return (
    <>
      <style>{`
        .pf-title { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 8px; }
        .pf-subtitle { font-size: 14px; color: #A0A0A8; margin-bottom: 28px; }
        .pf-summary { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-bottom: 28px; }
        .pf-summary-card { background: #151518; border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 18px; }
        .pf-summary-label { font-size: 11px; color: #A0A0A8; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 500; margin-bottom: 4px; }
        .pf-summary-val { font-size: 18px; font-weight: 800; }
        .pf-table-wrap { background: #151518; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; overflow: hidden; }
        .pf-table { width: 100%; border-collapse: collapse; }
        .pf-table th { padding: 14px 18px; text-align: left; font-size: 11px; color: #A0A0A8; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(0,0,0,0.2); }
        .pf-table td { padding: 14px 18px; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,0.03); }
        .pf-table tr:last-child td { border-bottom: none; }
        .pf-table tr:hover td { background: rgba(124,92,252,0.03); }
        .pf-status { padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
        .pf-recovery-link { color: #7C5CFC; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 4px; }
        .pf-recovery-link:hover { text-decoration: underline; }
        .pf-toast { position: fixed; bottom: 32px; right: 32px; z-index: 9999; padding: 20px 28px; background: #151518; border: 1px solid rgba(34,197,94,0.3); border-radius: 16px; box-shadow: 0 16px 48px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 14px; }
        .pf-empty { text-align: center; padding: 60px 20px; color: #A0A0A8; }
      `}</style>

      <h1 className="pf-title">Portfolio</h1>
      <p className="pf-subtitle">Track your investments, returns, and recovery status</p>

      <div className="pf-summary">
        <div className="pf-summary-card">
          <div className="pf-summary-label">Total Invested</div>
          <div className="pf-summary-val">{Number(p.total_invested || 0).toFixed(4)} ETH</div>
        </div>
        <div className="pf-summary-card">
          <div className="pf-summary-label">Current Value</div>
          <div className="pf-summary-val" style={{ color: '#7C5CFC' }}>{Number(p.current_value || 0).toFixed(4)} ETH</div>
        </div>
        <div className="pf-summary-card">
          <div className="pf-summary-label">Total Profit</div>
          <div className="pf-summary-val" style={{ color: '#22C55E' }}>+{Number(p.total_profit || 0).toFixed(4)} ETH</div>
        </div>
        <div className="pf-summary-card">
          <div className="pf-summary-label">Pending Returns</div>
          <div className="pf-summary-val" style={{ color: '#F59E0B' }}>{Number(p.pending_returns || 0).toFixed(4)} ETH</div>
        </div>
      </div>

      {investments.length === 0 ? (
        <div className="pf-empty">
          <TrendingUp size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No investments yet</p>
          <p style={{ fontSize: 13 }}>Browse pools and start investing to build your portfolio.</p>
        </div>
      ) : (
        <div className="pf-table-wrap">
          <table className="pf-table">
            <thead>
              <tr>
                <th>Pool</th>
                <th>Amount</th>
                <th>Expected Profit</th>
                <th>ROI</th>
                <th>Status</th>
                <th>Returns Due</th>
                <th>Recovery</th>
              </tr>
            </thead>
            <tbody>
              {investments.map(inv => {
                const st = STATUS_STYLES[inv.status] || STATUS_STYLES.active;
                return (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 600 }}>{inv.pool_name || `Pool #${inv.pool}`}</td>
                    <td>{Number(inv.amount).toFixed(4)} ETH</td>
                    <td style={{ color: '#22C55E' }}>+{Number(inv.expected_profit).toFixed(4)}</td>
                    <td style={{ color: '#7C5CFC' }}>{Number(inv.roi).toFixed(1)}%</td>
                    <td>
                      <span className="pf-status" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    </td>
                    <td>
                      {inv.returns_due_at ? <Countdown targetDate={inv.returns_due_at} /> : <span style={{ color: '#A0A0A8' }}>—</span>}
                    </td>
                    <td>
                      {inv.recovery ? (
                        <span className="pf-recovery-link" onClick={() => navigate('/investor/recovery')}>
                          {inv.recovery.recovery_stage} <ChevronRight size={12} />
                        </span>
                      ) : inv.status === 'defaulted' ? (
                        <span style={{ color: '#EF4444', fontSize: 12 }}>Pending</span>
                      ) : (
                        <span style={{ color: '#A0A0A8', fontSize: 12 }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Auto-return toast animation (Module 9) */}
      <AnimatePresence>
        {toast && (
          <motion.div className="pf-toast"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20 }}>
            <CheckCircle2 size={28} color="#22C55E" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Return Received!</div>
              <div style={{ fontSize: 13, color: '#A0A0A8' }}>{toast.pool}: <span style={{ color: '#22C55E', fontWeight: 600 }}>+{toast.profit} ETH</span></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
