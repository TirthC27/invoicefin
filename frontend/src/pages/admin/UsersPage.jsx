import React, { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import { Users } from 'lucide-react';

const ROLE_COLORS = {
  INVESTOR: { bg: 'rgba(59,130,246,0.08)', color: '#2563eb' },
  EXPORTER: { bg: 'rgba(245,158,11,0.08)', color: '#d97706' },
  LAW_FIRM: { bg: 'rgba(124,92,252,0.08)', color: '#7C5CFC' },
  ADMIN:    { bg: 'rgba(239,68,68,0.08)',  color: '#dc2626' },
};

function RoleBadge({ role }) {
  const r = ROLE_COLORS[role] || ROLE_COLORS.INVESTOR;
  return (
    <span style={{ padding: '3px 10px', borderRadius: 50, fontSize: 11, fontWeight: 600, background: r.bg, color: r.color }}>
      {role.replace('_', ' ')}
    </span>
  );
}

function StatusBadge({ status }) {
  const isActive = status === 'ACTIVE';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 50, fontSize: 11, fontWeight: 600, background: isActive ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', color: isActive ? '#16a34a' : '#dc2626' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: isActive ? '#16a34a' : '#dc2626' }} />
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
      try { const data = await adminApi.listUsers(roleFilter || null); setUsers(data); }
      catch (err) { console.error('Failed to load users:', err); }
      finally { setLoading(false); }
    };
    setLoading(true);
    fetchUsers();
  }, [roleFilter]);

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Users</h1>
          <p>All registered users across roles</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['', 'INVESTOR', 'EXPORTER', 'LAW_FIRM', 'ADMIN'].map(r => (
            <button key={r}
              onClick={() => setRoleFilter(r)}
              className="btn btn-outline btn-sm"
              style={roleFilter === r ? { background: 'var(--color-accent)', borderColor: 'var(--color-accent)', fontWeight: 600 } : {}}>
              {r || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="data-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--fg-muted)' }}>Loading...</div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--fg-muted)' }}>
            <Users size={36} style={{ opacity: 0.25, margin: '0 auto 12px' }} />
            <p>No users found.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead><tr>
              <th>Email</th><th>Full Name</th><th>Role</th><th>Status</th><th>Joined</th>
            </tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.email}</td>
                  <td style={{ color: u.full_name ? 'var(--fg-primary)' : 'var(--fg-muted)' }}>{u.full_name || '—'}</td>
                  <td><RoleBadge role={u.role} /></td>
                  <td><StatusBadge status={u.status} /></td>
                  <td style={{ color: 'var(--fg-muted)', fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
