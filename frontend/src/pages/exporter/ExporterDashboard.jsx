/**
 * ExporterDashboard — Module 1 (full replace of stub)
 * Shows: 6 metric cards, status donut chart, monthly bar chart, recent activity.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, TrendingUp, DollarSign, CheckCircle2,
  Clock, Activity, Plus, ChevronRight,
} from 'lucide-react';
import { exporterApi } from '../../lib/api';
import { STATUS_COLOR, StatusBadge, fmtAmount, timeAgo } from './exporterUtils';

// ── Mini SVG Donut Chart ────────────────────────────────────────
function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let offset  = 25; // start at top
  const R = 40, cx = 50, cy = 50;
  const circumference = 2 * Math.PI * R;

  const slices = data.filter((d) => d.value > 0).map((d) => {
    const pct   = d.value / total;
    const dash  = pct * circumference;
    const gap   = circumference - dash;
    const s     = { ...d, dash, gap, offset };
    offset     += pct * 100;
    return s;
  });

  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', maxWidth: 180, display: 'block', margin: '0 auto' }}>
      {/* Background ring */}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={14} />
      {slices.map((s, i) => (
        <circle key={i} cx={cx} cy={cy} r={R} fill="none"
          stroke={s.color} strokeWidth={14}
          strokeDasharray={`${s.dash} ${s.gap}`}
          strokeDashoffset={-circumference * s.offset / 100 + circumference * 0.25}
          style={{ transition: 'stroke-dasharray .4s ease', transformOrigin: '50% 50%' }}
        />
      ))}
      <text x={cx} y={cy - 5} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="800">{total}</text>
      <text x={cx} y={cy + 9} textAnchor="middle" fill="#A0A0A8" fontSize="7">Total</text>
    </svg>
  );
}

// ── Mini Bar Chart ──────────────────────────────────────────────
function BarChart({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100, padding: '0 4px' }}>
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <div style={{ width: '100%', height: `${Math.max(4, pct)}%`, borderRadius: '4px 4px 0 0',
              background: 'linear-gradient(180deg,#7C5CFC,#6B48F5)', minHeight: 4, transition: 'height .5s ease',
              position: 'relative' }}>
              {d.value > 0 && (
                <span style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)',
                  fontSize: 9, color: '#A0A0A8', whiteSpace: 'nowrap' }}>
                  {d.value > 1000 ? `${(d.value/1000).toFixed(0)}k` : d.value}
                </span>
              )}
            </div>
            <span style={{ fontSize: 9, color: '#606068', textAlign: 'center' }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function computeMetrics(invoices) {
  const now = new Date();
  let totalAmt = 0, activeCount = 0, fundedCount = 0, completedCount = 0, pending = 0;
  const statusCounts = { Draft:0, Verified:0, Funding:0, Funded:0, Active:0, Completed:0 };
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: MONTHS[d.getMonth()], value: 0 };
  });

  for (const inv of invoices) {
    statusCounts[inv.status] = (statusCounts[inv.status] || 0) + 1;
    totalAmt += Number(inv.amount);
    if (inv.status === 'Active')     activeCount++;
    if (inv.status === 'Funded')     fundedCount++;
    if (inv.status === 'Completed')  completedCount++;
    if (['Draft','Verified','Funding'].includes(inv.status)) pending += Number(inv.amount);

    // Monthly funded bar
    if (inv.status === 'Completed' && inv.created_at) {
      const invDate = new Date(inv.created_at);
      const diff = (now.getFullYear() - invDate.getFullYear()) * 12 + (now.getMonth() - invDate.getMonth());
      if (diff >= 0 && diff < 6) monthly[5 - diff].value += Number(inv.funded_amount || inv.amount);
    }
  }

  const donutData = Object.entries(statusCounts)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ label: k, value: v, color: STATUS_COLOR[k] || '#A0A0A8' }));

  return { totalAmt, activeCount, fundedCount, completedCount, pending, donutData, monthly, total: invoices.length };
}

function MetricCard({ label, value, sub, icon, color }) {
  return (
    <div style={{ background: '#151518', border: '1px solid rgba(255,255,255,.07)', borderRadius: 16, padding: '18px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#A0A0A8', letterSpacing: '.2px' }}>{label}</div>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#E8E8F0', letterSpacing: '-.5px', marginBottom: 3 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#606068' }}>{sub}</div>}
    </div>
  );
}

export default function ExporterDashboard() {
  const [invoices, setInvoices]   = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [invData, actData] = await Promise.all([
          exporterApi.listInvoices({ per_page: 100 }),
          exporterApi.getActivities(),
        ]);
        setInvoices(invData.invoices ?? []);
        setActivities(actData ?? []);
      } catch {
        setInvoices([]);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const m = computeMetrics(invoices);

  const ACTION_COLOR_MAP = { uploaded:'#7C5CFC', verified:'#3B82F6', pool_created:'#8B5CF6', funded:'#22C55E', matured:'#14B8A6', status_changed:'#A0A0A8' };

  return (
    <div style={{ color: '#fff', fontFamily: "'Inter',sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, letterSpacing: '-.5px' }}>Dashboard</h2>
          <p style={{ margin: 0, fontSize: 13.5, color: '#A0A0A8' }}>Your invoice financing overview</p>
        </div>
        <Link to="/exporter/upload" style={{
          height: 40, padding: '0 18px', borderRadius: 12, fontSize: 14, fontWeight: 600,
          background: 'linear-gradient(135deg,#7C5CFC,#6B48F5)', color: '#fff',
          textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 7,
          boxShadow: '0 4px 14px rgba(124,92,252,.3)',
        }}>
          <Plus size={16} /> Upload Invoice
        </Link>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <div style={{ textAlign: 'center', color: '#A0A0A8' }}>
            <div style={{ width: 36, height: 36, border: '3px solid rgba(124,92,252,.2)', borderTopColor: '#7C5CFC', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, margin: 0 }}>Loading dashboard…</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        </div>
      ) : (
        <>
          {/* Metric cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 14, marginBottom: 24 }}>
            <MetricCard label="Total Invoices"    value={m.total}               icon={<FileText size={16} color="#7C5CFC" />}    color="#7C5CFC" />
            <MetricCard label="Active Invoices"   value={m.activeCount}         icon={<Clock size={16} color="#22C55E" />}       color="#22C55E" />
            <MetricCard label="Funded Invoices"   value={m.fundedCount}         icon={<CheckCircle2 size={16} color="#EC4899" />} color="#EC4899" />
            <MetricCard label="Completed"         value={m.completedCount}      icon={<CheckCircle2 size={16} color="#14B8A6" />} color="#14B8A6" />
            <MetricCard label="Total Amount"      value={`$${(m.totalAmt/1000).toFixed(0)}k`} icon={<DollarSign size={16} color="#F59E0B" />} color="#F59E0B" sub="All invoices" />
            <MetricCard label="Pending Amount"    value={`$${(m.pending/1000).toFixed(0)}k`}  icon={<TrendingUp size={16} color="#8B5CF6" />}  color="#8B5CF6" sub="Unfunded" />
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 24 }}>
            {/* Donut chart */}
            <div style={{ background: '#151518', border: '1px solid rgba(255,255,255,.07)', borderRadius: 18, padding: '20px' }}>
              <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#E0E0E8' }}>Invoice Status</h4>
              <DonutChart data={m.donutData} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
                {m.donutData.map((d) => (
                  <div key={d.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
                      <span style={{ color: '#A0A0A8' }}>{d.label}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#E0E0E8' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bar chart */}
            <div style={{ background: '#151518', border: '1px solid rgba(255,255,255,.07)', borderRadius: 18, padding: '20px' }}>
              <h4 style={{ margin: '0 0 20px', fontSize: 14, fontWeight: 700, color: '#E0E0E8' }}>Monthly Funding (last 6 months)</h4>
              <BarChart data={m.monthly} />
              <div style={{ marginTop: 8, textAlign: 'center', fontSize: 11, color: '#505058' }}>
                Completed invoice value per month
              </div>
            </div>
          </div>

          {/* Recent invoices + activity */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
            {/* Invoice preview table */}
            <div style={{ background: '#151518', border: '1px solid rgba(255,255,255,.07)', borderRadius: 18, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Recent Invoices</h4>
                <Link to="/exporter/invoices" style={{ fontSize: 13, color: '#7C5CFC', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}>
                  View all <ChevronRight size={14} />
                </Link>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                      {['Invoice','Buyer','Amount','Status'].map((h) => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#606068', textTransform: 'uppercase', letterSpacing: '.5px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.slice(0, 5).map((inv) => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <Link to={`/exporter/invoices/${inv.id}`} style={{ color: '#E0E0E8', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>{inv.invoice_number}</Link>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#A0A0A8', fontSize: 12.5 }}>{inv.buyer_company}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13 }}>{fmtAmount(inv.amount, inv.currency)}</td>
                        <td style={{ padding: '12px 16px' }}><StatusBadge status={inv.status} /></td>
                      </tr>
                    ))}
                    {invoices.length === 0 && (
                      <tr><td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#505058', fontSize: 13 }}>No invoices yet. Upload your first invoice!</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Activity feed */}
            <div style={{ background: '#151518', border: '1px solid rgba(255,255,255,.07)', borderRadius: 18, padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                <Activity size={15} color="#7C5CFC" />
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Recent Activity</h4>
              </div>
              <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {activities.length > 0 ? activities.slice(0, 8).map((a) => {
                  const col = ACTION_COLOR_MAP[a.action_type] || '#A0A0A8';
                  return (
                    <div key={a.id} style={{ display: 'flex', gap: 10, padding: '9px 6px', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: col, marginTop: 6, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 2px', fontSize: 12.5, color: '#D0D0D8', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{a.description}</p>
                        <span style={{ fontSize: 11, color: '#505058' }}>{timeAgo(a.timestamp)}</span>
                      </div>
                    </div>
                  );
                }) : (
                  <p style={{ color: '#505058', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No activity yet.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
