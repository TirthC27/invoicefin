import React, { useEffect, useState, useRef } from 'react';
import { investorApi } from '../../lib/api';
import { TrendingUp, Briefcase, DollarSign, Activity, CheckCircle2, Clock } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const POLL_INTERVAL = 10000;

const CHART_COLORS = ['#7C5CFC', '#22C55E', '#F59E0B', '#3B82F6', '#EF4444', '#EC4899'];

function StatCard({ label, value, icon: IconComponent, color, prefix = '' }) {
  return (
    <div style={{ background: '#151518', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 24, transition: 'transform 0.2s, box-shadow 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        {React.createElement(IconComponent, { size: 22, color })}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>
        {prefix}{typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : value}
      </div>
      <div style={{ fontSize: 13, color: '#A0A0A8', fontWeight: 500 }}>{label}</div>
    </div>
  );
}

export default function InvestorDashboard() {
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

  // Chart data
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
      const month = new Date(inv.completed_at || inv.created_at).toLocaleDateString('en', { month: 'short', year: '2-digit' });
      const existing = acc.find(a => a.month === month);
      if (existing) existing.returns += Number(inv.expected_profit);
      else acc.push({ month, returns: Number(inv.expected_profit) });
      return acc;
    }, []);

  // Growth data (cumulative investments over time)
  const growthData = investments
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .reduce((acc, inv) => {
      const date = new Date(inv.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' });
      const prev = acc.length > 0 ? acc[acc.length - 1].value : 0;
      acc.push({ date, value: prev + Number(inv.amount) });
      return acc;
    }, []);

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, color: '#A0A0A8' }}>Loading dashboard...</div>;
  }

  return (
    <>
      <style>{`
        .id-title { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 8px; }
        .id-subtitle { font-size: 14px; color: #A0A0A8; margin-bottom: 32px; }
        .id-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px; }
        .id-charts { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 24px; }
        .id-chart-card { background: #151518; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 24px; }
        .id-chart-title { font-size: 15px; font-weight: 700; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
        .id-bar-row { display: grid; grid-template-columns: 1fr; gap: 20px; }
        @media (max-width: 900px) { .id-charts { grid-template-columns: 1fr; } }
      `}</style>

      <h1 className="id-title">Dashboard</h1>
      <p className="id-subtitle">Your investment portfolio overview</p>

      <div className="id-grid">
        <StatCard label="Portfolio Value" value={Number(p.current_value || 0)} icon={DollarSign} color="#7C5CFC" prefix="" />
        <StatCard label="Total Invested" value={Number(p.total_invested || 0)} icon={Briefcase} color="#3B82F6" />
        <StatCard label="Total Profit" value={Number(p.total_profit || 0)} icon={TrendingUp} color="#22C55E" />
        <StatCard label="Active Investments" value={p.active_investments || 0} icon={Activity} color="#F59E0B" />
        <StatCard label="Completed" value={p.completed_count || 0} icon={CheckCircle2} color="#22C55E" />
        <StatCard label="Pending Returns" value={Number(p.pending_returns || 0)} icon={Clock} color="#EC4899" />
      </div>

      <div className="id-charts">
        {/* Portfolio Growth */}
        <div className="id-chart-card">
          <div className="id-chart-title"><TrendingUp size={16} color="#7C5CFC" /> Portfolio Growth</div>
          {growthData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={growthData}>
                <XAxis dataKey="date" tick={{ fill: '#A0A0A8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#A0A0A8', fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
                <Tooltip contentStyle={{ background: '#1a1a1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 13 }} />
                <Line type="monotone" dataKey="value" stroke="#7C5CFC" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A0A0A8', fontSize: 13 }}>
              No investment data yet. Start investing to see your growth chart.
            </div>
          )}
        </div>

        {/* Allocation Pie */}
        <div className="id-chart-card">
          <div className="id-chart-title"><Briefcase size={16} color="#F59E0B" /> Allocation</div>
          {allocationData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={allocationData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {allocationData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1a1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A0A0A8', fontSize: 13 }}>
              No active investments to display.
            </div>
          )}
          {allocationData.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {allocationData.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#A0A0A8' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  {item.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Monthly Returns Bar Chart */}
      <div className="id-bar-row">
        <div className="id-chart-card">
          <div className="id-chart-title"><DollarSign size={16} color="#22C55E" /> Monthly Returns</div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthlyData}>
                <XAxis dataKey="month" tick={{ fill: '#A0A0A8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#A0A0A8', fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
                <Tooltip contentStyle={{ background: '#1a1a1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 13 }} />
                <Bar dataKey="returns" fill="#22C55E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A0A0A8', fontSize: 13 }}>
              Returns will appear here as investments complete.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
