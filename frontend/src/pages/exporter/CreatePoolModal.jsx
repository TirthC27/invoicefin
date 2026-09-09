/**
 * CreatePoolModal — Module 5
 * Modal for creating an investment pool on a Verified invoice.
 * All validation mirrors backend rules exactly.
 */
import { useState } from 'react';
import { X, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { exporterApi } from '../../lib/api';

const INPUT_BASE = {
  background: 'var(--bg-card, #fff)',
  border: '1px solid var(--border, #e2e0da)',
  borderRadius: 10, color: 'var(--fg-primary, #1a1a1f)', fontSize: 14,
  padding: '10px 14px', outline: 'none',
  width: '100%', boxSizing: 'border-box',
  fontFamily: "'Inter',sans-serif",
  transition: 'border-color .2s',
};

function Field({ label, error, hint, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12.5, fontWeight: 600, color: error ? 'var(--color-negative)' : 'var(--fg-muted)', letterSpacing: '.2px' }}>
        {label} <span style={{ color: 'var(--color-accent-strong)' }}>*</span>
      </label>
      {children}
      {hint && !error && <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{hint}</span>}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--color-negative)' }}>
          <AlertCircle size={11} /> {error}
        </div>
      )}
    </div>
  );
}

export default function CreatePoolModal({ invoice, onClose, onSuccess }) {
  const [form, setForm] = useState({
    pool_size: String(invoice?.amount ?? ''),
    expected_roi: '',
    funding_deadline: '',
    min_investment: '',
    max_investment: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const set = (k) => (e) => {
    setForm((p) => ({ ...p, [k]: e.target.value }));
    setErrors((p) => ({ ...p, [k]: '' }));
    setApiError('');
  };

  const validate = () => {
    const e = {};
    const ps = parseFloat(form.pool_size);
    const roi = parseFloat(form.expected_roi);
    const min = parseFloat(form.min_investment);
    const max = parseFloat(form.max_investment);
    const inv = parseFloat(invoice?.amount ?? 0);

    if (!form.pool_size || isNaN(ps) || ps <= 0) e.pool_size = 'Must be a positive number.';
    else if (ps > inv) e.pool_size = `Cannot exceed invoice amount (${inv}).`;

    if (!form.expected_roi || isNaN(roi)) e.expected_roi = 'Required.';
    else if (roi < 0.1 || roi > 50) e.expected_roi = 'Must be between 0.1% and 50%.';

    if (!form.funding_deadline) e.funding_deadline = 'Required.';
    else if (form.funding_deadline >= invoice.due_date) e.funding_deadline = `Must be before invoice due date (${invoice.due_date}).`;
    else if (form.funding_deadline <= new Date().toISOString().slice(0, 10)) e.funding_deadline = 'Must be in the future.';

    if (!form.min_investment || isNaN(min) || min <= 0) e.min_investment = 'Must be a positive number.';
    if (!form.max_investment || isNaN(max) || max <= 0) e.max_investment = 'Must be a positive number.';
    else if (!isNaN(ps) && max > ps) e.max_investment = 'Cannot exceed pool size.';
    if (!isNaN(min) && !isNaN(max) && min >= max) e.min_investment = 'Must be less than max investment.';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const result = await exporterApi.createPool(invoice.id, {
        pool_size: parseFloat(form.pool_size),
        expected_roi: parseFloat(form.expected_roi),
        funding_deadline: form.funding_deadline,
        min_investment: parseFloat(form.min_investment),
        max_investment: parseFloat(form.max_investment),
      });
      onSuccess(result);
    } catch (err) {
      const msg = err?.errors ? Object.values(err.errors).flat().join(' ') : (err?.error || err?.message || 'Failed to create pool. Please try again.');
      setApiError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = (k) => ({
    ...INPUT_BASE,
    borderColor: errors[k] ? 'rgba(220,38,38,.5)' : 'var(--border, #e2e0da)',
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
      padding: 20,
    }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: '100%', maxWidth: 520, background: '#ffffff',
        border: '1px solid rgba(0,0,0,0.08)', borderRadius: 24,
        padding: '32px 28px', color: '#111111', fontFamily: "'Inter',sans-serif",
        boxShadow: '0 24px 60px rgba(0,0,0,.15)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={18} color="#111111" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111111' }}>Create Investment Pool</h3>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>{invoice?.invoice_number} — {invoice?.currency} {Number(invoice?.amount).toLocaleString()}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.08)', borderRadius: 8, color: 'rgba(0,0,0,0.6)', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {apiError && (
          <div style={{ background: 'rgba(220,38,38,.08)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 18, color: '#dc2626', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={14} /> {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Pool Size" error={errors.pool_size} hint={`Max: ${invoice?.currency} ${Number(invoice?.amount).toLocaleString()}`}>
                <input type="number" step="0.01" min="0.01"
                  value={form.pool_size} onChange={set('pool_size')}
                  style={inputStyle('pool_size')}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(0,0,0,.35)'}
                  onBlur={(e) => e.target.style.borderColor = errors.pool_size ? 'rgba(220,38,38,.5)' : 'rgba(0,0,0,.12)'}
                />
              </Field>
              <Field label="Expected ROI (%)" error={errors.expected_roi} hint="0.1% – 50%">
                <input type="number" step="0.1" min="0.1" max="50"
                  value={form.expected_roi} onChange={set('expected_roi')}
                  placeholder="e.g. 12.5"
                  style={inputStyle('expected_roi')}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(0,0,0,.35)'}
                  onBlur={(e) => e.target.style.borderColor = errors.expected_roi ? 'rgba(220,38,38,.5)' : 'rgba(0,0,0,.12)'}
                />
              </Field>
            </div>

            <Field label="Funding Deadline" error={errors.funding_deadline} hint={`Must be before invoice due date (${invoice?.due_date})`}>
              <input type="date"
                value={form.funding_deadline} onChange={set('funding_deadline')}
                style={{ ...inputStyle('funding_deadline') }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(0,0,0,.35)'}
                onBlur={(e) => e.target.style.borderColor = errors.funding_deadline ? 'rgba(220,38,38,.5)' : 'rgba(0,0,0,.12)'}
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Min Investment" error={errors.min_investment}>
                <input type="number" step="0.01" min="0.01"
                  value={form.min_investment} onChange={set('min_investment')}
                  placeholder="e.g. 500"
                  style={inputStyle('min_investment')}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(0,0,0,.35)'}
                  onBlur={(e) => e.target.style.borderColor = errors.min_investment ? 'rgba(220,38,38,.5)' : 'rgba(0,0,0,.12)'}
                />
              </Field>
              <Field label="Max Investment" error={errors.max_investment}>
                <input type="number" step="0.01" min="0.01"
                  value={form.max_investment} onChange={set('max_investment')}
                  placeholder="e.g. 10000"
                  style={inputStyle('max_investment')}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(0,0,0,.35)'}
                  onBlur={(e) => e.target.style.borderColor = errors.max_investment ? 'rgba(220,38,38,.5)' : 'rgba(0,0,0,.12)'}
                />
              </Field>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 26, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ height: 42, padding: '0 20px', background: 'rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.12)', borderRadius: 12, color: '#111111', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} style={{
              height: 42, padding: '0 24px',
              background: submitting ? 'rgba(0,0,0,.4)' : '#111111',
              color: '#ffffff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit',
              boxShadow: '0 4px 14px rgba(0,0,0,.15)',
            }}>
              {submitting
                ? <><Loader2 size={16} style={{ animation: 'vcSpin 1s linear infinite' }} /> Creating…</>
                : <><TrendingUp size={16} /> Create Pool</>
              }
            </button>
          </div>
        </form>

        <style>{`
          @keyframes vcSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
          input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.6)}
        `}</style>
      </div>
    </div>
  );
}
