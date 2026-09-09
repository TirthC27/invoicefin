import React, { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import { Building2, Scale, Users, TrendingUp, Calendar, Download } from 'lucide-react';
import MetricCard from '../../components/MetricCard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#1a1a18',
  border: 'none',
  borderRadius: 8,
  color: '#fff',
  fontSize: 12,
};

const STAGE_COLORS = {
  DEFAULT: '#d4d4d4',
  LEGAL_NOTICE_SENT: '#93c5fd',
  NEGOTIATION: '#fbbf24',
  SETTLEMENT: '#555555',
  RECOVERED: '#111111',
  CLOSED: '#a3a3a3',
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({ lawFirms: 0, cases: 0, users: 0, recovered: 0 });
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [firms, casesData, users] = await Promise.all([
          adminApi.listLawFirms(),
          adminApi.listRecoveryCases(),
          adminApi.listUsers(),
        ]);
        const recovered = casesData.filter(
          c => c.recovery_stage === 'RECOVERED' || c.recovery_stage === 'CLOSED'
        ).length;
        setStats({ lawFirms: firms.length, cases: casesData.length, users: users.length, recovered });
        setCases(casesData);
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Stage distribution chart data
  const stageData = Object.entries(
    cases.reduce((acc, c) => {
      acc[c.recovery_stage] = (acc[c.recovery_stage] || 0) + 1;
      return acc;
    }, {})
  ).map(([stage, count]) => ({
    stage: stage.replace(/_/g, ' '),
    count,
    color: STAGE_COLORS[stage] || '#d4d4d4',
  }));

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Admin Dashboard</h1>
          <p>Platform overview — users, law firms, and recovery operations.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline">
            <Calendar size={14} /> This Month
          </button>
          <button className="btn btn-outline">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <MetricCard
          title="Law Firms"
          value={loading ? '—' : stats.lawFirms}
          icon={Building2}
        />
        <MetricCard
          title="Recovery Cases"
          value={loading ? '—' : stats.cases}
          icon={Scale}
        />
        <MetricCard
          title="Total Users"
          value={loading ? '—' : stats.users}
          icon={Users}
        />
        <MetricCard
          title="Cases Recovered"
          value={loading ? '—' : stats.recovered}
          change={stats.cases > 0 ? `${Math.round(stats.recovered / stats.cases * 100)}% rate` : null}
          isPositive={true}
          icon={TrendingUp}
        />
      </div>

      {/* Case Stage Distribution Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="data-card">
          <div className="data-card-header">
            <div>
              <div className="data-card-title">Cases by Stage</div>
              <div className="data-card-subtitle">Distribution of recovery case stages</div>
            </div>
          </div>
          <div className="data-card-body">
            {stageData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stageData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="stage" axisLine={false} tickLine={false}
                    tick={{ fontSize: 10, fill: 'var(--fg-muted)' }} />
                  <YAxis axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} width={30} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {stageData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 220, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>
                {loading ? 'Loading...' : 'No recovery cases yet.'}
              </div>
            )}
          </div>
        </div>

        {/* Recent Cases list */}
        <div className="data-card">
          <div className="data-card-header">
            <div className="data-card-title">Recent Cases</div>
          </div>
          <div className="data-card-body">
            {cases.slice(0, 5).map(c => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: '1px solid var(--border)',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)' }}>
                    Case #{c.id}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                    {Number(c.outstanding_amount || 0).toFixed(2)} MATIC
                  </div>
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: 50, fontSize: 11, fontWeight: 600,
                  background: STAGE_COLORS[c.recovery_stage] + '30',
                  color: 'var(--fg-secondary)',
                }}>
                  {c.recovery_stage?.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
            {!loading && cases.length === 0 && (
              <div style={{ color: 'var(--fg-muted)', fontSize: 13, textAlign: 'center', padding: 24 }}>
                No cases yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
