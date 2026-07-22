import React, { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import { Users } from 'lucide-react';

const ROLE_COLORS = {
  INVESTOR: { bg: 'rgba(59,130,246,0.08)', color: '#3B82F6', border: 'rgba(59,130,246,0.2)' },
  EXPORTER: { bg: 'rgba(245,158,11,0.08)', color: '#F59E0B', border: 'rgba(245,158,11,0.2)' },
  LAW_FIRM: { bg: 'rgba(124,92,252,0.08)', color: '#7C5CFC', border: 'rgba(124,92,252,0.2)' },
  ADMIN: { bg: 'rgba(239,68,68,0.08)', color: '#EF4444', border: 'rgba(239,68,68,0.2)' },
};

function RoleBadge({ role }) {
  const r = ROLE_COLORS[role] || ROLE_COLORS.INVESTOR;
  return (
    <span style={{
      padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: r.bg, color: r.color, border: `1px solid ${r.border}`,
    }}>
      {role.replace('_', ' ')}
    </span>
  );
}

function StatusBadge({ status }) {
  const isActive = status === 'ACTIVE';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: isActive ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
      color: isActive ? '#22C55E' : '#EF4444',
      border: `1px solid ${isActive ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: isActive ? '#22C55E' : '#EF4444',
      }} />
      {status}
    </span>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await adminApi.listUsers(roleFilter || null);
        setUsers(data);
      } catch (err) {
        console.error('Failed to load users:', err);
      } finally {
        setLoading(false);
      }
    };
    setLoading(true);
    fetchUsers();
  }, [roleFilter]);

  return (
    <>
      <style>{`
        .up-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .up-title { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .up-subtitle { font-size: 14px; color: #A0A0A8; margin-top: 4px; }
        .up-filter-row { display: flex; gap: 8px; }
        .up-filter-btn { padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: #A0A0A8; font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .up-filter-btn:hover { border-color: rgba(124,92,252,0.3); color: #7C5CFC; }
        .up-filter-btn.active { background: rgba(124,92,252,0.1); border-color: rgba(124,92,252,0.3); color: #7C5CFC; }
        .up-table-wrap { background: #151518; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; overflow: hidden; }
        .up-table { width: 100%; border-collapse: collapse; }
        .up-table th { text-align: left; padding: 14px 20px; font-size: 12px; font-weight: 600; color: #A0A0A8; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); }
        .up-table td { padding: 14px 20px; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .up-table tr:last-child td { border-bottom: none; }
        .up-table tr:hover td { background: rgba(124,92,252,0.03); }
        .up-empty { text-align: center; padding: 48px 20px; color: #A0A0A8; }
      `}</style>

      <div className="up-header">
        <div>
          <h1 className="up-title">Users</h1>
          <p className="up-subtitle">All registered users across roles</p>
        </div>
        <div className="up-filter-row">
          {['', 'INVESTOR', 'EXPORTER', 'LAW_FIRM', 'ADMIN'].map(r => (
            <button key={r}
              className={`up-filter-btn ${roleFilter === r ? 'active' : ''}`}
              onClick={() => setRoleFilter(r)}>
              {r || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="up-table-wrap">
        {loading ? (
          <div className="up-empty">Loading...</div>
        ) : users.length === 0 ? (
          <div className="up-empty">
            <Users size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p>No users found.</p>
          </div>
        ) : (
          <table className="up-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Full Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.email}</td>
                  <td style={{ color: u.full_name ? '#fff' : '#A0A0A8' }}>
                    {u.full_name || '—'}
                  </td>
                  <td><RoleBadge role={u.role} /></td>
                  <td><StatusBadge status={u.status} /></td>
                  <td style={{ color: '#A0A0A8', fontSize: 12 }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
