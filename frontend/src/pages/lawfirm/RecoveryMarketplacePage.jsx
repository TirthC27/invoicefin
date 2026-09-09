import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/useAuth';
import { Scale, Clock, Trophy, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';

function BidCountdown({ deadline, onExpired }) {
  const [display, setDisplay] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!deadline) { setDisplay('No deadline'); return; }
    const tick = () => {
      const diff = new Date(deadline) - Date.now();
      if (diff <= 0) { setDisplay('Auction Ended'); setExpired(true); onExpired?.(); return; }
      const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
      if (h > 0) setDisplay(`${h}h ${m}m ${s}s`);
      else if (m > 0) setDisplay(`${m}m ${s}s`);
      else setDisplay(`${s}s`);
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [deadline]);

  return (
    <span style={{ fontWeight: 700, fontSize: 13, color: expired ? 'var(--color-negative)' : '#d97706', display: 'flex', alignItems: 'center', gap: 6 }}>
      <Clock size={13} /> {display}
    </span>
  );
}

function BidModal({ caseData, lawFirmName, onClose, onSuccess }) {
  const { session } = useAuth();
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const token = session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}/recovery/cases/${caseData.id}/bid/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bid_amount: amount, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place bid.');
      onSuccess(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '32px', maxWidth: 460, width: '100%', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Place Your Bid</div>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Bidding as <strong style={{ color: 'var(--color-positive)' }}>{lawFirmName}</strong> on Case #{caseData.id}</div>
        </div>

        <div style={{ background: 'rgba(201,64,64,0.05)', border: '1px solid rgba(201,64,64,0.15)', borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 4 }}>Outstanding Amount</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-negative)' }}>{Number(caseData.outstanding_amount).toFixed(4)} MATIC</div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>Your bid is what you'll pay the pool. Higher bid = more likely to win.</div>
        </div>

        {caseData.highest_bid && (
          <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#d97706' }}>
            <Trophy size={13} style={{ display: 'inline', marginRight: 6 }} />
            Current highest bid: <strong>{Number(caseData.highest_bid).toFixed(4)} MATIC</strong>
          </div>
        )}

        {error && <div style={{ background: 'rgba(201,64,64,0.07)', border: '1px solid rgba(201,64,64,0.2)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--color-negative)', fontSize: 13, marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Your Bid Amount (MATIC)</label>
            <input className="form-input" type="number" step="0.0001" min="0.0001" max={caseData.outstanding_amount}
              value={amount} onChange={e => setAmount(e.target.value)} required
              placeholder={`Max: ${Number(caseData.outstanding_amount).toFixed(4)}`} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label className="form-label">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Brief description of your firm's approach..."
              style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--fg-primary)', fontSize: 14, padding: '10px 14px', outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 2, justifyContent: 'center', background: '#111111', color: '#ffffff', borderColor: '#111111', fontWeight: 700 }}>
              {loading ? 'Placing Bid...' : 'Place Bid'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PriorityBadge({ priority }) {
  const colors = { HIGH: '#e0e0e0', CRITICAL: '#ffffff', MEDIUM: '#cccccc', LOW: '#aaaaaa' };
  const color = colors[priority] || '#6b7280';
  return <span style={{ padding: '3px 10px', borderRadius: 50, fontSize: 11, fontWeight: 600, background: `${color}15`, color, border: `1px solid ${color}30` }}>{priority}</span>;
}

export default function RecoveryMarketplacePage() {
  const { session, user } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);
  const [toast, setToast] = useState(null);
  const [expandedCase, setExpandedCase] = useState(null);

  const fetchCases = useCallback(async () => {
    try {
      const token = session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}/recovery/open-cases/`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) setCases(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [session]);

  useEffect(() => { fetchCases(); const i = setInterval(fetchCases, 15000); return () => clearInterval(i); }, [fetchCases]);

  const handleBidSuccess = (bidData) => {
    setSelectedCase(null);
    setToast({ message: `Bid of ${Number(bidData.bid_amount).toFixed(4)} MATIC placed!` });
    setTimeout(() => setToast(null), 4000);
    fetchCases();
  };

  const lawFirmName = user?.full_name || user?.email || 'Your Firm';

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Recovery Marketplace</h1>
          <p>Open-bid auction for defaulted investment cases. Highest bidder wins and takes the case.</p>
        </div>
        <button onClick={fetchCases} className="btn btn-outline"><RefreshCw size={14} /> Refresh</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--fg-muted)' }}>Loading cases...</div>
      ) : cases.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--fg-muted)' }}>
          <Scale size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--fg-secondary)' }}>No Open Cases</div>
          <div style={{ fontSize: 13 }}>Defaulted investment cases will appear here when investors default.</div>
        </div>
      ) : (
        cases.map((c, idx) => (
          <div key={c.id} className="data-card" style={{ marginBottom: 16, animation: `fadeIn 0.3s ease ${idx * 0.05}s both` }}>
            <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', flexWrap: 'wrap' }}
              onClick={() => setExpandedCase(expandedCase === c.id ? null : c.id)}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Case #{c.id}</div>
                  <PriorityBadge priority={c.priority} />
                  {c.bid_deadline_passed && <span style={{ padding: '2px 8px', borderRadius: 50, fontSize: 11, fontWeight: 600, background: 'rgba(239,68,68,0.1)', color: '#dc2626' }}>Auction Ended</span>}
                </div>
                <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{c.pool_name || `Pool #${c.contract_pool_id}`}</div>
              </div>

              <div style={{ textAlign: 'right', marginRight: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 4 }}>Outstanding</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-negative)' }}>{Number(c.outstanding_amount).toFixed(4)} MATIC</div>
              </div>

              <div style={{ textAlign: 'center', minWidth: 120 }}>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 4 }}>Auction Closes In</div>
                <BidCountdown deadline={c.bid_deadline} onExpired={fetchCases} />
              </div>

              <div style={{ color: 'var(--fg-muted)' }}>{expandedCase === c.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</div>
            </div>

            {expandedCase === c.id && (
              <div style={{ padding: '0 22px 20px' }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Highest Bid', value: c.highest_bid ? `${Number(c.highest_bid).toFixed(4)} MATIC` : 'No bids yet', color: 'var(--color-positive)' },
                    { label: 'Total Bidders', value: c.bids.length },
                  ].map(s => (
                    <div key={s.label} style={{ flex: 1, minWidth: 140, background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: s.color || 'var(--fg-primary)' }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {c.bids.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live Bids (Highest → Lowest)</div>
                    {c.bids.map((bid, i) => (
                      <div key={bid.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: i === 0 ? 'rgba(0,0,0,0.04)' : 'var(--bg-muted)', border: `1px solid ${i === 0 ? 'rgba(0,0,0,0.12)' : 'var(--border)'}`, marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {i === 0 && <Trophy size={13} color="#111111" />}
                          {i > 0 && <span style={{ fontSize: 12, color: 'var(--fg-muted)', width: 20, textAlign: 'center' }}>#{i + 1}</span>}
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{bid.law_firm_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{bid.law_firm_country}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: i === 0 ? '#111111' : 'var(--fg-primary)' }}>{Number(bid.bid_amount).toFixed(4)} MATIC</div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" disabled={c.bid_deadline_passed} onClick={() => setSelectedCase(c)}
                    style={{ background: '#111111', color: '#ffffff', borderColor: '#111111', fontWeight: 700 }}>
                    {c.bid_deadline_passed ? 'Auction Closed' : c.bids.some(b => b.law_firm_name === lawFirmName) ? 'Update My Bid' : 'Place Bid'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}

      {selectedCase && <BidModal caseData={selectedCase} lawFirmName={lawFirmName} onClose={() => setSelectedCase(null)} onSuccess={handleBidSuccess} />}

      {toast && (
        <div style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 9999, padding: '16px 24px', background: 'var(--bg-card)', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', fontSize: 14, fontWeight: 600, color: '#111111', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Scale size={16} /> {toast.message}
        </div>
      )}
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; } }`}</style>
    </>
  );
}
