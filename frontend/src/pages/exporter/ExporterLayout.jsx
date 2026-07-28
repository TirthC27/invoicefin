import React, { useState } from 'react';
import { Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import {
  LayoutDashboard, Upload, FileText,
  LogOut, ChevronLeft, Menu
} from 'lucide-react';
import NotificationBell from '../../components/NotificationBell';
import ExporterDashboard from './ExporterDashboard';
import UploadInvoice from './UploadInvoice';
import InvoicesPage from './InvoicesPage';
import InvoiceDetailPage from './InvoiceDetailPage';

const sidebarItems = [
  { to: '/exporter/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/exporter/upload', icon: Upload, label: 'Upload Invoice' },
  { to: '/exporter/invoices', icon: FileText, label: 'All Invoices' },
];

export default function ExporterLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .ex-root { display: flex; min-height: 100vh; background: #0B0B0F; color: #fff; font-family: 'Inter', sans-serif; }
        .ex-sidebar { width: ${collapsed ? '72px' : '260px'}; background: #111116; border-right: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column; transition: width 0.25s ease; position: fixed; top: 0; left: 0; bottom: 0; z-index: 100; }
        .ex-sidebar-header { padding: 20px ${collapsed ? '16px' : '24px'}; display: flex; align-items: center; justify-content: ${collapsed ? 'center' : 'space-between'}; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .ex-logo { display: flex; align-items: center; gap: 10px; font-size: 17px; font-weight: 700; white-space: nowrap; overflow: hidden; }
        .ex-logo-dot { width: 8px; height: 8px; border-radius: 50%; background: linear-gradient(135deg, #F59E0B, #D97706); flex-shrink: 0; }
        .ex-nav { flex: 1; padding: 12px 8px; display: flex; flex-direction: column; gap: 2px; }
        .ex-nav-item { display: flex; align-items: center; gap: 12px; padding: ${collapsed ? '12px' : '10px 16px'}; border-radius: 10px; color: #A0A0A8; font-size: 14px; font-weight: 500; text-decoration: none; transition: all 0.2s; justify-content: ${collapsed ? 'center' : 'flex-start'}; }
        .ex-nav-item:hover { background: rgba(245,158,11,0.08); color: #fff; }
        .ex-nav-item.active { background: rgba(245,158,11,0.12); color: #F59E0B; }
        .ex-nav-item svg { width: 20px; height: 20px; flex-shrink: 0; }
        .ex-nav-label { ${collapsed ? 'display: none;' : ''} white-space: nowrap; }
        .ex-sidebar-footer { padding: 16px ${collapsed ? '8px' : '16px'}; border-top: 1px solid rgba(255,255,255,0.06); }
        .ex-user-card { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 10px; }
        .ex-user-avatar { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #F59E0B, #D97706); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; flex-shrink: 0; color: #000; }
        .ex-user-info { ${collapsed ? 'display:none;' : ''} overflow: hidden; }
        .ex-user-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ex-user-role { font-size: 11px; color: #A0A0A8; }
        .ex-content { flex: 1; margin-left: ${collapsed ? '72px' : '260px'}; transition: margin-left 0.25s ease; min-width: 0; }
        .ex-topbar { height: 64px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between; padding: 0 32px; background: rgba(11,11,15,0.8); backdrop-filter: blur(12px); position: sticky; top: 0; z-index: 50; }
        .ex-topbar-actions { display: flex; align-items: center; gap: 12px; }
        .ex-topbar-btn { height: 36px; padding: 0 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: #A0A0A8; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; font-size: 13px; font-family: inherit; transition: all 0.2s; }
        .ex-topbar-btn:hover { border-color: rgba(245,158,11,0.3); color: #F59E0B; background: rgba(245,158,11,0.06); }
        .ex-page { padding: 32px; }
        .ex-collapse-btn { width: 28px; height: 28px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: #A0A0A8; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }
        .ex-collapse-btn:hover { color: #fff; border-color: rgba(255,255,255,0.15); }
        .ex-signout-btn { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; color: #A0A0A8; font-size: 13px; font-weight: 500; background: none; border: none; cursor: pointer; width: 100%; transition: all 0.2s; justify-content: ${collapsed ? 'center' : 'flex-start'}; font-family: inherit; }
        .ex-signout-btn:hover { background: rgba(239,68,68,0.08); color: #EF4444; }
        @media (max-width: 768px) {
          .ex-sidebar { transform: translateX(-100%); width: 260px; }
          .ex-content { margin-left: 0; }
        }
      `}</style>

      <div className="ex-root">
        <aside className="ex-sidebar">
          <div className="ex-sidebar-header">
            <div className="ex-logo">
              <div className="ex-logo-dot" />
              {!collapsed && <span>InvoiceFi Exporter</span>}
            </div>
            {!collapsed && (
              <button className="ex-collapse-btn" onClick={() => setCollapsed(true)}>
                <ChevronLeft size={16} />
              </button>
            )}
            {collapsed && (
              <button className="ex-collapse-btn" onClick={() => setCollapsed(false)}
                style={{ position: 'absolute', right: -14, top: 24, background: '#111116', border: '1px solid rgba(255,255,255,0.1)', zIndex: 10 }}>
                <Menu size={14} />
              </button>
            )}
          </div>

          <nav className="ex-nav">
            {sidebarItems.map(item => (
              <NavLink key={item.to} to={item.to}
                className={({ isActive }) => `ex-nav-item ${isActive ? 'active' : ''}`}>
                <item.icon />
                <span className="ex-nav-label">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="ex-sidebar-footer">
            <div className="ex-user-card">
              <div className="ex-user-avatar">{(user?.email || 'E')[0].toUpperCase()}</div>
              <div className="ex-user-info">
                <div className="ex-user-name">{user?.full_name || user?.email || 'Exporter'}</div>
                <div className="ex-user-role">Exporter Portal</div>
              </div>
            </div>
            <button className="ex-signout-btn" onClick={handleSignOut}>
              <LogOut size={18} />
              {!collapsed && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        <main className="ex-content">
          <div className="ex-topbar">
            <div style={{ fontSize: 15, fontWeight: 600 }}>Exporter Dashboard</div>
            <div className="ex-topbar-actions">
              <NotificationBell
                buttonClassName="ex-topbar-btn"
                buttonStyle={{ padding: '0 10px' }}
                accent="#F59E0B"
              />
            </div>
          </div>
          <div className="ex-page">
            <Routes>
              <Route path="dashboard" element={<ExporterDashboard />} />
              <Route path="upload" element={<UploadInvoice />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="invoices/:id" element={<InvoiceDetailPage />} />
              <Route path="invoice/:id" element={<InvoiceDetailPage />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </>
  );
}
