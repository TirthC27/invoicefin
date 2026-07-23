/**
 * InvoiceDetailPage — Module 4
 * Full invoice details with:
 *  - Blockchain hash (copy button)
 *  - Live countdown timer (Module 7) for Active/Funded invoices
 *  - Create Investment Pool button → Modal (Module 5) for Verified invoices
 *  - Auto-mature call when countdown hits zero (Module 8 frontend side)
 *  - Activity history feed
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
  ShieldCheck, Copy, CheckCircle2, Clock, DollarSign,
  Calendar, Building2, FileText, Hash, Globe,
  Activity, TrendingUp, Plus, AlertCircle,
} from 'lucide-react';
import { exporterApi } from '../../lib/api';
import { STATUS_COLOR, useCountdown, fmtAmount, timeAgo, StatusBadge } from './exporterUtils';
import CreatePoolModal from './CreatePoolModal';

function CopyHash({ hash }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(hash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={copy} style={{
      background: copied ? 'rgba(34,197,94,.1)' : 'rgba(255,255,255,.05)',
      border: `1px solid ${copied ? 'rgba(34,197,94,.3)' : 'rgba(255,255,255,.1)'}`,
      borderRadius: 8, color: copied ? '#22C55E' : '#A0A0A8',
      padding: '5px 10px', cursor: 'pointer', fontSize: 12,
      display: 'flex', alignItems: 'center', gap: 5, transition: 'all .2s',
      fontFamily: "'Inter',sans-serif",
    }}>
      {copied ? <><CheckCircle2 size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
    </button>
  );
}

function CountdownBadge({ dueDate, onExpire }) {
  const { display, expired } = useCountdown(dueDate, onExpire);
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      background: expired ? 'rgba(239,68,68,.1)' : 'rgba(34,197,94,.1)',
      border: `1px solid ${expired ? 'rgba(239,68,68,.3)' : 'rgba(34,197,94,.3)'}`,
      borderRadius: 10, padding: '8px 14px',
    }}>
      <Clock size={14} color={expired ? '#EF4444' : '#22C55E'} />
      <span style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: expired ? '#EF4444' : '#22C55E' }}>
        {expired ? 'MATURED' : display}
      </span>
      {!expired && <span style={{ fontSize: 11, color: '#A0A0A8' }}>remaining</span>}
    </div>
  );
}

function InfoCard({ icon, label, value, valueColor, bold, mono }) {
  return (
    <div style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#606068', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: mono ? 12 : 15, fontWeight: bold ? 800 : 500, color: valueColor || '#E0E0E8', letterSpacing: bold ? '-.3px' : 0, fontFamily: mono ? 'monospace' : 'inherit', wordBreak: mono ? 'break-all' : 'normal' }}>
        {value || '—'}
      </div>
    </div>
  );
}

const ACTION_ICON = {
  uploaded:     <Plus size={13} />,
  verified:     <ShieldCheck size={13} />,
  pool_created: <TrendingUp size={13} />,
  funded:       <DollarSign size={13} />,
  matured:      <CheckCircle2 size={13} />,
  status_changed: <Activity size={13} />,
};
const ACTION_COLOR = {
  uploaded:     '#7C5CFC',
  verified:     '#3B82F6',
  pool_created: '#8B5CF6',
  funded:       '#22C55E',
  matured:      '#14B8A6',
  status_changed: '#A0A0A8',
};

export default function InvoiceDetailPage() {
  const { id }              = useParams();
  const { state }           = useLocation();
  const [invoice, setInvoice]   = useState(state?.invoice ?? null);
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(!state?.invoice);
  const [error, setError]       = useState('');
  const [showPool, setShowPool] = useState(false);
  const [toast, setToast]       = useState('');

  const fetchInvoice = useCallback(async () => {
    try {
      const data = await exporterApi.getInvoice(id);
      setInvoice(data.invoice);
      setHistory(data.history || []);
    } catch (err) {
      setError(err?.error || 'Failed to load invoice.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!state?.invoice) { fetchInvoice(); return; }
    // If we arrived via navigation state, still load history from API
    exporterApi.getInvoice(id)
      .then((data) => { setInvoice(data.invoice); setHistory(data.history || []); })
      .catch(() => {}); // silently keep state invoice on error
  }, [id, state, fetchInvoice]);

  // Module 8 — when countdown expires, call mature endpoint
  const handleExpire = useCallback(async () => {
    if (!invoice || invoice.status === 'Completed') return;
    setInvoice((prev) => ({ ...prev, status: 'Completed' })); // optimistic
    try {
      const updated = await exporterApi.matureInvoice(invoice.id);
      setInvoice(updated);
      setToast('Invoice matured and marked Completed.');
      setTimeout(() => setToast(''), 4000);
    } catch {
      // Backend already matured it or error — reload
      fetchInvoice();
    }
  }, [invoice, fetchInvoice]);

  const handlePoolSuccess = ({ invoice: updatedInv }) => {
    setInvoice(updatedInv);
    setShowPool(false);
    setToast('Investment Pool created! Now visible to investors.');
    setTimeout(() => setToast(''), 5000);
    fetchInvoice(); // refresh history
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div style={{ textAlign: 'center', color: '#A0A0A8' }}>
        <div style={{ width: 36, height: 36, border: '3px solid rgba(124,92,252,.2)', borderTopColor: '#7C5CFC', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 14, margin: 0 }}>Loading invoice…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (error || !invoice) return (
    <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 14, padding: '20px 24px', color: '#F87171', display: 'flex', alignItems: 'center', gap: 10 }}>
      <AlertCircle size={18} /> {error || 'Invoice not found.'}
    </div>
  );

  const hasPool    = !!invoice.pool;
  const isCountable = ['Funded', 'Active'].includes(invoice.status);
  const color      = STATUS_COLOR[invoice.status] || '#A0A0A8';

  return (
    <div style={{ color: '#fff', fontFamily: "'Inter',sans-serif" }}>
      {/* Toast */}
      {toast && (
        <div style={{ background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.3)', borderRadius: 12, padding: '10px 16px', marginBottom: 20, color: '#22C55E', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={15} /> {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-.5px' }}>{invoice.invoice_number}</h1>
            <StatusBadge status={invoice.status} />
          </div>
          <p style={{ margin: 0, fontSize: 14, color: '#A0A0A8' }}>
            {invoice.buyer_company} · Uploaded {timeAgo(invoice.created_at)}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {isCountable && (
            <CountdownBadge dueDate={invoice.due_date} onExpire={handleExpire} />
          )}
          {invoice.status === 'Verified' && !hasPool && (
            <button
              id="create-pool-btn"
              onClick={() => setShowPool(true)}
              style={{
                height: 42, padding: '0 20px',
                background: 'linear-gradient(135deg,#7C5CFC,#6B48F5)',
                color: '#fff', border: 'none', borderRadius: 12, fontSize: 14,
                fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: '0 4px 14px rgba(124,92,252,.35)', fontFamily: 'inherit',
              }}
            >
              <TrendingUp size={16} /> Create Investment Pool
            </button>
          )}
        </div>
      </div>

      {/* Blockchain hash banner */}
      {invoice.blockchain_hash && (
        <div style={{
          background: 'linear-gradient(135deg,rgba(34,197,94,.06),rgba(124,92,252,.06))',
          border: '1px solid rgba(34,197,94,.2)', borderRadius: 16,
          padding: '16px 20px', marginBottom: 24,
          display: 'flex', alignItems: 'flex-start', gap: 14,
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldCheck size={20} color="#22C55E" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#22C55E', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
              <CheckCircle2 size={13} /> Verified on Polygon Amoy (simulated)
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 11.5, color: '#A0A0A8', wordBreak: 'break-all', lineHeight: 1.6 }}>
              {invoice.blockchain_hash}
            </div>
          </div>
          <CopyHash hash={invoice.blockchain_hash} />
        </div>
      )}

      {/* Info grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 20 }}>
        <InfoCard icon={<Hash size={13} />}     label="Invoice #"     value={invoice.invoice_number} />
        <InfoCard icon={<DollarSign size={13} />} label="Amount"     value={fmtAmount(invoice.amount, invoice.currency)} valueColor="#22C55E" bold />
        <InfoCard icon={<Building2 size={13} />} label="Buyer"       value={`${invoice.buyer_name} — ${invoice.buyer_company}`} />
        <InfoCard icon={<Globe size={13} />}     label="Country"     value={invoice.country} />
        <InfoCard icon={<Calendar size={13} />}  label="Issue Date"  value={invoice.issue_date} />
        <InfoCard icon={<Calendar size={13} />}  label="Due Date"    value={invoice.due_date} />
        {invoice.po_number && <InfoCard icon={<FileText size={13} />} label="PO Number" value={invoice.po_number} />}
        <InfoCard icon={<Activity size={13} />}  label="Funded"      value={fmtAmount(invoice.funded_amount || 0, invoice.currency)} valueColor={invoice.funded_amount > 0 ? '#22C55E' : '#A0A0A8'} />
      </div>

      {/* Funding progress */}
      {['Funding','Funded','Active','Completed'].includes(invoice.status) && (
        <div style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,.07)', borderRadius: 16, padding: '18px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#A0A0A8', textTransform: 'uppercase', letterSpacing: '.5px' }}>Funding Progress</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#7C5CFC' }}>{invoice.funding_percent ?? 0}%</span>
          </div>
          <div style={{ height: 12, borderRadius: 99, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.07)', padding: 2, boxSizing: 'border-box' }}>
            <div style={{
              height: '100%', width: `${Math.min(100, invoice.funding_percent ?? 0)}%`,
              borderRadius: 99, background: 'linear-gradient(90deg,#7C5CFC,#22C55E)',
              boxShadow: '0 0 10px rgba(124,92,252,.3)', transition: 'width .6s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: '#606068' }}>
            <span>Raised: {fmtAmount(invoice.funded_amount || 0, invoice.currency)}</span>
            <span>Target: {fmtAmount(invoice.amount, invoice.currency)}</span>
          </div>
        </div>
      )}

      {/* Pool details / Create Pool CTA */}
      {hasPool ? (
        <div style={{ background: 'linear-gradient(135deg,rgba(124,92,252,.07),rgba(139,92,246,.05))', border: '1px solid rgba(124,92,252,.2)', borderRadius: 16, padding: '20px 22px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <TrendingUp size={16} color="#7C5CFC" />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Investment Pool</h3>
            <span style={{ fontSize: 11, background: 'rgba(34,197,94,.12)', color: '#22C55E', border: '1px solid rgba(34,197,94,.25)', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
              Visible to Investors
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 }}>
            {[
              { label: 'Pool Size',        value: fmtAmount(invoice.pool.pool_size, invoice.currency) },
              { label: 'Expected ROI',     value: `${invoice.pool.expected_roi}%` },
              { label: 'Funding Deadline', value: invoice.pool.funding_deadline },
              { label: 'Min Investment',   value: fmtAmount(invoice.pool.min_investment, invoice.currency) },
              { label: 'Max Investment',   value: fmtAmount(invoice.pool.max_investment, invoice.currency) },
              { label: 'Pool Status',      value: invoice.pool.status },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: '#606068', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#E0E0E8' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      ) : invoice.status === 'Verified' ? (
        <div style={{ background: 'rgba(124,92,252,.05)', border: '1px dashed rgba(124,92,252,.25)', borderRadius: 16, padding: '22px 20px', marginBottom: 20, textAlign: 'center' }}>
          <TrendingUp size={28} color="#7C5CFC" style={{ marginBottom: 10 }} />
          <p style={{ margin: '0 0 14px', fontSize: 14, color: '#A0A0A8' }}>
            This invoice is verified. Create an investment pool to open it to investors.
          </p>
          <button onClick={() => setShowPool(true)} style={{
            height: 40, padding: '0 20px',
            background: 'linear-gradient(135deg,#7C5CFC,#6B48F5)',
            color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit',
          }}>
            <Plus size={16} /> Create Investment Pool
          </button>
        </div>
      ) : null}

      {/* Description */}
      {invoice.description && (
        <div style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,.07)', borderRadius: 16, padding: '18px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: '#606068', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Description</div>
          <p style={{ margin: 0, color: '#D0D0D8', fontSize: 14, lineHeight: 1.7 }}>{invoice.description}</p>
        </div>
      )}

      {/* Activity history */}
      {history.length > 0 && (
        <div style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,.07)', borderRadius: 16, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
            <Activity size={15} color="#7C5CFC" />
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Activity History</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {history.map((h) => {
              const col = ACTION_COLOR[h.action_type] || '#A0A0A8';
              return (
                <div key={h.id} style={{ display: 'flex', gap: 12, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: `${col}22`, color: col, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {ACTION_ICON[h.action_type] || <Activity size={12} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 3px', fontSize: 13, color: '#D0D0D8', lineHeight: 1.4 }}>{h.description}</p>
                    <span style={{ fontSize: 11, color: '#505058' }}>{timeAgo(h.timestamp)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Pool Modal */}
      {showPool && (
        <CreatePoolModal
          invoice={invoice}
          onClose={() => setShowPool(false)}
          onSuccess={handlePoolSuccess}
        />
      )}
    </div>
  );
}
