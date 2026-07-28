/**
 * UploadInvoice — Module 2
 * Full invoice upload form with client-side validation.
 * On submit → calls exporterApi.uploadInvoice → shows InvoiceVerificationModal.
 */
import { useState } from 'react';
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { exporterApi } from '../../lib/api';
import InvoiceVerificationModal from './InvoiceVerificationModal';

const COUNTRIES = [
  'United States','United Kingdom','Germany','France','India','China','Japan',
  'Singapore','UAE','Saudi Arabia','Australia','Canada','Brazil','South Korea',
  'Netherlands','Italy','Spain','Switzerland','Hong Kong','Taiwan',
];
const CURRENCIES = [
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'INR', label: 'INR — Indian Rupee' },
  { code: 'AED', label: 'AED — UAE Dirham' },
  { code: 'SGD', label: 'SGD — Singapore Dollar' },
  { code: 'JPY', label: 'JPY — Japanese Yen' },
  { code: 'CNY', label: 'CNY — Chinese Yuan' },
];

const inputBase = {
  background: 'rgba(255,255,255,.05)',
  border: '1px solid rgba(255,255,255,.1)',
  borderRadius: 10, color: '#fff', fontSize: 14,
  padding: '10px 14px', outline: 'none',
  width: '100%', boxSizing: 'border-box',
  fontFamily: "'Inter',sans-serif",
  transition: 'border-color .2s, box-shadow .2s',
};

function FormField({ label, error, required, hint, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12.5, fontWeight: 600, color: error ? '#F87171' : '#A0A0A8', letterSpacing: '.2px' }}>
        {label}{required && <span style={{ color: '#7C5CFC', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {hint && !error && <span style={{ fontSize: 11, color: '#505058' }}>{hint}</span>}
      {error && <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#F87171' }}><AlertCircle size={11} /> {error}</div>}
    </div>
  );
}

export default function UploadInvoice() {
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    invoice_number: '', buyer_name: '', buyer_company: '',
    amount: '', currency: 'USD', issue_date: today,
    due_date: '', po_number: '', country: 'United States',
    description: '',
  });
  const [errors, setErrors]       = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError]   = useState('');
  const [verifyData, setVerifyData] = useState(null);
  const [blockchainHash, setBlockchainHash] = useState('');

  const set = (k) => (e) => {
    setForm((p) => ({ ...p, [k]: e.target.value }));
    setErrors((p) => ({ ...p, [k]: '' }));
    setApiError('');
  };

  const validate = () => {
    const e  = {};
    const numAmt = parseFloat(form.amount);

    if (!form.invoice_number.trim()) e.invoice_number = 'Required.';
    else if (!/^[a-zA-Z0-9_-]+$/.test(form.invoice_number.trim())) e.invoice_number = 'Only letters, numbers, - and _ allowed.';

    if (!form.buyer_name.trim())    e.buyer_name    = 'Required.';
    if (!form.buyer_company.trim()) e.buyer_company = 'Required.';

    if (!form.amount || isNaN(numAmt) || numAmt <= 0) e.amount = 'Must be a positive number.';

    if (!form.issue_date)  e.issue_date = 'Required.';
    else if (form.issue_date > today) e.issue_date = 'Issue date cannot be in the future.';

    if (!form.due_date)   e.due_date = 'Required.';
    else if (form.due_date <= form.issue_date) e.due_date = 'Due date must be after issue date.';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const result = await exporterApi.uploadInvoice({
        invoice_number: form.invoice_number.trim(),
        buyer_name:     form.buyer_name.trim(),
        buyer_company:  form.buyer_company.trim(),
        amount:         parseFloat(form.amount),
        currency:       form.currency,
        issue_date:     form.issue_date,
        due_date:       form.due_date,
        po_number:      form.po_number.trim(),
        country:        form.country,
        description:    form.description.trim(),
      });
      setBlockchainHash(result.blockchainHash || result.blockchain_hash || '');
      setVerifyData(result.invoice);
    } catch (err) {
      // Handle field-level errors from backend
      if (err?.errors) {
        const mapped = {};
        for (const [k, v] of Object.entries(err.errors)) {
          mapped[k] = Array.isArray(v) ? v[0] : v;
        }
        setErrors(mapped);
      } else {
        setApiError(err?.error || err?.message || 'Failed to upload invoice. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const is = (k) => ({
    ...inputBase,
    borderColor: errors[k] ? 'rgba(248,113,113,.5)' : 'rgba(255,255,255,.1)',
  });

  const focusBorder = (e) => e.target.style.boxShadow = '0 0 0 2px rgba(124,92,252,.25)';
  const blurBorder  = (e) => e.target.style.boxShadow = 'none';

  return (
    <>
      <InvoiceVerificationModal
        isOpen={!!verifyData}
        invoiceData={verifyData}
        blockchainHash={blockchainHash}
      />

      <div style={{ color: '#fff', fontFamily: "'Inter',sans-serif", maxWidth: 720 }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, letterSpacing: '-.5px' }}>Upload Invoice</h2>
          <p style={{ margin: 0, fontSize: 13.5, color: '#A0A0A8' }}>
            Submit an invoice for AI verification and blockchain hash generation.
          </p>
        </div>

        {apiError && (
          <div style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, color: '#F87171', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={15} /> {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Section 1: Invoice Info */}
            <div style={{ background: '#151518', border: '1px solid rgba(255,255,255,.07)', borderRadius: 18, padding: '22px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <FileText size={16} color="#7C5CFC" />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Invoice Information</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <FormField label="Invoice Number" error={errors.invoice_number} required hint="Unique ID, e.g. INV-2026-001">
                  <input value={form.invoice_number} onChange={set('invoice_number')} style={is('invoice_number')} onFocus={focusBorder} onBlur={blurBorder} placeholder="INV-2026-001" />
                </FormField>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <FormField label="Issue Date" error={errors.issue_date} required>
                    <input type="date" value={form.issue_date} onChange={set('issue_date')} max={today} style={is('issue_date')} onFocus={focusBorder} onBlur={blurBorder} />
                  </FormField>
                  <FormField label="Due Date" error={errors.due_date} required>
                    <input type="date" value={form.due_date} onChange={set('due_date')} style={is('due_date')} onFocus={focusBorder} onBlur={blurBorder} />
                  </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <FormField label="Amount" error={errors.amount} required>
                    <input type="number" step="0.01" min="0.01" value={form.amount} onChange={set('amount')} style={is('amount')} onFocus={focusBorder} onBlur={blurBorder} placeholder="e.g. 50000" />
                  </FormField>
                  <FormField label="Currency" error={errors.currency} required>
                    <select value={form.currency} onChange={set('currency')} style={{ ...is('currency'), cursor: 'pointer' }}>
                      {CURRENCIES.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}
                    </select>
                  </FormField>
                </div>
                <FormField label="PO Number" error={errors.po_number} hint="Optional">
                  <input value={form.po_number} onChange={set('po_number')} style={is('po_number')} onFocus={focusBorder} onBlur={blurBorder} placeholder="PO-12345 (optional)" />
                </FormField>
              </div>
            </div>

            {/* Section 2: Buyer Info */}
            <div style={{ background: '#151518', border: '1px solid rgba(255,255,255,.07)', borderRadius: 18, padding: '22px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <Upload size={16} color="#F59E0B" />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Buyer Details</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <FormField label="Buyer Name" error={errors.buyer_name} required>
                    <input value={form.buyer_name} onChange={set('buyer_name')} style={is('buyer_name')} onFocus={focusBorder} onBlur={blurBorder} placeholder="John Smith" />
                  </FormField>
                  <FormField label="Buyer Company" error={errors.buyer_company} required>
                    <input value={form.buyer_company} onChange={set('buyer_company')} style={is('buyer_company')} onFocus={focusBorder} onBlur={blurBorder} placeholder="Acme Corp Ltd" />
                  </FormField>
                </div>
                <FormField label="Buyer Country" error={errors.country}>
                  <select value={form.country} onChange={set('country')} style={{ ...is('country'), cursor: 'pointer' }}>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </FormField>
                <FormField label="Description" error={errors.description} hint="Max 500 characters. Describe the goods or services on this invoice.">
                  <textarea value={form.description} onChange={set('description')} rows={3}
                    style={{ ...is('description'), resize: 'vertical', lineHeight: 1.6 }} onFocus={focusBorder} onBlur={blurBorder}
                    placeholder="e.g. Export of electronic components to Acme Corp for Q3 production batch." maxLength={500} />
                </FormField>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={submitting} style={{
              height: 50, padding: '0 28px',
              background: submitting ? 'rgba(124,92,252,.4)' : 'linear-gradient(135deg,#7C5CFC,#6B48F5)',
              color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit',
              boxShadow: submitting ? 'none' : '0 4px 18px rgba(124,92,252,.4)',
              transition: 'all .2s', width: '100%', justifyContent: 'center',
            }}>
              {submitting
                ? <><Loader2 size={18} style={{ animation: 'uSpin 1s linear infinite' }} /> Uploading & Verifying…</>
                : <><Upload size={18} /> Upload Invoice</>
              }
            </button>
          </div>
        </form>
        <style>{`
          @keyframes uSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
          input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.6)}
          select option{background:#1A1A1F;color:#fff}
        `}</style>
      </div>
    </>
  );
}
