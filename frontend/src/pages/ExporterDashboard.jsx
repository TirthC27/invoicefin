import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText, CheckCircle2, Clock, DollarSign, PlusCircle,
  TrendingUp, Activity, PieChart, BarChart3,
  ShieldCheck, UserCheck, ChevronRight, ArrowLeft, Layers,
} from 'lucide-react';
import { invoiceService } from '../lib/invoiceService';

const STATUS_COLOR = {
  Draft: '#6B7280',
  Verified: '#3B82F6',
  Funding: '#8B5CF6',
  Funded: '#EC4899',
  Active: '#7C5CFC',
  Completed: '#22C55E',
};

const fmt = (n) => '$' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });

export default function ExporterDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const [hoveredBar, setHoveredBar] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    invoiceService.getDashboardStats()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#0B0B0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#A0A0A8', fontFamily: "'Inter',sans-serif" }}>
          <div style={{ width: 40, height: 40, border: '3px solid rgba(124,92,252,.2)', borderTopColor: '#7C5CFC', borderRadius: '50%', animation: 'dbSpin 1s linear infinite', margin: '0 auto 14px' }} />
          <p style={{ fontSize: 14, margin: 0 }}>Loading dashboard…</p>
        </div>
        <style>{`@keyframes dbSpin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const { metrics, statusDistribution, monthlyFunding, activities, invoices } = data;
  const total = statusDistribution.reduce((s, d) => s + d.count, 0) || 1;
  const maxBar = Math.max(...monthlyFunding.map((m) => m.amount), 1);

  // SVG donut arcs
  let cumulative = 0;
  const arcs = statusDistribution.map((item) => {
    const pct = (item.count / total) * 100;
    const arc = { ...item, pct, offset: -cumulative };
    cumulative += pct;
    return arc;
  });

  return (
    <div style={{ background: '#0B0B0F', color: '#fff', minHeight: '100vh', fontFamily: "'Inter',sans-serif" }}>

      {/* ── Sticky nav ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(11,11,15,.85)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,.08)',
        padding: '0 32px', height: 70,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#A0A0A8', textDecoration: 'none', fontSize: 13 }}>
            <ArrowLeft size={16} /> Overview
          </Link>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,.1)' }} />
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 700, letterSpacing: '-.3px' }}>
            <Layers size={20} color="#7C5CFC" /> Exporter Dashboard
          </span>
        </div>
        <button
          id="exporter-upload-btn"
          onClick={() => navigate('/exporter/upload')}
          style={{
            height: 42, padding: '0 22px',
            background: 'linear-gradient(135deg,#7C5CFC,#6B48F5)',
            color: '#fff', border: 'none', borderRadius: 12,
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 4px 14px rgba(124,92,252,.35)',
            transition: 'transform .2s, box-shadow .2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(124,92,252,.45)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(124,92,252,.35)'; }}
        >
          <PlusCircle size={18} /> Upload Invoice
        </button>
      </header>

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Page heading */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-.8px', margin: '0 0 6px' }}>
            Exporter Invoice Lifecycle
          </h2>
          <p style={{ color: '#A0A0A8', fontSize: 14.5, margin: 0 }}>
            Manage cross-border invoice verification, financing pools, and on-chain liquidity.
          </p>
        </div>

        {/* ── 6 Metric cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(175px,1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Total Invoices', value: metrics.totalInvoices, icon: <FileText size={18} />, badge: 'violet', sub: 'All statuses' },
            { label: 'Active Invoices', value: metrics.activeInvoices, icon: <Activity size={18} />, badge: 'blue', sub: 'Earning yields' },
            { label: 'Funded Invoices', value: metrics.fundedInvoices, icon: <TrendingUp size={18} />, badge: 'pink', sub: 'Capital raised' },
            { label: 'Completed', value: metrics.completedInvoices, icon: <CheckCircle2 size={18} />, badge: 'green', sub: 'Matured & paid' },
            { label: 'Total Raised', value: fmt(metrics.totalAmountRaised), numColor: '#22C55E', icon: <DollarSign size={18} />, badge: 'green-glow', sub: 'Liquidity unlocked' },
            { label: 'Pending Amount', value: fmt(metrics.pendingAmount), icon: <Clock size={18} />, badge: 'orange', sub: 'Awaiting funding' },
          ].map(({ label, value, icon, badge, sub, numColor }) => (
            <div key={label} style={{
              background: badge === 'green-glow'
                ? 'linear-gradient(145deg,#151518 0%,rgba(34,197,94,.04) 100%)'
                : '#151518',
              border: badge === 'green-glow'
                ? '1px solid rgba(34,197,94,.22)'
                : '1px solid rgba(255,255,255,.08)',
              borderRadius: 16, padding: 20,
              transition: 'transform .25s, box-shadow .25s, border-color .25s',
              cursor: 'default',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = badge === 'green-glow' ? 'rgba(34,197,94,.22)' : 'rgba(255,255,255,.08)'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#A0A0A8', textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</span>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: badge === 'violet' ? 'rgba(124,92,252,.15)' : badge === 'blue' ? 'rgba(59,130,246,.15)' : badge === 'pink' ? 'rgba(236,72,153,.15)' : badge === 'green' ? 'rgba(34,197,94,.15)' : badge === 'green-glow' ? 'rgba(34,197,94,.2)' : 'rgba(245,158,11,.15)',
                  color: badge === 'violet' ? '#7C5CFC' : badge === 'blue' ? '#3B82F6' : badge === 'pink' ? '#EC4899' : (badge === 'green' || badge === 'green-glow') ? '#22C55E' : '#F59E0B',
                  boxShadow: badge === 'green-glow' ? '0 0 12px rgba(34,197,94,.3)' : 'none',
                }}>{icon}</div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.8px', marginBottom: 4, color: numColor || '#fff' }}>{value}</div>
              <div style={{ fontSize: 11.5, color: '#707078' }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ── 2 Charts ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(400px,1fr))', gap: 24, marginBottom: 32 }}>

          {/* Donut */}
          <div style={{ background: '#151518', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PieChart size={18} color="#7C5CFC" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Invoice Status Distribution</h3>
              </div>
              <span style={{ fontSize: 12, color: '#A0A0A8', background: 'rgba(255,255,255,.05)', padding: '4px 10px', borderRadius: 20 }}>
                {metrics.totalInvoices} total
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              {/* SVG donut */}
              <div style={{ position: 'relative', width: 180, height: 180, flexShrink: 0, margin: '0 auto' }}>
                <svg width="180" height="180" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                  {arcs.map((a) => (
                    <circle key={a.status} cx="50" cy="50" r="38" fill="transparent"
                      stroke={STATUS_COLOR[a.status]} strokeWidth="14"
                      strokeDasharray={`${a.pct} ${100 - a.pct}`}
                      strokeDashoffset={a.offset}
                      pathLength="100"
                      style={{ transition: 'all .3s', opacity: hoveredSlice === null || hoveredSlice === a.status ? 1 : 0.3, cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredSlice(a.status)}
                      onMouseLeave={() => setHoveredSlice(null)}
                    />
                  ))}
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span style={{ fontSize: 22, fontWeight: 800 }}>
                    {hoveredSlice ? (arcs.find((a) => a.status === hoveredSlice)?.count ?? 0) : metrics.totalInvoices}
                  </span>
                  <span style={{ fontSize: 11, color: '#A0A0A8', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                    {hoveredSlice ?? 'Total'}
                  </span>
                </div>
              </div>
              {/* Legend */}
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', minWidth: 170 }}>
                {arcs.map((a) => (
                  <div key={a.status}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, background: hoveredSlice === a.status ? 'rgba(255,255,255,.05)' : 'transparent', cursor: 'pointer', transition: 'background .2s' }}
                    onMouseEnter={() => setHoveredSlice(a.status)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLOR[a.status], flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: '#D0D0D8' }}>{a.status}</div>
                      <div style={{ fontSize: 11, color: '#707078', fontWeight: 600 }}>{a.count} ({Math.round(a.pct)}%)</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bar chart */}
          <div style={{ background: '#151518', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart3 size={18} color="#22C55E" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Monthly Funding Raised</h3>
              </div>
              <span style={{ fontSize: 12, color: '#22C55E', background: 'rgba(34,197,94,.1)', padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>
                +24.5% MoM
              </span>
            </div>
            <div style={{ height: 180, display: 'flex', alignItems: 'flex-end', gap: 12, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,.07)' }}>
              {monthlyFunding.map((m) => {
                const hPct = (m.amount / maxBar) * 100;
                const hov = hoveredBar === m.month;
                return (
                  <div key={m.month}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}
                    onMouseEnter={() => setHoveredBar(m.month)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {hov && (
                      <div style={{ position: 'absolute', top: -30, background: '#1E1E24', border: '1px solid rgba(255,255,255,.15)', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, color: '#22C55E', whiteSpace: 'nowrap', zIndex: 5 }}>
                        {fmt(m.amount)}
                      </div>
                    )}
                    <div style={{
                      width: '100%', maxWidth: 36, height: `${hPct}%`,
                      background: hov
                        ? 'linear-gradient(180deg,#22C55E,#16A34A)'
                        : 'linear-gradient(180deg,rgba(34,197,94,.65),rgba(124,92,252,.35))',
                      borderRadius: '6px 6px 2px 2px', transition: 'all .25s',
                      boxShadow: hov ? '0 0 14px rgba(34,197,94,.4)' : 'none',
                    }} />
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              {monthlyFunding.map((m) => (
                <span key={m.month} style={{ flex: 1, textAlign: 'center', fontSize: 11.5, color: hoveredBar === m.month ? '#fff' : '#A0A0A8', fontWeight: hoveredBar === m.month ? 600 : 400, transition: 'color .2s' }}>{m.month}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Invoice table + Activity feed ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>

          {/* Invoice table */}
          <div style={{ background: '#151518', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Recent Export Invoices</h3>
              <span style={{ fontSize: 12, color: '#7C5CFC', fontWeight: 600 }}>{invoices.length} invoices</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,.08)', color: '#A0A0A8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                    {['Invoice ID', 'Buyer Company', 'Amount', 'Due Date', 'Status', ''].map((h) => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: h === '' ? 'right' : 'left', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}
                      style={{ borderBottom: '1px solid rgba(255,255,255,.04)', transition: 'background .15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,.025)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '13px 14px', fontWeight: 600 }}>{inv.invoiceNumber}</td>
                      <td style={{ padding: '13px 14px', color: '#D0D0D8' }}>{inv.buyerCompany}</td>
                      <td style={{ padding: '13px 14px', fontWeight: 700 }}>{inv.currency} {Number(inv.amount).toLocaleString()}</td>
                      <td style={{ padding: '13px 14px', color: '#A0A0A8' }}>{inv.dueDate}</td>
                      <td style={{ padding: '13px 14px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: `${STATUS_COLOR[inv.status]}22`, color: STATUS_COLOR[inv.status] }}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ padding: '13px 14px', textAlign: 'right' }}>
                        <Link to={`/exporter/invoice/${inv.id}`} style={{ color: '#7C5CFC', textDecoration: 'none', fontWeight: 600, fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          View <ChevronRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Activity feed */}
          <div style={{ background: '#151518', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Activity size={18} color="#7C5CFC" />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Recent Activities</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {activities.map((a) => {
                const iconMap = {
                  upload: <PlusCircle size={14} />,
                  verified: <ShieldCheck size={14} />,
                  funding: <TrendingUp size={14} />,
                  funded: <DollarSign size={14} />,
                  completed: <CheckCircle2 size={14} />,
                  buyer: <UserCheck size={14} />,
                };
                const colorMap = {
                  upload: '#7C5CFC', verified: '#3B82F6', funding: '#EC4899',
                  funded: '#22C55E', completed: '#22C55E', buyer: '#F59E0B',
                };
                const color = colorMap[a.type] || '#A0A0A8';
                return (
                  <div key={a.id} style={{ display: 'flex', gap: 12, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `${color}22`, color,
                    }}>
                      {iconMap[a.type] || <Activity size={14} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 4px', fontSize: 13, color: '#E0E0E8', lineHeight: 1.4 }}>{a.text}</p>
                      <span style={{ fontSize: 11, color: '#707078' }}>{a.timestamp}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}</style>
    </div>
  );
}
