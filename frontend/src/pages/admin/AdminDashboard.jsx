import React, { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import { Building2, Scale, Users, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ lawFirms: 0, cases: 0, users: 0, recovered: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [firms, cases, users] = await Promise.all([
          adminApi.listLawFirms(),
          adminApi.listRecoveryCases(),
          adminApi.listUsers(),
        ]);
        const recovered = cases.filter(c => c.recovery_stage === 'RECOVERED' || c.recovery_stage === 'CLOSED').length;
        setStats({
          lawFirms: firms.length,
          cases: cases.length,
          users: users.length,
          recovered,
        });
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const cards = [
    { label: 'Law Firms', value: stats.lawFirms, icon: Building2, color: '#7C5CFC', bg: 'rgba(124,92,252,0.08)' },
    { label: 'Recovery Cases', value: stats.cases, icon: Scale, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
    { label: 'Total Users', value: stats.users, icon: Users, color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
    { label: 'Cases Recovered', value: stats.recovered, icon: TrendingUp, color: '#22C55E', bg: 'rgba(34,197,94,0.08)' },
  ];

  return (
    <>
      <style>{`
        .ad-title { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 8px; }
        .ad-subtitle { font-size: 14px; color: #A0A0A8; margin-bottom: 32px; }
        .ad-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }
        .ad-card { background: #151518; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 24px; transition: transform 0.2s, box-shadow 0.2s; }
        .ad-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
        .ad-card-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .ad-card-value { font-size: 28px; font-weight: 800; letter-spacing: -1px; margin-bottom: 4px; }
        .ad-card-label { font-size: 13px; color: #A0A0A8; font-weight: 500; }
        .ad-skeleton { background: linear-gradient(90deg, #1a1a1f 25%, #222228 50%, #1a1a1f 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>

      <h1 className="ad-title">Dashboard</h1>
      <p className="ad-subtitle">Overview of your platform activity</p>

      <div className="ad-grid">
        {cards.map(card => (
          <div className="ad-card" key={card.label}>
            <div className="ad-card-icon" style={{ background: card.bg }}>
              <card.icon size={22} color={card.color} />
            </div>
            {loading ? (
              <div className="ad-skeleton" style={{ width: 60, height: 28, marginBottom: 8 }} />
            ) : (
              <div className="ad-card-value">{card.value}</div>
            )}
            <div className="ad-card-label">{card.label}</div>
          </div>
        ))}
      </div>
    </>
  );
}
