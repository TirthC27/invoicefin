import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Package, FileText, TrendingUp, Bell, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ExporterDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .ex-root { min-height: 100vh; background: #0B0B0F; color: #fff; font-family: 'Inter', sans-serif; }
        .ex-topbar { height: 64px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between; padding: 0 32px; background: rgba(11,11,15,0.8); backdrop-filter: blur(12px); }
        .ex-logo { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 700; }
        .ex-logo-dot { width: 8px; height: 8px; border-radius: 50%; background: #F59E0B; }
        .ex-signout { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: #A0A0A8; font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .ex-signout:hover { border-color: rgba(239,68,68,0.3); color: #EF4444; }
        .ex-content { max-width: 800px; margin: 0 auto; padding: 48px 24px; text-align: center; }
        .ex-title { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 8px; }
        .ex-subtitle { font-size: 15px; color: #A0A0A8; margin-bottom: 48px; }
        .ex-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 40px; }
        .ex-card { background: #151518; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 24px; text-align: center; }
        .ex-card-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; }
        .ex-card-label { font-size: 13px; color: #A0A0A8; margin-bottom: 4px; }
        .ex-card-value { font-size: 20px; font-weight: 800; }
        .ex-coming { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.15); border-radius: 12px; color: #F59E0B; font-size: 14px; font-weight: 600; }
      `}</style>

      <div className="ex-root">
        <div className="ex-topbar">
          <div className="ex-logo">
            <div className="ex-logo-dot" />
            InvoiceFi Exporter
          </div>
          <button className="ex-signout" onClick={handleSignOut}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>

        <div className="ex-content">
          <h1 className="ex-title">Welcome, {user?.full_name || user?.email || 'Exporter'}</h1>
          <p className="ex-subtitle">Your exporter dashboard is being built. Here's a preview of what's coming.</p>

          <div className="ex-grid">
            <div className="ex-card">
              <div className="ex-card-icon" style={{ background: 'rgba(245,158,11,0.08)' }}>
                <Package size={22} color="#F59E0B" />
              </div>
              <div className="ex-card-label">Invoices</div>
              <div className="ex-card-value">—</div>
            </div>
            <div className="ex-card">
              <div className="ex-card-icon" style={{ background: 'rgba(34,197,94,0.08)' }}>
                <TrendingUp size={22} color="#22C55E" />
              </div>
              <div className="ex-card-label">Total Funded</div>
              <div className="ex-card-value">—</div>
            </div>
            <div className="ex-card">
              <div className="ex-card-icon" style={{ background: 'rgba(124,92,252,0.08)' }}>
                <FileText size={22} color="#7C5CFC" />
              </div>
              <div className="ex-card-label">Active Pools</div>
              <div className="ex-card-value">—</div>
            </div>
          </div>

          <div className="ex-coming">
            🚧 Full exporter features coming soon
          </div>
        </div>
      </div>
    </>
  );
}
