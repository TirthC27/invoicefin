import React, { useState } from 'react';
import { Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useWallet } from '../../context/useWallet';
import {
  LayoutDashboard, Briefcase, TrendingUp, Shield,
  LogOut, ChevronLeft, Menu, Wallet
} from 'lucide-react';
import NotificationBell from '../../components/NotificationBell';
import InvestorDashboard from './InvestorDashboard';
import PoolsPage from './PoolsPage';
import PoolDetailPage from './PoolDetailPage';
import PortfolioPage from './PortfolioPage';
import RecoveryViewPage from './RecoveryViewPage';

const sidebarItems = [
  { to: '/investor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/investor/pools', icon: Briefcase, label: 'Invest' },
  { to: '/investor/portfolio', icon: TrendingUp, label: 'Portfolio' },
  { to: '/investor/recovery', icon: Shield, label: 'Recovery' },
];

export default function InvestorLayout() {
  const { user, signOut } = useAuth();
  const wallet = useWallet();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => { await signOut(); navigate('/login'); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .inv-root { display: flex; min-height: 100vh; background: #0B0B0F; color: #fff; font-family: 'Inter', sans-serif; }
        .inv-sidebar { width: ${collapsed ? '72px' : '260px'}; background: #111116; border-right: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column; transition: width 0.25s ease; position: fixed; top: 0; left: 0; bottom: 0; z-index: 100; }
        .inv-sidebar-header { padding: 20px ${collapsed ? '16px' : '24px'}; display: flex; align-items: center; justify-content: ${collapsed ? 'center' : 'space-between'}; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .inv-logo { display: flex; align-items: center; gap: 10px; font-size: 17px; font-weight: 700; white-space: nowrap; overflow: hidden; }
        .inv-logo-dot { width: 8px; height: 8px; border-radius: 50%; background: linear-gradient(135deg, #7C5CFC, #6B48F5); flex-shrink: 0; }
        .inv-nav { flex: 1; padding: 12px 8px; display: flex; flex-direction: column; gap: 2px; }
        .inv-nav-item { display: flex; align-items: center; gap: 12px; padding: ${collapsed ? '12px' : '10px 16px'}; border-radius: 10px; color: #A0A0A8; font-size: 14px; font-weight: 500; text-decoration: none; transition: all 0.2s; justify-content: ${collapsed ? 'center' : 'flex-start'}; }
        .inv-nav-item:hover { background: rgba(124,92,252,0.08); color: #fff; }
        .inv-nav-item.active { background: rgba(124,92,252,0.12); color: #7C5CFC; }
        .inv-nav-item svg { width: 20px; height: 20px; flex-shrink: 0; }
        .inv-nav-label { ${collapsed ? 'display: none;' : ''} white-space: nowrap; }
        .inv-sidebar-footer { padding: 16px ${collapsed ? '8px' : '16px'}; border-top: 1px solid rgba(255,255,255,0.06); }
        .inv-user-card { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 10px; }
        .inv-user-avatar { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #7C5CFC, #6B48F5); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; flex-shrink: 0; }
        .inv-user-info { ${collapsed ? 'display:none;' : ''} overflow: hidden; }
        .inv-user-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .inv-user-role { font-size: 11px; color: #A0A0A8; }
        .inv-content { flex: 1; margin-left: ${collapsed ? '72px' : '260px'}; transition: margin-left 0.25s ease; }
        .inv-topbar { height: 64px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between; padding: 0 32px; background: rgba(11,11,15,0.8); backdrop-filter: blur(12px); position: sticky; top: 0; z-index: 50; }
        .inv-topbar-actions { display: flex; align-items: center; gap: 12px; }
        .inv-topbar-btn { height: 36px; padding: 0 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: #A0A0A8; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; font-size: 13px; font-family: inherit; transition: all 0.2s; }
        .inv-topbar-btn:hover { border-color: rgba(124,92,252,0.3); color: #7C5CFC; background: rgba(124,92,252,0.06); }
        .inv-wallet-connected { border-color: rgba(34,197,94,0.3) !important; color: #22C55E !important; }
        .inv-page { padding: 32px; }
        .inv-wallet-warning { display: flex; align-items: flex-start; gap: 10px; margin: 16px 32px 0; padding: 12px 14px; border-radius: 10px; border: 1px solid rgba(245,158,11,0.28); background: rgba(245,158,11,0.08); color: #FBBF24; font-size: 13px; line-height: 1.45; }
        .inv-collapse-btn { width: 28px; height: 28px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: #A0A0A8; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }
        .inv-collapse-btn:hover { color: #fff; border-color: rgba(255,255,255,0.15); }
        .inv-signout-btn { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; color: #A0A0A8; font-size: 13px; font-weight: 500; background: none; border: none; cursor: pointer; width: 100%; transition: all 0.2s; justify-content: ${collapsed ? 'center' : 'flex-start'}; font-family: inherit; }
        .inv-signout-btn:hover { background: rgba(239,68,68,0.08); color: #EF4444; }
        @media (max-width: 768px) {
          .inv-sidebar { transform: translateX(-100%); width: 260px; }
          .inv-content { margin-left: 0; }
        }
      `}</style>

      <div className="inv-root">
        <aside className="inv-sidebar">
          <div className="inv-sidebar-header">
            <div className="inv-logo">
              <div className="inv-logo-dot" />
              {!collapsed && <span>InvoiceFi</span>}
            </div>
            {!collapsed && (
              <button className="inv-collapse-btn" onClick={() => setCollapsed(true)}>
                <ChevronLeft size={16} />
              </button>
            )}
            {collapsed && (
              <button className="inv-collapse-btn" onClick={() => setCollapsed(false)}
                style={{ position: 'absolute', right: -14, top: 24, background: '#111116', border: '1px solid rgba(255,255,255,0.1)', zIndex: 10 }}>
                <Menu size={14} />
              </button>
            )}
          </div>
          <nav className="inv-nav">
            {sidebarItems.map(item => (
              <NavLink key={item.to} to={item.to}
                className={({ isActive }) => `inv-nav-item ${isActive ? 'active' : ''}`}>
                <item.icon />
                <span className="inv-nav-label">{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="inv-sidebar-footer">
            <div className="inv-user-card">
              <div className="inv-user-avatar">{(user?.email || 'I')[0].toUpperCase()}</div>
              <div className="inv-user-info">
                <div className="inv-user-name">{user?.full_name || user?.email || 'Investor'}</div>
                <div className="inv-user-role">Investor</div>
              </div>
            </div>
            <button className="inv-signout-btn" onClick={handleSignOut}>
              <LogOut size={18} />
              {!collapsed && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        <main className="inv-content">
          <div className="inv-topbar">
            <div style={{ fontSize: 15, fontWeight: 600 }}>Investor Portal</div>
            <div className="inv-topbar-actions">
              <button className={`inv-topbar-btn ${wallet?.isConnected ? 'inv-wallet-connected' : ''}`}
                onClick={wallet?.isConnected ? undefined : wallet?.connectWallet}>
                <Wallet size={16} />
                {wallet?.isConnected ? wallet.truncatedAddress : 'Connect Wallet'}
              </button>
              <NotificationBell
                buttonClassName="inv-topbar-btn"
                buttonStyle={{ padding: '0 10px' }}
                accent="#7C5CFC"
              />
            </div>
          </div>
          {wallet?.walletRpcWarning && (
            <div className="inv-wallet-warning">
              <AlertTriangle size={18} />
              <span>{wallet.walletRpcWarning}</span>
            </div>
          )}
          <div className="inv-page">
            <Routes>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<InvestorDashboard />} />
              <Route path="pools" element={<PoolsPage />} />
              <Route path="pools/:id" element={<PoolDetailPage />} />
              <Route path="portfolio" element={<PortfolioPage />} />
              <Route path="recovery" element={<RecoveryViewPage />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </>
  );
}
