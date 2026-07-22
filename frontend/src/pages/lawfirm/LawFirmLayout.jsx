import React, { useState } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Scale, FileText, Clock, Handshake,
  User, LogOut, Bell, ChevronLeft, Menu
} from 'lucide-react';
import LawFirmDashboard from './LawFirmDashboard';
import AssignedCasesPage from './AssignedCasesPage';
import CaseDetailPage from './CaseDetailPage';

const sidebarItems = [
  { to: '/lawfirm/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/lawfirm/cases', icon: Scale, label: 'Assigned Cases' },
];

export default function LawFirmLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .lf-root { display: flex; min-height: 100vh; background: #0B0B0F; color: #fff; font-family: 'Inter', sans-serif; }

        .lf-sidebar { width: ${collapsed ? '72px' : '260px'}; background: #111116; border-right: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column; transition: width 0.25s ease; position: fixed; top: 0; left: 0; bottom: 0; z-index: 100; }
        .lf-sidebar-header { padding: 20px ${collapsed ? '16px' : '24px'}; display: flex; align-items: center; justify-content: ${collapsed ? 'center' : 'space-between'}; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .lf-logo { display: flex; align-items: center; gap: 10px; font-size: 17px; font-weight: 700; white-space: nowrap; overflow: hidden; }
        .lf-logo-dot { width: 8px; height: 8px; border-radius: 50%; background: #22C55E; flex-shrink: 0; }
        .lf-nav { flex: 1; padding: 12px 8px; display: flex; flex-direction: column; gap: 2px; }
        .lf-nav-item { display: flex; align-items: center; gap: 12px; padding: ${collapsed ? '12px' : '10px 16px'}; border-radius: 10px; color: #A0A0A8; font-size: 14px; font-weight: 500; text-decoration: none; transition: all 0.2s; justify-content: ${collapsed ? 'center' : 'flex-start'}; }
        .lf-nav-item:hover { background: rgba(34,197,94,0.08); color: #fff; }
        .lf-nav-item.active { background: rgba(34,197,94,0.12); color: #22C55E; }
        .lf-nav-item svg { width: 20px; height: 20px; flex-shrink: 0; }
        .lf-nav-label { ${collapsed ? 'display: none;' : ''} white-space: nowrap; }

        .lf-sidebar-footer { padding: 16px ${collapsed ? '8px' : '16px'}; border-top: 1px solid rgba(255,255,255,0.06); }
        .lf-user-card { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 10px; }
        .lf-user-avatar { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #22C55E, #16A34A); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; flex-shrink: 0; }
        .lf-user-info { ${collapsed ? 'display:none;' : ''} overflow: hidden; }
        .lf-user-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .lf-user-role { font-size: 11px; color: #A0A0A8; }

        .lf-content { flex: 1; margin-left: ${collapsed ? '72px' : '260px'}; transition: margin-left 0.25s ease; }
        .lf-topbar { height: 64px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between; padding: 0 32px; background: rgba(11,11,15,0.8); backdrop-filter: blur(12px); position: sticky; top: 0; z-index: 50; }
        .lf-topbar-title { font-size: 15px; font-weight: 600; color: #fff; }
        .lf-topbar-actions { display: flex; align-items: center; gap: 12px; }
        .lf-topbar-btn { width: 36px; height: 36px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: #A0A0A8; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
        .lf-topbar-btn:hover { border-color: rgba(34,197,94,0.3); color: #22C55E; background: rgba(34,197,94,0.06); }
        .lf-page { padding: 32px; }

        .lf-collapse-btn { width: 28px; height: 28px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: #A0A0A8; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }
        .lf-collapse-btn:hover { color: #fff; border-color: rgba(255,255,255,0.15); }
        .lf-signout-btn { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; color: #A0A0A8; font-size: 13px; font-weight: 500; background: none; border: none; cursor: pointer; width: 100%; transition: all 0.2s; justify-content: ${collapsed ? 'center' : 'flex-start'}; }
        .lf-signout-btn:hover { background: rgba(239,68,68,0.08); color: #EF4444; }

        @media (max-width: 768px) {
          .lf-sidebar { transform: ${mobileOpen ? 'translateX(0)' : 'translateX(-100%)'}; width: 260px; }
          .lf-content { margin-left: 0; }
          .lf-mobile-toggle { display: flex !important; }
        }
        @media (min-width: 769px) { .lf-mobile-toggle { display: none !important; } }
      `}</style>

      <div className="lf-root">
        <aside className="lf-sidebar">
          <div className="lf-sidebar-header">
            <div className="lf-logo">
              <div className="lf-logo-dot" />
              {!collapsed && <span>InvoiceFi Legal</span>}
            </div>
            <button className="lf-collapse-btn" onClick={() => setCollapsed(v => !v)}
              style={{ display: collapsed ? 'none' : 'flex' }}>
              <ChevronLeft size={16} />
            </button>
            {collapsed && (
              <button className="lf-collapse-btn" onClick={() => setCollapsed(false)}
                style={{ position: 'absolute', right: -14, top: 24, background: '#111116', border: '1px solid rgba(255,255,255,0.1)', zIndex: 10 }}>
                <Menu size={14} />
              </button>
            )}
          </div>

          <nav className="lf-nav">
            {sidebarItems.map(item => (
              <NavLink key={item.to} to={item.to} end={item.to === '/lawfirm/dashboard'}
                className={({ isActive }) => `lf-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}>
                <item.icon />
                <span className="lf-nav-label">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="lf-sidebar-footer">
            <div className="lf-user-card">
              <div className="lf-user-avatar">
                {(user?.email || 'L')[0].toUpperCase()}
              </div>
              <div className="lf-user-info">
                <div className="lf-user-name">{user?.full_name || user?.email || 'Law Firm'}</div>
                <div className="lf-user-role">Law Firm Partner</div>
              </div>
            </div>
            <button className="lf-signout-btn" onClick={handleSignOut}>
              <LogOut size={18} />
              {!collapsed && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        <main className="lf-content">
          <div className="lf-topbar">
            <button className="lf-topbar-btn lf-mobile-toggle" onClick={() => setMobileOpen(v => !v)}>
              <Menu size={18} />
            </button>
            <div className="lf-topbar-title">Law Firm Portal</div>
            <div className="lf-topbar-actions">
              <button className="lf-topbar-btn"><Bell size={18} /></button>
            </div>
          </div>

          <div className="lf-page">
            <Routes>
              <Route path="dashboard" element={<LawFirmDashboard />} />
              <Route path="cases" element={<AssignedCasesPage />} />
              <Route path="cases/:id" element={<CaseDetailPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </>
  );
}
