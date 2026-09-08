import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { lawfirmApi } from '../../lib/api';
import { Scale, TrendingUp, Clock, CheckCircle2, Calendar } from 'lucide-react';
import MetricCard from '../../components/MetricCard';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

const STAGE_COLORS = {
  DEFAULT: { bg: '#f1f5f9', color: '#64748b' },
  LEGAL_NOTICE_SENT: { bg: '#dbeafe', color: '#2563eb' },
  NEGOTIATION: { bg: '#fef3c7', color: '#d97706' },
  SETTLEMENT: { bg: '#d1fae5', color: '#059669' },
  RECOVERED: { bg: '#dcfce7', color: '#16a34a' },
  CLOSED: { bg: '#f1f5f9', color: '#64748b' },
};

export default function LawFirmDashboard() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const data = await lawfirmApi.listCases();
        setCases(data);
      } catch (err) {
        console.error('Failed to load cases:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCases();
  }, []);

  const totalOutstanding = cases.reduce((s, c) => s + Number(c.outstanding_amount || 0), 0);
  const pending = cases.filter(c => !['RECOVERED', 'CLOSED'].includes(c.recovery_stage)).length;
  const recovered = cases.filter(c => c.recovery_stage === 'RECOVERED').length;
  const closed = cases.filter(c => c.recovery_stage === 'CLOSED').length;

  // Monthly outstanding trend (mock since we have stage data)
  const trendData = cases.slice().reverse().slice(0, 8).map((c, i) => ({
    label: `Case ${c.id}`,
    amount: Number(c.outstanding_amount || 0),
  }));

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Law Firm Dashboard</h1>
          <p>Overview of your assigned recovery operations.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline">
            <Calendar size={14} /> This Month
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <MetricCard
          title="Assigned Cases"
          value={loading ? '—' : cases.length}
          icon={Scale}
        />
        <MetricCard
          title="Outstanding Amount"
          value={loading ? '—' : totalOutstanding.toFixed(2)}
          suffix=" MATIC"
          icon={TrendingUp}
        />
        <MetricCard
          title="Pending Cases"
          value={loading ? '—' : pending}
          icon={Clock}
        />
        <MetricCard
          title="Recovered / Closed"
          value={loading ? '—' : `${recovered} / ${closed}`}
          change={cases.length > 0 ? `${Math.round((recovered + closed) / cases.length * 100)}% done` : null}
          isPositive={true}
          icon={CheckCircle2}
        />
      </div>

      {/* Charts + Recent Cases */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Outstanding Amount Trend */}
        <div className="data-card">
          <div className="data-card-header">
            <div>
              <div className="data-card-title">Outstanding Amounts</div>
              <div className="data-card-subtitle">Per case (most recent first)</div>
            </div>
          </div>
          <div className="data-card-body">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="caseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#bbf7d0" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#bbf7d0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false}
                    tick={{ fontSize: 10, fill: 'var(--fg-muted)' }} />
                  <YAxis axisLine={false} tickLine={false} width={55}
                    tick={{ fontSize: 11, fill: 'var(--fg-muted)' }}
                    tickFormatter={v => `${v.toFixed(1)}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a18', border: 'none',
                      borderRadius: 8, color: '#fff', fontSize: 12 }}
                    formatter={(v) => [`${Number(v).toFixed(4)} MATIC`, 'Outstanding']}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#22C55E"
                    strokeWidth={2} fill="url(#caseGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>
                {loading ? 'Loading...' : 'No cases assigned yet.'}
              </div>
            )}
          </div>
        </div>

        {/* Recent Cases */}
        <div className="data-card">
          <div className="data-card-header">
            <div className="data-card-title">Recent Cases</div>
          </div>
          <div className="data-card-body">
            {cases.slice(0, 5).map(c => {
              const stageStyle = STAGE_COLORS[c.recovery_stage] || STAGE_COLORS.DEFAULT;
              return (
                <div
                  key={c.id}
                  onClick={() => navigate(`/lawfirm/cases/${c.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 0', borderBottom: '1px solid var(--border)',
                    cursor: 'pointer', transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      Recovery #{c.id}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                      {Number(c.outstanding_amount || 0).toFixed(4)} MATIC
                    </div>
                  </div>
                  <span style={{
                    padding: '3px 9px', borderRadius: 50, fontSize: 10.5, fontWeight: 600,
                    background: stageStyle.bg, color: stageStyle.color,
                  }}>
                    {c.recovery_stage?.replace(/_/g, ' ')}
                  </span>
                </div>
              );
            })}
            {!loading && cases.length === 0 && (
              <div style={{ color: 'var(--fg-muted)', fontSize: 13, textAlign: 'center', padding: 24 }}>
                No cases yet. Browse the marketplace.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
