import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Upload, FileText, X, AlertCircle, CheckCircle2,
  DollarSign, Calendar, Building2, Hash, Globe, FileUp,
} from 'lucide-react';
import { invoiceService } from '../lib/invoiceService';
import InvoiceVerificationModal from '../components/InvoiceVerificationModal';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AED', 'SGD', 'JPY', 'CNY'];
const COUNTRIES   = [
  'United States','United Kingdom','Germany','France','Singapore','India',
  'United Arab Emirates','China','Japan','Australia','Canada','Brazil',
  'Saudi Arabia','South Africa','Mexico','Netherlands','Italy','Spain',
  'South Korea','Switzerland',
];

const INVOICE_NUM_RE = /^[a-zA-Z0-9_-]+$/;
const AMOUNT_RE      = /^\d+(\.\d{1,2})?$/;

const EMPTY = {
  invoiceNumber:'', buyerName:'', buyerCompany:'',
  amount:'', currency:'USD',
  issueDate:'', dueDate:'',
  poNumber:'', country:'United States',
  description:'', file: null,
};

function Field({ label, required, error, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <label style={{ fontSize:13, fontWeight:600, color: error ? '#F87171' : '#C0C0C8', letterSpacing:'.2px' }}>
        {label}{required && <span style={{ color:'#7C5CFC', marginLeft:2 }}>*</span>}
      </label>
      {children}
      {error && (
        <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'#F87171', marginTop:2 }}>
          <AlertCircle size={12}/> {error}
        </div>
      )}
    </div>
  );
}

const INPUT_BASE = {
  background:'rgba(255,255,255,.04)',
  border:'1px solid rgba(255,255,255,.1)',
  borderRadius:10, color:'#fff',
  fontSize:14, padding:'10px 14px',
  outline:'none', width:'100%', boxSizing:'border-box',
  fontFamily:"'Inter',sans-serif",
  transition:'border-color .2s, box-shadow .2s',
};
const INPUT_ERR = { borderColor:'rgba(248,113,113,.5)', background:'rgba(248,113,113,.04)' };

export default function UploadInvoice() {
  const [form, setForm]           = useState({ ...EMPTY });
  const [errors, setErrors]       = useState({});
  const [isDirty, setIsDirty]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]         = useState(null);   // { type:'error'|'success', msg }
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ invoice: null, hash: '' });
  const [dragOver, setDragOver]   = useState(false);
  const navigate = useNavigate();

  // ── Field change ───────────────────────────────────────────
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setIsDirty(true);
    setErrors((p) => ({ ...p, [name]: '' }));
  }, []);

  const handleFile = useCallback((file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setErrors((p) => ({ ...p, file: 'Only PDF files are accepted.' })); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrors((p) => ({ ...p, file: 'File must be under 10 MB.' })); return;
    }
    setForm((p) => ({ ...p, file }));
    setIsDirty(true);
    setErrors((p) => ({ ...p, file: '' }));
  }, []);

  // ── Validation ─────────────────────────────────────────────
  const validate = () => {
    const e = {};
    const today = new Date(); today.setHours(0, 0, 0, 0);

    if (!form.invoiceNumber.trim())            e.invoiceNumber = 'This field is required.';
    else if (!INVOICE_NUM_RE.test(form.invoiceNumber)) e.invoiceNumber = 'Only letters, numbers, - and _ are allowed.';

    if (!form.buyerName.trim())    e.buyerName    = 'This field is required.';
    if (!form.buyerCompany.trim()) e.buyerCompany = 'This field is required.';

    if (!form.amount)              e.amount = 'This field is required.';
    else if (!AMOUNT_RE.test(form.amount) || parseFloat(form.amount) <= 0) e.amount = 'Enter a valid positive amount (max 2 decimals).';

    if (!form.issueDate)           e.issueDate = 'This field is required.';
    else if (new Date(form.issueDate) > today) e.issueDate = 'Issue date cannot be in the future.';

    if (!form.dueDate)             e.dueDate = 'This field is required.';
    else if (form.issueDate && new Date(form.dueDate) <= new Date(form.issueDate)) e.dueDate = 'Due date must be strictly after issue date.';

    if (!form.file)                e.file = 'An invoice PDF is required before submitting.';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await invoiceService.uploadInvoice({ ...form });
      if (res.success) {
        setModalData({ invoice: res.invoice, hash: res.blockchainHash });
        setShowModal(true);
      } else {
        setToast({ type: 'error', msg: res.message || 'Upload failed. Please try again.' });
      }
    } catch (err) {
      setToast({ type: 'error', msg: err.message || 'Unexpected error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Cancel ─────────────────────────────────────────────────
  const handleCancel = () => {
    if (isDirty && !window.confirm('Discard changes and go back?')) return;
    navigate('/exporter/dashboard');
  };

  const inputStyle = (name) => ({ ...INPUT_BASE, ...(errors[name] ? INPUT_ERR : {}) });

  return (
    <div style={{ background:'#0B0B0F', color:'#fff', minHeight:'100vh', fontFamily:"'Inter',sans-serif" }}>
      {/* Nav */}
      <header style={{
        position:'sticky', top:0, zIndex:50,
        background:'rgba(11,11,15,.85)', backdropFilter:'blur(16px)',
        borderBottom:'1px solid rgba(255,255,255,.08)',
        padding:'0 32px', height:70,
        display:'flex', alignItems:'center', gap:16,
      }}>
        <Link to="/exporter/dashboard" style={{ display:'flex', alignItems:'center', gap:6, color:'#A0A0A8', textDecoration:'none', fontSize:13 }}>
          <ArrowLeft size={16}/> Dashboard
        </Link>
        <div style={{ width:1, height:16, background:'rgba(255,255,255,.1)' }} />
        <span style={{ fontSize:18, fontWeight:700, letterSpacing:'-.3px', display:'flex', alignItems:'center', gap:8 }}>
          <Upload size={20} color="#7C5CFC"/> Upload Invoice
        </span>
      </header>

      <main style={{ maxWidth:800, margin:'0 auto', padding:'40px 24px 80px' }}>
        {/* Heading */}
        <div style={{ marginBottom:32 }}>
          <h2 style={{ fontSize:26, fontWeight:800, letterSpacing:'-.7px', margin:'0 0 6px' }}>New Export Invoice</h2>
          <p style={{ color:'#A0A0A8', fontSize:14, margin:0 }}>
            Submit your invoice for AI verification and on-chain financing pool creation.
          </p>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{
            display:'flex', alignItems:'center', gap:10, padding:'12px 16px',
            borderRadius:12, marginBottom:24, fontSize:13.5, fontWeight:500,
            background: toast.type === 'error' ? 'rgba(248,113,113,.12)' : 'rgba(34,197,94,.12)',
            border: `1px solid ${toast.type==='error' ? 'rgba(248,113,113,.3)' : 'rgba(34,197,94,.3)'}`,
            color: toast.type === 'error' ? '#F87171' : '#22C55E',
          }}>
            {toast.type === 'error' ? <AlertCircle size={16}/> : <CheckCircle2 size={16}/>}
            {toast.msg}
            <button onClick={() => setToast(null)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'inherit', padding:0 }}>
              <X size={15}/>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>

            {/* ── Section: Invoice Details ── */}
            <SectionHead icon={<Hash size={16}/>} title="Invoice Details"/>
            <div style={{ background:'#151518', border:'1px solid rgba(255,255,255,.08)', borderRadius:16, padding:24, marginBottom:20 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
                <Field label="Invoice Number" required error={errors.invoiceNumber}>
                  <input id="invoiceNumber" name="invoiceNumber" value={form.invoiceNumber}
                    onChange={handleChange} placeholder="e.g. INV-2026-009"
                    style={inputStyle('invoiceNumber')}
                    onFocus={(e)=>e.target.style.borderColor='rgba(124,92,252,.6)'}
                    onBlur={(e)=>e.target.style.borderColor=errors.invoiceNumber?'rgba(248,113,113,.5)':'rgba(255,255,255,.1)'}
                  />
                </Field>
                <Field label="Purchase Order Number" error={errors.poNumber}>
                  <input id="poNumber" name="poNumber" value={form.poNumber}
                    onChange={handleChange} placeholder="Optional"
                    style={inputStyle('poNumber')}
                    onFocus={(e)=>e.target.style.borderColor='rgba(124,92,252,.6)'}
                    onBlur={(e)=>e.target.style.borderColor='rgba(255,255,255,.1)'}
                  />
                </Field>
              </div>
            </div>

            {/* ── Section: Buyer Info ── */}
            <SectionHead icon={<Building2 size={16}/>} title="Buyer Information"/>
            <div style={{ background:'#151518', border:'1px solid rgba(255,255,255,.08)', borderRadius:16, padding:24, marginBottom:20 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
                <Field label="Buyer Name" required error={errors.buyerName}>
                  <input id="buyerName" name="buyerName" value={form.buyerName}
                    onChange={handleChange} placeholder="e.g. John Smith"
                    style={inputStyle('buyerName')}
                    onFocus={(e)=>e.target.style.borderColor='rgba(124,92,252,.6)'}
                    onBlur={(e)=>e.target.style.borderColor=errors.buyerName?'rgba(248,113,113,.5)':'rgba(255,255,255,.1)'}
                  />
                </Field>
                <Field label="Buyer Company" required error={errors.buyerCompany}>
                  <input id="buyerCompany" name="buyerCompany" value={form.buyerCompany}
                    onChange={handleChange} placeholder="e.g. Acme Corp Ltd"
                    style={inputStyle('buyerCompany')}
                    onFocus={(e)=>e.target.style.borderColor='rgba(124,92,252,.6)'}
                    onBlur={(e)=>e.target.style.borderColor=errors.buyerCompany?'rgba(248,113,113,.5)':'rgba(255,255,255,.1)'}
                  />
                </Field>
              </div>
            </div>

            {/* ── Section: Amount & Currency ── */}
            <SectionHead icon={<DollarSign size={16}/>} title="Financial Details"/>
            <div style={{ background:'#151518', border:'1px solid rgba(255,255,255,.08)', borderRadius:16, padding:24, marginBottom:20 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:18 }}>
                <Field label="Invoice Amount" required error={errors.amount}>
                  <input id="amount" name="amount" type="number" step="0.01" min="0.01"
                    value={form.amount} onChange={handleChange} placeholder="e.g. 45000"
                    style={inputStyle('amount')}
                    onFocus={(e)=>e.target.style.borderColor='rgba(124,92,252,.6)'}
                    onBlur={(e)=>e.target.style.borderColor=errors.amount?'rgba(248,113,113,.5)':'rgba(255,255,255,.1)'}
                  />
                </Field>
                <Field label="Currency" required error={errors.currency}>
                  <select id="currency" name="currency" value={form.currency} onChange={handleChange}
                    style={{ ...inputStyle('currency'), cursor:'pointer' }}>
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Buyer Country" required error={errors.country}>
                <select id="country" name="country" value={form.country} onChange={handleChange}
                  style={{ ...inputStyle('country'), cursor:'pointer' }}>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>

            {/* ── Section: Dates ── */}
            <SectionHead icon={<Calendar size={16}/>} title="Dates"/>
            <div style={{ background:'#151518', border:'1px solid rgba(255,255,255,.08)', borderRadius:16, padding:24, marginBottom:20 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
                <Field label="Issue Date" required error={errors.issueDate}>
                  <input id="issueDate" name="issueDate" type="date" value={form.issueDate}
                    onChange={handleChange}
                    style={inputStyle('issueDate')}
                    onFocus={(e)=>e.target.style.borderColor='rgba(124,92,252,.6)'}
                    onBlur={(e)=>e.target.style.borderColor=errors.issueDate?'rgba(248,113,113,.5)':'rgba(255,255,255,.1)'}
                  />
                </Field>
                <Field label="Due Date" required error={errors.dueDate}>
                  <input id="dueDate" name="dueDate" type="date" value={form.dueDate}
                    onChange={handleChange}
                    style={inputStyle('dueDate')}
                    onFocus={(e)=>e.target.style.borderColor='rgba(124,92,252,.6)'}
                    onBlur={(e)=>e.target.style.borderColor=errors.dueDate?'rgba(248,113,113,.5)':'rgba(255,255,255,.1)'}
                  />
                </Field>
              </div>
            </div>

            {/* ── Section: Additional ── */}
            <SectionHead icon={<FileText size={16}/>} title="Additional Details"/>
            <div style={{ background:'#151518', border:'1px solid rgba(255,255,255,.08)', borderRadius:16, padding:24, marginBottom:20 }}>
              <Field label="Description" error={errors.description}>
                <textarea id="description" name="description" value={form.description}
                  onChange={(e) => {
                    if (e.target.value.length > 500) return;
                    handleChange(e);
                  }}
                  placeholder="Brief description of goods or services (max 500 characters)"
                  rows={4}
                  style={{ ...inputStyle('description'), resize:'vertical', minHeight:90 }}
                  onFocus={(e)=>e.target.style.borderColor='rgba(124,92,252,.6)'}
                  onBlur={(e)=>e.target.style.borderColor='rgba(255,255,255,.1)'}
                />
                <div style={{ fontSize:11, color:'#606068', textAlign:'right', marginTop:3 }}>
                  {form.description.length}/500
                </div>
              </Field>
            </div>

            {/* ── Section: File Upload ── */}
            <SectionHead icon={<FileUp size={16}/>} title="Invoice PDF"/>
            <div style={{ marginBottom:28 }}>
              <div
                id="pdf-drop-zone"
                onClick={() => document.getElementById('pdfInput').click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                style={{
                  background: dragOver ? 'rgba(124,92,252,.08)' : 'rgba(255,255,255,.02)',
                  border: `2px dashed ${errors.file ? 'rgba(248,113,113,.5)' : dragOver ? '#7C5CFC' : 'rgba(255,255,255,.14)'}`,
                  borderRadius:16, padding:'28px 20px',
                  textAlign:'center', cursor:'pointer',
                  transition:'all .25s',
                }}
              >
                <input id="pdfInput" type="file" accept=".pdf" style={{ display:'none' }}
                  onChange={(e) => handleFile(e.target.files[0])} />
                {form.file ? (
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12 }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:'rgba(34,197,94,.12)', border:'1px solid rgba(34,197,94,.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <CheckCircle2 size={22} color="#22C55E"/>
                    </div>
                    <div style={{ textAlign:'left' }}>
                      <div style={{ fontWeight:600, color:'#22C55E', fontSize:14 }}>{form.file.name}</div>
                      <div style={{ fontSize:12, color:'#707078' }}>{(form.file.size / 1024).toFixed(1)} KB — PDF ready</div>
                    </div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setForm((p) => ({ ...p, file: null })); }}
                      style={{ marginLeft:8, background:'rgba(248,113,113,.12)', border:'1px solid rgba(248,113,113,.3)', borderRadius:8, color:'#F87171', padding:'4px 8px', cursor:'pointer', fontSize:12 }}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ width:48, height:48, borderRadius:12, background:'rgba(124,92,252,.1)', border:'1px solid rgba(124,92,252,.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                      <FileUp size={22} color="#7C5CFC"/>
                    </div>
                    <p style={{ margin:'0 0 4px', fontSize:14, fontWeight:600, color:'#D0D0D8' }}>
                      Drop your PDF here, or <span style={{ color:'#7C5CFC' }}>browse</span>
                    </p>
                    <p style={{ margin:0, fontSize:12, color:'#707078' }}>Accepts .pdf only — max 10 MB</p>
                  </div>
                )}
              </div>
              {errors.file && (
                <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'#F87171', marginTop:6 }}>
                  <AlertCircle size={12}/> {errors.file}
                </div>
              )}
            </div>

            {/* ── Actions ── */}
            <div style={{ display:'flex', gap:12, justifyContent:'flex-end' }}>
              <button type="button" id="cancel-upload-btn" onClick={handleCancel}
                style={{
                  height:44, padding:'0 24px',
                  background:'rgba(255,255,255,.05)',
                  border:'1px solid rgba(255,255,255,.12)',
                  borderRadius:12, color:'#A0A0A8', fontSize:14, fontWeight:600, cursor:'pointer',
                  transition:'background .2s, color .2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background='rgba(255,255,255,.09)'; e.currentTarget.style.color='#fff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background='rgba(255,255,255,.05)'; e.currentTarget.style.color='#A0A0A8'; }}
              >
                Cancel
              </button>
              <button type="submit" id="submit-upload-btn" disabled={submitting}
                style={{
                  height:44, padding:'0 28px',
                  background: submitting ? 'rgba(124,92,252,.4)' : 'linear-gradient(135deg,#7C5CFC,#6B48F5)',
                  color:'#fff', border:'none', borderRadius:12,
                  fontSize:14, fontWeight:600, cursor: submitting ? 'not-allowed' : 'pointer',
                  display:'flex', alignItems:'center', gap:8,
                  boxShadow:'0 4px 14px rgba(124,92,252,.35)',
                  transition:'transform .2s, box-shadow .2s',
                }}
                onMouseEnter={(e) => { if (!submitting) { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(124,92,252,.45)'; }}}
                onMouseLeave={(e) => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 14px rgba(124,92,252,.35)'; }}
              >
                {submitting ? (
                  <><span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'vcSpin 1s linear infinite', display:'inline-block' }} /> Uploading…</>
                ) : (
                  <><Upload size={16}/> Upload Invoice</>
                )}
              </button>
            </div>
          </div>
        </form>
      </main>

      {/* Verification Modal (Module 3) */}
      <InvoiceVerificationModal
        isOpen={showModal}
        invoiceData={modalData.invoice}
        blockchainHash={modalData.hash}
      />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes vcSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.6)}
        select option{background:#1E1E24;color:#fff}
      `}</style>
    </div>
  );
}

function SectionHead({ icon, title }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
      <span style={{ color:'#7C5CFC' }}>{icon}</span>
      <span style={{ fontSize:13, fontWeight:700, color:'#A0A0A8', textTransform:'uppercase', letterSpacing:'.6px' }}>{title}</span>
    </div>
  );
}
