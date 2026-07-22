import React, { useEffect, useState } from 'react';
import { lawfirmApi } from '../../lib/api';
import { Scale, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';

export default function LawFirmDashboard() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await lawfirmApi.listCases();
        setCases(data);
      } catch (err) {
        console.error('Failed to load cases:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const totalOutstanding = cases.reduce((sum, c) => sum + Number(c.outstanding_amount || 0), 0);
  const pending = cases.filter(c => !['RECOVERED', 'CLOSED'].includes(c.recovery_stage)).length;
  const recovered = cases.filter(c => c.recovery_stage === 'RECOVERED').length;
  const closed = cases.filter(c => c.recovery_stage === 'CLOSED').length;

  const cards = [
    { label: 'Assigned Cases', value: cases.length, icon: Scale, color: '#7C5CFC', bg: 'rgba(124,92,252,0.08)' },
    { label: 'Outstanding Amount', value: `${totalOutstanding.toFixed(4)} MATIC`, icon: TrendingUp, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
    { label: 'Pending Cases', value: pending, icon: Clock, color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
    { label: 'Recovered / Closed', value: `${recovered} / ${closed}`, icon: CheckCircle2, color: '#22C55E', bg: 'rgba(34,197,94,0.08)' },
  ];

  return (
    <>
      <style>{`
        .lfd-title { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 8px; }
        .lfd-subtitle { font-size: 14px; color: #A0A0A8; margin-bottom: 32px; }
        .lfd-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; margin-bottom: 32px; }
        .lfd-card { background: #151518; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 24px; transition: transform 0.2s, box-shadow 0.2s; }
        .lfd-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
        .lfd-card-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .lfd-card-value { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 4px; }
        .lfd-card-label { font-size: 13px; color: #A0A0A8; font-weight: 500; }
        .lfd-recent-title { font-size: 16px; font-weight: 700; margin-bottom: 16px; }
        .lfd-recent-list { display: flex; flex-direction: column; gap: 8px; }
        .lfd-recent-item { background: #151518; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; transition: background 0.2s; }
        .lfd-recent-item:hover { background: #1a1a1f; }
        .lfd-recent-info { display: flex; flex-direction: column; gap: 4px; }
        .lfd-recent-name { font-size: 14px; font-weight: 600; }
        .lfd-recent-meta { font-size: 12px; color: #A0A0A8; }
        .lfd-stage-badge { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .lfd-skeleton { background: linear-gradient(90deg, #1a1a1f 25%, #222228 50%, #1a1a1f 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>

      <h1 className="lfd-title">Dashboard</h1>
      <p className="lfd-subtitle">Overview of your assigned recovery operations</p>

      <div className="lfd-grid">
        {cards.map(card => (
          <div className="lfd-card" key={card.label}>
            <div className="lfd-card-icon" style={{ background: card.bg }}>
              <card.icon size={22} color={card.color} />
            </div>
            {loading ? (
              <div className="lfd-skeleton" style={{ width: 60, height: 24, marginBottom: 8 }} />
            ) : (
              <div className="lfd-card-value">{card.value}</div>
            )}
            <div className="lfd-card-label">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Cases */}
      {!loading && cases.length > 0 && (
        <>
          <h2 className="lfd-recent-title">Recent Cases</h2>
          <div className="lfd-recent-list">
            {cases.slice(0, 5).map(c => (
              <div className="lfd-recent-item" key={c.id}>
                <div className="lfd-recent-info">
                  <span className="lfd-recent-name">
                    Recovery #{c.id} — Pool #{c.pool_contract_id}
                  </span>
                  <span className="lfd-recent-meta">
                    {c.exporter_email} · {Number(c.outstanding_amount).toFixed(4)} MATIC
                  </span>
                </div>
                <span className="lfd-stage-badge" style={{
                  background: c.recovery_stage === 'RECOVERED' ? 'rgba(34,197,94,0.08)' : 'rgba(124,92,252,0.08)',
                  color: c.recovery_stage === 'RECOVERED' ? '#22C55E' : '#7C5CFC',
                  border: `1px solid ${c.recovery_stage === 'RECOVERED' ? 'rgba(34,197,94,0.2)' : 'rgba(124,92,252,0.2)'}`,
                }}>
                  {c.recovery_stage.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
