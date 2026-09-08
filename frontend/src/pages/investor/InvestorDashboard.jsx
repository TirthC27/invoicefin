import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/useAuth';
import { investorApi } from '../../lib/api';
import {
  TrendingUp, Briefcase, DollarSign, Activity,
  CheckCircle2, Clock, Calendar, Download
} from 'lucide-react';
import MetricCard from '../../components/MetricCard';
import {
  LineChart, Line, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

const POLL_INTERVAL = 12000;
const CHART_COLORS = ['#7C5CFC', '#22C55E', '#F59E0B', '#3B82F6', '#EF4444', '#EC4899'];

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#1a1a18',
  border: 'none',
  borderRadius: 8,
  color: '#fff',
  fontSize: 12,
  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
};

export default function InvestorDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  const fetchData = async () => {
    try {
      const result = await investorApi.getPortfolio();
      setData(result);
    } catch (err) {
      console.error('Failed to load portfolio:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, []);

  const p = data?.portfolio || {};
  const investments = data?.investments || [];

  const allocationData = investments
    .filter(i => ['active', 'confirmed'].includes(i.status))
    .reduce((acc, inv) => {
      const name = inv.pool_name || `Pool #${inv.pool}`;
      const existing = acc.find(a => a.name === name);
      if (existing) existing.value += Number(inv.amount);
      else acc.push({ name, value: Number(inv.amount) });
      return acc;
    }, []);

  const monthlyData = investments
    .filter(i => i.status === 'completed')
    .reduce((acc, inv) => {
      const month = new Date(inv.completed_at || inv.created_at)
        .toLocaleDateString('en', { month: 'short', year: '2-digit' });
      const existing = acc.find(a => a.month === month);
      if (existing) existing.returns += Number(inv.expected_profit);
      else acc.push({ month, returns: Number(inv.expected_profit) });
      return acc;
    }, []);

  const growthData = investments
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .reduce((acc, inv) => {
      const date = new Date(inv.created_at)
        .toLocaleDateString('en', { month: 'short', day: 'numeric' });
      const prev = acc.length > 0 ? acc[acc.length - 1].value : 0;
      acc.push({ date, value: prev + Number(inv.amount) });
      return acc;
    }, []);

  const displayName = user?.full_name || user?.email?.split('@')[0] || 'there';

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Welcome, {displayName} 👋</h1>
          <p>An overview of your portfolio performance and investments.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline">
            <Calendar size={14} /> This Week
          </button>
          <button className="btn btn-outline">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <MetricCard
          title="Portfolio Value"
          value={loading ? '—' : `${Number(p.current_value || 0).toFixed(4)}`}
          suffix=" MATIC"
          icon={DollarSign}
        />
        <MetricCard
          title="Total Invested"
          value={loading ? '—' : `${Number(p.total_invested || 0).toFixed(4)}`}
          suffix=" MATIC"
          icon={Briefcase}
        />
        <MetricCard
          title="Total Profit"
          value={loading ? '—' : `${Number(p.total_profit || 0).toFixed(4)}`}
          suffix=" MATIC"
          change={p.total_profit > 0 ? '+earned' : null}
          isPositive={true}
          icon={TrendingUp}
        />
        <MetricCard
          title="Active Investments"
          value={loading ? '—' : (p.active_investments || 0)}
          icon={Activity}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Portfolio Growth Chart */}
        <div className="data-card">
          <div className="data-card-header">
            <div>
              <div className="data-card-title">Portfolio Growth</div>
              <div className="data-card-subtitle">Cumulative investment value over time</div>
            </div>
          </div>
          <div className="data-card-body">
            {growthData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} />
                  <YAxis axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} width={50} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="value" stroke="#7C5CFC"
                    strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>
                No investment data yet. Start investing to see your growth chart.
              </div>
            )}
          </div>
        </div>

        {/* Allocation Donut */}
        <div className="data-card">
          <div className="data-card-header">
            <div>
              <div className="data-card-title">Allocation</div>
              <div className="data-card-subtitle">By pool</div>
            </div>
          </div>
          <div className="data-card-body">
            {allocationData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={allocationData} cx="50%" cy="50%"
                      innerRadius={52} outerRadius={78} paddingAngle={4} dataKey="value">
                      {allocationData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {allocationData.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center',
                      gap: 6, fontSize: 11, color: 'var(--fg-secondary)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%',
                        background: CHART_COLORS[i % CHART_COLORS.length],
                        display: 'inline-block' }} />
                      {item.name}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ height: 180, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>
                No active investments.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {/* Monthly Returns */}
        <div className="data-card" style={{ gridColumn: 'span 2' }}>
          <div className="data-card-header">
            <div>
              <div className="data-card-title">Monthly Returns</div>
              <div className="data-card-subtitle">Profit from completed investments</div>
            </div>
          </div>
          <div className="data-card-body">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={monthlyData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} />
                  <YAxis axisLine={false} tickLine={false} width={50}
                    tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="returns" fill="#b5d4a2" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 160, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>
                Returns will appear as investments complete.
              </div>
            )}
          </div>
        </div>

        {/* Summary stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="metric-card" style={{ flex: 1 }}>
            <div className="metric-card-header">
              <span className="metric-card-label">Completed</span>
              <div className="metric-card-icon"><CheckCircle2 size={16} /></div>
            </div>
            <div className="metric-card-value">{loading ? '—' : (p.completed_count || 0)}</div>
          </div>
          <div className="metric-card" style={{ flex: 1 }}>
            <div className="metric-card-header">
              <span className="metric-card-label">Pending Returns</span>
              <div className="metric-card-icon"><Clock size={16} /></div>
            </div>
            <div className="metric-card-value" style={{ fontSize: 20 }}>
              {loading ? '—' : `${Number(p.pending_returns || 0).toFixed(4)}`}
            </div>
            <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>MATIC expected</span>
          </div>
        </div>
      </div>
    </>
  );
}
