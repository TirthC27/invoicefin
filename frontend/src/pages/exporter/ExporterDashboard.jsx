/**
 * ExporterDashboard
 * Shows invoice overview, funding distribution, recent invoices, and recent activity.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  Plus,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';
import { exporterApi } from '../../lib/api';
import { STATUS_COLOR, fmtAmount, timeAgo } from './exporterUtils';
import StatusBadge from './StatusBadge';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ACTION_COLOR_MAP = {
  uploaded: '#7C5CFC',
  verified: '#3B82F6',
  pool_created: '#8B5CF6',
  funded: '#22C55E',
  matured: '#14B8A6',
  status_changed: '#A0A0A8',
};

function DonutChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  const radius = 40;
  const center = 50;
  const circumference = 2 * Math.PI * radius;

  const slices = data.reduce((acc, item) => {
    if (item.value <= 0) return acc;
    const pct = item.value / total;
    const dash = pct * circumference;
    const gap = circumference - dash;
    return {
      offset: acc.offset + pct * 100,
      items: [...acc.items, { ...item, dash, gap, offset: acc.offset }],
    };
  }, { offset: 25, items: [] }).items;

  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', maxWidth: 180, display: 'block', margin: '0 auto' }}>
      <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={14} />
      {slices.map((slice) => (
        <circle
          key={slice.label}
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={slice.color}
          strokeWidth={14}
          strokeDasharray={`${slice.dash} ${slice.gap}`}
          strokeDashoffset={-circumference * slice.offset / 100 + circumference * 0.25}
          style={{ transition: 'stroke-dasharray .4s ease', transformOrigin: '50% 50%' }}
        />
      ))}
      <text x={center} y={center - 5} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="800">
        {total}
      </text>
      <text x={center} y={center + 9} textAnchor="middle" fill="#A0A0A8" fontSize="7">
        Total
      </text>
    </svg>
  );
}

function BarChart({ data }) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100, padding: '0 4px' }}>
      {data.map((item) => {
        const pct = (item.value / max) * 100;
        return (
          <div key={item.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <div style={{ width: '100%', height: `${Math.max(4, pct)}%`, borderRadius: '4px 4px 0 0', background: 'linear-gradient(180deg,#7C5CFC,#6B48F5)', minHeight: 4, transition: 'height .5s ease', position: 'relative' }}>
              {item.value > 0 && (
                <span style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', fontSize: 9, color: '#A0A0A8', whiteSpace: 'nowrap' }}>
                  {item.value > 1000 ? `${(item.value / 1000).toFixed(0)}k` : item.value}
                </span>
              )}
            </div>
            <span style={{ fontSize: 9, color: '#606068', textAlign: 'center' }}>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function computeMetrics(invoices) {
  const now = new Date();
  let totalAmount = 0;
  let activeCount = 0;
  let fundedCount = 0;
  let completedCount = 0;
  let pendingAmount = 0;

  const statusCounts = {
    Draft: 0,
    Verified: 0,
    Funding: 0,
    Funded: 0,
    Active: 0,
    Completed: 0,
  };

  const monthly = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return { label: MONTHS[date.getMonth()], value: 0 };
  });

  for (const invoice of invoices) {
    const amount = Number(invoice.amount || 0);
    statusCounts[invoice.status] = (statusCounts[invoice.status] || 0) + 1;
    totalAmount += amount;

    if (invoice.status === 'Active') activeCount += 1;
    if (invoice.status === 'Funded') fundedCount += 1;
    if (invoice.status === 'Completed') completedCount += 1;
    if (['Draft', 'Verified', 'Funding'].includes(invoice.status)) pendingAmount += amount;

    if (invoice.status === 'Completed' && invoice.created_at) {
      const invoiceDate = new Date(invoice.created_at);
      const diff = (now.getFullYear() - invoiceDate.getFullYear()) * 12 + (now.getMonth() - invoiceDate.getMonth());
      if (diff >= 0 && diff < 6) {
        monthly[5 - diff].value += Number(invoice.funded_amount || invoice.amount || 0);
      }
    }
  }

  const donutData = Object.entries(statusCounts)
    .filter(([, value]) => value > 0)
    .map(([label, value]) => ({ label, value, color: STATUS_COLOR[label] || '#A0A0A8' }));

  return {
    totalAmount,
    activeCount,
    fundedCount,
    completedCount,
    pendingAmount,
    donutData,
    monthly,
    total: invoices.length,
  };
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
  const [invoices, setInvoices] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async (showSpinner = false) => {
    if (showSpinner) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError('');

    try {
      const [invoiceData, activityData] = await Promise.all([
        exporterApi.listInvoices({ per_page: 100 }),
        exporterApi.getActivities(),
      ]);
      setInvoices(invoiceData.invoices ?? []);
      setActivities(activityData ?? []);
    } catch (loadError) {
      console.error('Failed to load exporter dashboard:', loadError);
      setInvoices([]);
      setActivities([]);
      setError(loadError?.error || loadError?.message || 'Failed to load exporter dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard(true);
  }, [loadDashboard]);

  const metrics = useMemo(() => computeMetrics(invoices), [invoices]);

  const recentInvoices = invoices.slice(0, 5);
  const recentActivities = activities.slice(0, 8);

  return (
    <div style={{ color: '#fff', fontFamily: "'Inter',sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, letterSpacing: '-.5px' }}>Dashboard</h2>
          <p style={{ margin: 0, fontSize: 13.5, color: '#A0A0A8' }}>Your invoice financing overview</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => void loadDashboard(false)}
            disabled={refreshing}
            style={{
              height: 40, padding: '0 16px', borderRadius: 12, fontSize: 14, fontWeight: 600,
              background: 'rgba(255,255,255,.05)', color: '#A0A0A8', border: '1px solid rgba(255,255,255,.08)',
              cursor: refreshing ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7,
              fontFamily: 'inherit',
            }}
          >
            <RotateCcw size={15} /> {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link to="/exporter/upload" style={{
            height: 40, padding: '0 18px', borderRadius: 12, fontSize: 14, fontWeight: 600,
            background: 'linear-gradient(135deg,#7C5CFC,#6B48F5)', color: '#fff',
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 7,
            boxShadow: '0 4px 14px rgba(124,92,252,.3)',
          }}>
            <Plus size={16} /> Upload Invoice
          </Link>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 18, color: '#F87171', fontSize: 13 }}>
          {error}
        </div>
      )}

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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 14, marginBottom: 24 }}>
            <MetricCard label="Total Invoices" value={metrics.total} icon={<FileText size={16} color="#7C5CFC" />} color="#7C5CFC" />
            <MetricCard label="Active Invoices" value={metrics.activeCount} icon={<Clock size={16} color="#22C55E" />} color="#22C55E" />
            <MetricCard label="Funded Invoices" value={metrics.fundedCount} icon={<CheckCircle2 size={16} color="#EC4899" />} color="#EC4899" />
            <MetricCard label="Completed" value={metrics.completedCount} icon={<CheckCircle2 size={16} color="#14B8A6" />} color="#14B8A6" />
            <MetricCard label="Total Amount" value={`$${(metrics.totalAmount / 1000).toFixed(0)}k`} icon={<DollarSign size={16} color="#F59E0B" />} color="#F59E0B" sub="All invoices" />
            <MetricCard label="Pending Amount" value={`$${(metrics.pendingAmount / 1000).toFixed(0)}k`} icon={<TrendingUp size={16} color="#8B5CF6" />} color="#8B5CF6" sub="Unfunded" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 24 }}>
            <div style={{ background: '#151518', border: '1px solid rgba(255,255,255,.07)', borderRadius: 18, padding: '20px' }}>
              <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#E0E0E8' }}>Invoice Status</h4>
              <DonutChart data={metrics.donutData} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
                {metrics.donutData.map((item) => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color }} />
                      <span style={{ color: '#A0A0A8' }}>{item.label}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#E0E0E8' }}>{item.value}</span>
                  </div>
                ))}
                {metrics.donutData.length === 0 && <div style={{ color: '#606068', fontSize: 12 }}>No invoices yet.</div>}
              </div>
            </div>

            <div style={{ background: '#151518', border: '1px solid rgba(255,255,255,.07)', borderRadius: 18, padding: '20px' }}>
              <h4 style={{ margin: '0 0 20px', fontSize: 14, fontWeight: 700, color: '#E0E0E8' }}>Monthly Funding (last 6 months)</h4>
              <BarChart data={metrics.monthly} />
              <div style={{ marginTop: 8, textAlign: 'center', fontSize: 11, color: '#505058' }}>
                Completed invoice value per month
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
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
                      {['Invoice', 'Buyer', 'Amount', 'Status'].map((heading) => (
                        <th key={heading} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#606068', textTransform: 'uppercase', letterSpacing: '.5px' }}>{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentInvoices.map((invoice) => (
                      <tr key={invoice.id} style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <Link to={`/exporter/invoices/${invoice.id}`} style={{ color: '#E0E0E8', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>
                            {invoice.invoice_number}
                          </Link>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#A0A0A8', fontSize: 12.5 }}>{invoice.buyer_company}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13 }}>{fmtAmount(invoice.amount, invoice.currency)}</td>
                        <td style={{ padding: '12px 16px' }}><StatusBadge status={invoice.status} /></td>
                      </tr>
                    ))}
                    {recentInvoices.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#505058', fontSize: 13 }}>
                          No invoices yet. Upload your first invoice!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ background: '#151518', border: '1px solid rgba(255,255,255,.07)', borderRadius: 18, padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                <Activity size={15} color="#7C5CFC" />
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Recent Activity</h4>
              </div>
              <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {recentActivities.length > 0 ? recentActivities.map((activity) => {
                  const color = ACTION_COLOR_MAP[activity.action_type] || '#A0A0A8';
                  return (
                    <div key={activity.id} style={{ display: 'flex', gap: 10, padding: '9px 6px', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, marginTop: 6, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 2px', fontSize: 12.5, color: '#D0D0D8', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {activity.description}
                        </p>
                        <span style={{ fontSize: 11, color: '#505058' }}>{timeAgo(activity.timestamp)}</span>
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
