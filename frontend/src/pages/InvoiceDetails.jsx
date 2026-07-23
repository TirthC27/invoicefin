import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import {
  ArrowLeft, ShieldCheck, ExternalLink, DollarSign,
  Calendar, Building2, FileText, Hash, Globe, CheckCircle2,
  Clock, Activity,
} from 'lucide-react';
import { invoiceService } from '../lib/invoiceService';

const STATUS_COLOR = {
  Draft:     '#6B7280',
  Verified:  '#3B82F6',
  Funding:   '#8B5CF6',
  Funded:    '#EC4899',
  Active:    '#7C5CFC',
  Completed: '#22C55E',
};

export default function InvoiceDetails() {
  const { id } = useParams();
  const { state } = useLocation();
  const [invoice, setInvoice] = useState(state?.invoice ?? null);
  const [loading, setLoading] = useState(!state?.invoice);

  useEffect(() => {
    if (state?.invoice) { setInvoice(state.invoice); return; }
    invoiceService.getInvoiceById(id)
      .then(setInvoice)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, state]);

  if (loading || !invoice) {
    return (
      <div style={{ minHeight:'100vh', background:'#0B0B0F', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center', color:'#A0A0A8', fontFamily:"'Inter',sans-serif" }}>
          <div style={{ width:40, height:40, border:'3px solid rgba(124,92,252,.2)', borderTopColor:'#7C5CFC', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto 14px' }} />
          <p style={{ fontSize:14, margin:0 }}>Loading invoice…</p>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const hash = state?.blockchainHash || invoice.blockchainHash;
  const color = STATUS_COLOR[invoice.status] || '#A0A0A8';

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
        <span style={{ fontSize:17, fontWeight:700, letterSpacing:'-.3px' }}>
          Invoice {invoice.invoiceNumber}
        </span>
        <div style={{ marginLeft:'auto' }}>
          <span style={{
            padding:'5px 14px', borderRadius:20, fontSize:13, fontWeight:700,
            background:`${color}22`, color,
            border:`1px solid ${color}44`,
          }}>
            {invoice.status}
          </span>
        </div>
      </header>

      <main style={{ maxWidth:860, margin:'0 auto', padding:'40px 24px 80px' }}>

        {/* ── Blockchain hash banner ── */}
        {hash && (
          <div style={{
            background:'linear-gradient(135deg,rgba(34,197,94,.08),rgba(124,92,252,.08))',
            border:'1px solid rgba(34,197,94,.22)',
            borderRadius:16, padding:'16px 20px', marginBottom:28,
            display:'flex', alignItems:'flex-start', gap:14,
          }}>
            <div style={{ width:40, height:40, borderRadius:10, background:'rgba(34,197,94,.12)', border:'1px solid rgba(34,197,94,.25)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <ShieldCheck size={20} color="#22C55E"/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#22C55E', marginBottom:5, display:'flex', alignItems:'center', gap:6 }}>
                <CheckCircle2 size={14}/> Verified on Polygon Amoy (simulated)
              </div>
              <div style={{ fontSize:11.5, fontFamily:'monospace', color:'#A0A0A8', wordBreak:'break-all', lineHeight:1.6 }}>
                {hash}
              </div>
            </div>
            <button
              style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:8, color:'#A0A0A8', padding:'6px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:12, flexShrink:0 }}
              onClick={() => navigator.clipboard.writeText(hash)}
            >
              <ExternalLink size={12}/> Copy
            </button>
          </div>
        )}

        {/* ── Details grid ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:24 }}>
          <InfoCard icon={<Hash size={16}/>} label="Invoice Number"   value={invoice.invoiceNumber}/>
          <InfoCard icon={<DollarSign size={16}/>} label="Amount"     value={`${invoice.currency} ${Number(invoice.amount).toLocaleString()}`} valueColor="#22C55E" bold/>
          <InfoCard icon={<Building2 size={16}/>} label="Buyer"       value={`${invoice.buyerName} — ${invoice.buyerCompany}`}/>
          <InfoCard icon={<Globe size={16}/>} label="Country"         value={invoice.country}/>
          <InfoCard icon={<Calendar size={16}/>} label="Issue Date"   value={invoice.issueDate}/>
          <InfoCard icon={<Calendar size={16}/>} label="Due Date"     value={invoice.dueDate}/>
          {invoice.poNumber && <InfoCard icon={<FileText size={16}/>} label="PO Number" value={invoice.poNumber}/>}
          <InfoCard icon={<Activity size={16}/>} label="Funded Amount" value={`${invoice.currency} ${Number(invoice.fundedAmount || 0).toLocaleString()}`} valueColor={invoice.fundedAmount > 0 ? '#22C55E' : '#A0A0A8'}/>
        </div>

        {/* ── Funding progress ── */}
        {['Funding','Funded','Active'].includes(invoice.status) && (
          <div style={{ background:'#151518', border:'1px solid rgba(255,255,255,.08)', borderRadius:16, padding:22, marginBottom:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <span style={{ fontSize:13, fontWeight:600, color:'#A0A0A8', textTransform:'uppercase', letterSpacing:'.5px' }}>Funding Progress</span>
              <span style={{ fontSize:14, fontWeight:800, color:'#7C5CFC' }}>
                {Math.round((invoice.fundedAmount / invoice.amount) * 100)}%
              </span>
            </div>
            <div style={{ height:12, borderRadius:99, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.08)', padding:2, boxSizing:'border-box' }}>
              <div style={{
                height:'100%', width:`${Math.min(100, (invoice.fundedAmount / invoice.amount) * 100)}%`,
                borderRadius:99,
                background:'linear-gradient(90deg,#7C5CFC,#22C55E)',
                boxShadow:'0 0 12px rgba(124,92,252,.4)',
                transition:'width .6s ease',
              }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:12, color:'#707078' }}>
              <span>Raised: {invoice.currency} {Number(invoice.fundedAmount).toLocaleString()}</span>
              <span>Target: {invoice.currency} {Number(invoice.amount).toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* ── Description ── */}
        {invoice.description && (
          <div style={{ background:'#151518', border:'1px solid rgba(255,255,255,.08)', borderRadius:16, padding:22, marginBottom:24 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#A0A0A8', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:10 }}>Description</div>
            <p style={{ margin:0, color:'#D0D0D8', fontSize:14, lineHeight:1.7 }}>{invoice.description}</p>
          </div>
        )}

        {/* ── File info ── */}
        {invoice.fileName && (
          <div style={{ background:'#151518', border:'1px solid rgba(255,255,255,.08)', borderRadius:16, padding:22 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:'rgba(124,92,252,.12)', border:'1px solid rgba(124,92,252,.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <FileText size={20} color="#7C5CFC"/>
              </div>
              <div>
                <div style={{ fontWeight:600, fontSize:14, color:'#E0E0E8' }}>{invoice.fileName}</div>
                <div style={{ fontSize:12, color:'#707078', marginTop:2 }}>Invoice PDF document</div>
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}</style>
    </div>
  );
}

function InfoCard({ icon, label, value, valueColor, bold }) {
  return (
    <div style={{ background:'#151518', border:'1px solid rgba(255,255,255,.08)', borderRadius:14, padding:'16px 18px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, color:'#707078', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize:15, fontWeight: bold ? 800 : 500, color: valueColor || '#E0E0E8', letterSpacing: bold ? '-.3px' : 0 }}>
        {value || '—'}
      </div>
    </div>
  );
}
