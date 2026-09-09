import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, User, Settings } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import NotificationBell from './NotificationBell';

/**
 * AppHeader — top horizontal navigation bar.
 * Mirrors the ecommerce-analytics header design:
 *   Left: Logo  |  Center: pill nav  |  Right: notifications + user dropdown
 *
 * @param {Array} navItems  - [{ to, label, icon? }]
 * @param {string} portalName - e.g. "Investor Portal"
 * @param {string} accentColor - active nav highlight color
 */
export default function AppHeader({ navItems = [], portalName = 'InvoiceFi', accentColor, rightExtra }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (!dropdownRef.current?.contains(e.target)) setDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const initials = (user?.full_name || user?.email || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const roleLabel = {
    INVESTOR: 'Investor',
    ADMIN: 'Administrator',
    LAW_FIRM: 'Law Firm',
    EXPORTER: 'Exporter',
  }[user?.role] || user?.role || 'User';

  // Dynamic active style based on accent
  const activeStyle = accentColor
    ? { background: accentColor, color: '#1a1a18', fontWeight: 600 }
    : {};

  return (
    <div className="app-header-wrapper">
      <header className="app-header">
        {/* ── Logo ── */}
        <div className="app-header-logo" onClick={() => navigate('/')}>
          <div className="app-header-logo-lines">
            <span />
            <span />
            <span />
          </div>
          <span>InvoiceFi</span>
        </div>

        {/* ── Pill Nav ── */}
        <nav className="app-header-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `app-header-nav-item${isActive ? ' active' : ''}`
              }
            >
              {item.icon && <item.icon size={14} />}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* ── Right Actions ── */}
        <div className="app-header-actions">
          {/* Any extra content injected by portal (e.g. wallet button) */}
          {rightExtra}

          {/* Notification Bell */}
          <div style={{ position: 'relative' }}>
            <NotificationBell
              buttonClassName="app-header-icon-btn"
              accent="#ffffff"
            />
          </div>

          {/* User Dropdown */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              className="app-header-user-btn"
              onClick={() => setDropdownOpen(v => !v)}
            >
              <div className="app-header-avatar">
                {initials}
              </div>
              <div className="app-header-user-info">
                <div className="app-header-user-name">
                  {user?.full_name || user?.email?.split('@')[0] || 'User'}
                </div>
                <div className="app-header-user-role">{roleLabel}</div>
              </div>
              <ChevronDown size={13} style={{ color: 'var(--fg-muted)' }} />
            </button>

            {dropdownOpen && (
              <div className="app-dropdown">
                <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)' }}>
                    {user?.full_name || user?.email?.split('@')[0]}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>
                    {user?.email}
                  </div>
                </div>
                <div style={{ padding: '4px' }}>
                  <button className="app-dropdown-item">
                    <User size={14} />
                    Profile
                  </button>
                  <button className="app-dropdown-item">
                    <Settings size={14} />
                    Settings
                  </button>
                  <div className="app-dropdown-divider" />
                  <button className="app-dropdown-item danger" onClick={handleSignOut}>
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}
