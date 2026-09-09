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
import CircleExpandCard from '../../components/CircleExpandCard';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ACTION_COLOR_MAP = {
  uploaded: '#ffffff',
  verified: '#e0e0e0',
  pool_created: '#cccccc',
  funded: '#aaaaaa',
  matured: '#888888',
  status_changed: '#666666',
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
      <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--border)" strokeWidth={14} />
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
      <text x={center} y={center - 5} textAnchor="middle" fill="var(--fg-primary)" fontSize="11" fontWeight="800">
        {total}
      </text>
      <text x={center} y={center + 9} textAnchor="middle" fill="var(--fg-muted)" fontSize="7">
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
            <div style={{ width: '100%', height: `${Math.max(4, pct)}%`, borderRadius: '4px 4px 0 0', background: 'var(--color-accent)', minHeight: 4, transition: 'height .5s ease', position: 'relative' }}>
              {item.value > 0 && (
                <span style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', fontSize: 9, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
                  {item.value > 1000 ? `${(item.value / 1000).toFixed(0)}k` : item.value}
                </span>
              )}
            </div>
            <span style={{ fontSize: 9, color: 'var(--fg-muted)', textAlign: 'center' }}>{item.label}</span>
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
    <CircleExpandCard className="metric-card">
      <div className="metric-card-header">
        <span className="metric-card-label">{label}</span>
        <div className="metric-card-icon" style={{ background: `${color}15` }}>
          {icon}
        </div>
      </div>
      <div className="metric-card-value" style={{ fontSize: 24 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>{sub}</div>}
    </CircleExpandCard>
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
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Exporter Dashboard</h1>
          <p>Your invoice financing overview</p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            onClick={() => void loadDashboard(false)}
            disabled={refreshing}
            className="btn btn-outline"
          >
            <RotateCcw size={14} /> {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link to="/exporter/upload" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <Plus size={15} /> Upload Invoice
          </Link>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(201,64,64,0.07)', border: '1px solid rgba(201,64,64,0.2)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 18, color: 'var(--color-negative)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <div style={{ textAlign: 'center', color: 'var(--fg-muted)' }}>
            <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--color-accent-strong)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, margin: 0 }}>Loading dashboard…</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 14, marginBottom: 24 }}>
            <MetricCard label="Total Invoices" value={metrics.total} icon={<FileText size={16} color="#ffffff" />} color="#ffffff" />
            <MetricCard label="Active Invoices" value={metrics.activeCount} icon={<Clock size={16} color="#ffffff" />} color="#ffffff" />
            <MetricCard label="Funded Invoices" value={metrics.fundedCount} icon={<CheckCircle2 size={16} color="#ffffff" />} color="#ffffff" />
            <MetricCard label="Completed" value={metrics.completedCount} icon={<CheckCircle2 size={16} color="#ffffff" />} color="#ffffff" />
            <MetricCard label="Total Amount" value={`$${(metrics.totalAmount / 1000).toFixed(0)}k`} icon={<DollarSign size={16} color="#ffffff" />} color="#ffffff" sub="All invoices" />
            <MetricCard label="Pending Amount" value={`$${(metrics.pendingAmount / 1000).toFixed(0)}k`} icon={<TrendingUp size={16} color="#ffffff" />} color="#ffffff" sub="Unfunded" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 24 }}>
            <div className="data-card">
              <div className="data-card-header"><div className="data-card-title">Invoice Status</div></div>
              <div className="data-card-body">
                <DonutChart data={metrics.donutData} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
                  {metrics.donutData.map((item) => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color }} />
                        <span style={{ color: 'var(--fg-secondary)' }}>{item.label}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--fg-primary)' }}>{item.value}</span>
                    </div>
                  ))}
                  {metrics.donutData.length === 0 && <div style={{ color: 'var(--fg-muted)', fontSize: 12 }}>No invoices yet.</div>}
                </div>
              </div>
            </div>

            <div className="data-card">
              <div className="data-card-header"><div className="data-card-title">Monthly Funding (last 6 months)</div></div>
              <div className="data-card-body">
                <BarChart data={metrics.monthly} />
                <div style={{ marginTop: 8, textAlign: 'center', fontSize: 11, color: 'var(--fg-muted)' }}>
                  Completed invoice value per month
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
            <div className="data-card">
              <div className="data-card-header">
                <div className="data-card-title">Recent Invoices</div>
                <Link to="/exporter/invoices" style={{ fontSize: 13, color: 'var(--color-accent-fg)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}>
                  View all <ChevronRight size={14} />
                </Link>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      {['Invoice', 'Buyer', 'Amount', 'Status'].map((heading) => (
                        <th key={heading}>{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentInvoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td>
                          <Link to={`/exporter/invoices/${invoice.id}`} style={{ color: 'var(--fg-primary)', textDecoration: 'none', fontWeight: 600 }}>
                            {invoice.invoice_number}
                          </Link>
                        </td>
                        <td style={{ color: 'var(--fg-secondary)' }}>{invoice.buyer_company}</td>
                        <td style={{ fontWeight: 600 }}>{fmtAmount(invoice.amount, invoice.currency)}</td>
                        <td><StatusBadge status={invoice.status} /></td>
                      </tr>
                    ))}
                    {recentInvoices.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--fg-muted)' }}>
                          No invoices yet. Upload your first invoice!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="data-card">
              <div className="data-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Activity size={15} style={{ color: 'var(--color-accent-strong)' }} />
                  <div className="data-card-title">Recent Activity</div>
                </div>
              </div>
              <div className="data-card-body">
                {recentActivities.length > 0 ? recentActivities.map((activity) => {
                  const color = ACTION_COLOR_MAP[activity.action_type] || 'var(--fg-muted)';
                  return (
                    <div key={activity.id} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, marginTop: 6, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 2px', fontSize: 12.5, color: 'var(--fg-secondary)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {activity.description}
                        </p>
                        <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{timeAgo(activity.timestamp)}</span>
                      </div>
                    </div>
                  );
                }) : (
                  <p style={{ color: 'var(--fg-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No activity yet.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
