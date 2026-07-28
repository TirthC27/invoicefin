import React, { useState } from 'react';
import { Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import {
  LayoutDashboard, Scale, FileText, Users, Building2,
  Settings, LogOut, ChevronLeft, Menu
} from 'lucide-react';
import NotificationBell from '../../components/NotificationBell';
import AdminDashboard from './AdminDashboard';
import LawFirmsPage from './LawFirmsPage';
import RecoveryCasesPage from './RecoveryCasesPage';
import UsersPage from './UsersPage';

const sidebarItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/recovery-cases', icon: Scale, label: 'Recovery Cases' },
  { to: '/admin/law-firms', icon: Building2, label: 'Law Firms' },
  { to: '/admin/users', icon: Users, label: 'Users' },
];

export default function AdminLayout() {
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
        .admin-root { display: flex; min-height: 100vh; background: #0B0B0F; color: #fff; font-family: 'Inter', sans-serif; }
        .admin-sidebar { width: ${collapsed ? '72px' : '260px'}; background: #111116; border-right: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column; transition: width 0.25s ease; position: fixed; top: 0; left: 0; bottom: 0; z-index: 100; }
        .admin-sidebar-header { padding: 20px ${collapsed ? '16px' : '24px'}; display: flex; align-items: center; justify-content: ${collapsed ? 'center' : 'space-between'}; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .admin-logo { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 700; white-space: nowrap; overflow: hidden; }
        .admin-logo-dot { width: 8px; height: 8px; border-radius: 50%; background: #7C5CFC; flex-shrink: 0; }
        .admin-nav { flex: 1; padding: 12px 8px; display: flex; flex-direction: column; gap: 2px; }
        .admin-nav-item { display: flex; align-items: center; gap: 12px; padding: ${collapsed ? '12px' : '10px 16px'}; border-radius: 10px; color: #A0A0A8; font-size: 14px; font-weight: 500; text-decoration: none; transition: all 0.2s; justify-content: ${collapsed ? 'center' : 'flex-start'}; }
        .admin-nav-item:hover { background: rgba(124,92,252,0.08); color: #fff; }
        .admin-nav-item.active { background: rgba(124,92,252,0.12); color: #7C5CFC; }
        .admin-nav-item svg { width: 20px; height: 20px; flex-shrink: 0; }
        .admin-nav-label { ${collapsed ? 'display: none;' : ''} white-space: nowrap; }
        .admin-sidebar-footer { padding: 16px ${collapsed ? '8px' : '16px'}; border-top: 1px solid rgba(255,255,255,0.06); }
        .admin-user-card { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 10px; }
        .admin-user-avatar { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #7C5CFC, #6B48F5); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; flex-shrink: 0; }
        .admin-user-info { ${collapsed ? 'display:none;' : ''} overflow: hidden; }
        .admin-user-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .admin-user-role { font-size: 11px; color: #A0A0A8; }
        .admin-content { flex: 1; margin-left: ${collapsed ? '72px' : '260px'}; transition: margin-left 0.25s ease; }
        .admin-topbar { height: 64px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between; padding: 0 32px; background: rgba(11,11,15,0.8); backdrop-filter: blur(12px); position: sticky; top: 0; z-index: 50; }
        .admin-topbar-title { font-size: 15px; font-weight: 600; color: #fff; }
        .admin-topbar-actions { display: flex; align-items: center; gap: 12px; }
        .admin-topbar-btn { width: 36px; height: 36px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: #A0A0A8; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
        .admin-topbar-btn:hover { border-color: rgba(124,92,252,0.3); color: #7C5CFC; background: rgba(124,92,252,0.06); }
        .admin-page { padding: 32px; }
        .admin-collapse-btn { width: 28px; height: 28px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: #A0A0A8; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }
        .admin-collapse-btn:hover { color: #fff; border-color: rgba(255,255,255,0.15); }
        .admin-signout-btn { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; color: #A0A0A8; font-size: 13px; font-weight: 500; background: none; border: none; cursor: pointer; width: 100%; transition: all 0.2s; justify-content: ${collapsed ? 'center' : 'flex-start'}; }
        .admin-signout-btn:hover { background: rgba(239,68,68,0.08); color: #EF4444; }

        @media (max-width: 768px) {
          .admin-sidebar { transform: ${mobileOpen ? 'translateX(0)' : 'translateX(-100%)'}; width: 260px; }
          .admin-content { margin-left: 0; }
          .admin-mobile-toggle { display: flex !important; }
        }
        @media (min-width: 769px) {
          .admin-mobile-toggle { display: none !important; }
        }
      `}</style>

      <div className="admin-root">
        {/* ── Sidebar ── */}
        <aside className="admin-sidebar">
          <div className="admin-sidebar-header">
            <div className="admin-logo">
              <div className="admin-logo-dot" />
              {!collapsed && <span>InvoiceFi Admin</span>}
            </div>
            <button className="admin-collapse-btn" onClick={() => setCollapsed(v => !v)}
              style={{ display: collapsed ? 'none' : 'flex' }}>
              <ChevronLeft size={16} />
            </button>
            {collapsed && (
              <button className="admin-collapse-btn" onClick={() => setCollapsed(false)}
                style={{ position: 'absolute', right: -14, top: 24, background: '#111116', border: '1px solid rgba(255,255,255,0.1)', zIndex: 10 }}>
                <Menu size={14} />
              </button>
            )}
          </div>

          <nav className="admin-nav">
            {sidebarItems.map(item => (
              <NavLink key={item.to} to={item.to} end={item.to === '/admin/dashboard'}
                className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}>
                <item.icon />
                <span className="admin-nav-label">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="admin-sidebar-footer">
            <div className="admin-user-card">
              <div className="admin-user-avatar">
                {(user?.email || 'A')[0].toUpperCase()}
              </div>
              <div className="admin-user-info">
                <div className="admin-user-name">{user?.full_name || user?.email || 'Admin'}</div>
                <div className="admin-user-role">Administrator</div>
              </div>
            </div>
            <button className="admin-signout-btn" onClick={handleSignOut}>
              <LogOut size={18} />
              {!collapsed && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* ── Content ── */}
        <main className="admin-content">
          <div className="admin-topbar">
            <button className="admin-topbar-btn admin-mobile-toggle" onClick={() => setMobileOpen(v => !v)}>
              <Menu size={18} />
            </button>
            <div className="admin-topbar-title">Admin Portal</div>
            <div className="admin-topbar-actions">
              <NotificationBell buttonClassName="admin-topbar-btn" accent="#7C5CFC" />
            </div>
          </div>

          <div className="admin-page">
            <Routes>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="law-firms" element={<LawFirmsPage />} />
              <Route path="recovery-cases" element={<RecoveryCasesPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </>
  );
}
