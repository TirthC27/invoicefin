import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../lib/api';

const REFRESH_MS = 30000;

function formatNotificationTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'Now';
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function NotificationBell({ buttonClassName = '', buttonStyle = {}, accent = '#7C5CFC' }) {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const unreadCount = useMemo(
    () => notifications.filter(notification => !notification.read).length,
    [notifications]
  );

  const loadNotifications = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');

    try {
      const data = await notificationsApi.list();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setError('Unable to load notifications');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const timer = window.setInterval(() => loadNotifications({ silent: true }), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadNotifications]);

  useEffect(() => {
    function handleDocumentClick(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  const handleToggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      loadNotifications({ silent: notifications.length > 0 });
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      try {
        const updated = await notificationsApi.markRead(notification.id);
        setNotifications(current =>
          current.map(item => (item.id === notification.id ? updated : item))
        );
      } catch {
        setError('Unable to mark notification read');
        return;
      }
    }

    setOpen(false);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications(current => current.map(item => ({ ...item, read: true })));
    } catch {
      setError('Unable to mark notifications read');
    }
  };

  return (
    <div className="notif-root" ref={rootRef}>
      <style>{`
        .notif-root { position: relative; display: inline-flex; }
        .notif-button { position: relative; }
        .notif-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 999px;
          background: #EF4444;
          color: #fff;
          border: 2px solid #0B0B0F;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          line-height: 1;
        }
        .notif-menu {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: min(360px, calc(100vw - 32px));
          max-height: 430px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          background: #111116;
          box-shadow: 0 20px 60px rgba(0,0,0,0.45);
          z-index: 200;
        }
        .notif-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 14px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .notif-title { color: #fff; font-size: 14px; font-weight: 700; }
        .notif-mark {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.08);
          background: transparent;
          color: #A0A0A8;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .notif-mark:disabled { opacity: 0.45; cursor: default; }
        .notif-mark:not(:disabled):hover {
          border-color: ${accent};
          color: ${accent};
          background: rgba(255,255,255,0.04);
        }
        .notif-list { max-height: 360px; overflow-y: auto; }
        .notif-item {
          width: 100%;
          display: grid;
          grid-template-columns: 8px 1fr auto;
          gap: 10px;
          padding: 13px 14px;
          border: 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: transparent;
          color: #fff;
          text-align: left;
          font-family: inherit;
          cursor: pointer;
        }
        .notif-item:hover { background: rgba(255,255,255,0.04); }
        .notif-dot {
          width: 8px;
          height: 8px;
          margin-top: 5px;
          border-radius: 999px;
          background: ${accent};
          opacity: 0;
        }
        .notif-dot.unread { opacity: 1; }
        .notif-message {
          min-width: 0;
          color: #E8E8EA;
          font-size: 13px;
          font-weight: 500;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }
        .notif-item.read .notif-message { color: #A0A0A8; font-weight: 400; }
        .notif-time {
          color: #6F6F78;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          padding-top: 2px;
        }
        .notif-state {
          padding: 28px 18px;
          color: #A0A0A8;
          font-size: 13px;
          text-align: center;
        }
      `}</style>

      <button
        className={`${buttonClassName} notif-button`}
        style={buttonStyle}
        onClick={handleToggle}
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-menu">
          <div className="notif-header">
            <div className="notif-title">Notifications</div>
            <button
              className="notif-mark"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              aria-label="Mark all read"
              title="Mark all read"
            >
              <CheckCheck size={16} />
            </button>
          </div>

          <div className="notif-list">
            {loading && <div className="notif-state">Loading...</div>}
            {!loading && error && <div className="notif-state">{error}</div>}
            {!loading && !error && notifications.length === 0 && (
              <div className="notif-state">No notifications</div>
            )}
            {!loading && !error && notifications.map(notification => (
              <button
                key={notification.id}
                className={`notif-item ${notification.read ? 'read' : 'unread'}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <span className={`notif-dot ${notification.read ? '' : 'unread'}`} />
                <span className="notif-message">{notification.message}</span>
                <span className="notif-time">{formatNotificationTime(notification.created_at)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
