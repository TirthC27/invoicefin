import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { lawfirmApi } from '../../lib/api';
import { Scale, Eye } from 'lucide-react';

const STAGE_COLORS = {
  DEFAULT:           { bg: 'rgba(156,163,175,0.08)', color: '#6b7280' },
  LEGAL_NOTICE_SENT: { bg: 'rgba(245,158,11,0.08)',  color: '#d97706' },
  NEGOTIATION:       { bg: 'rgba(59,130,246,0.08)',  color: '#2563eb' },
  SETTLEMENT:        { bg: 'rgba(124,92,252,0.08)',  color: '#7C5CFC' },
  RECOVERED:         { bg: 'rgba(34,197,94,0.08)',   color: '#16a34a' },
  CLOSED:            { bg: 'var(--bg-muted)',         color: 'var(--fg-muted)' },
};

const PRIORITY_COLORS = { LOW: '#16a34a', MEDIUM: '#d97706', HIGH: '#dc2626', CRITICAL: '#991b1b' };

export default function AssignedCasesPage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCases = async () => {
      try { const data = await lawfirmApi.listCases(); setCases(data); }
      catch (err) { console.error('Failed to load cases:', err); }
      finally { setLoading(false); }
    };
    fetchCases();
  }, []);

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Assigned Cases</h1>
          <p>Recovery cases assigned to your firm</p>
        </div>
      </div>

      <div className="data-card">
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--fg-muted)' }}>Loading...</div>
          ) : cases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--fg-muted)' }}>
              <Scale size={36} style={{ opacity: 0.25, margin: '0 auto 12px' }} />
              <p>No cases assigned to your firm yet.</p>
            </div>
          ) : (
            <table className="data-table" style={{ minWidth: 800 }}>
              <thead><tr>
                <th>Case</th><th>Pool / Invoice</th><th>Exporter</th>
                <th>Outstanding</th><th>Assigned</th><th>Stage</th><th>Priority</th><th>Action</th>
              </tr></thead>
              <tbody>
                {cases.map(c => {
                  const st = STAGE_COLORS[c.recovery_stage] || STAGE_COLORS.DEFAULT;
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>#{c.id}</td>
                      <td>Pool #{c.pool_contract_id}</td>
                      <td style={{ color: 'var(--fg-muted)' }}>{c.exporter_email}</td>
                      <td style={{ fontWeight: 600 }}>{Number(c.outstanding_amount).toFixed(4)}</td>
                      <td style={{ color: 'var(--fg-muted)', fontSize: 12 }}>
                        {c.assigned_date ? new Date(c.assigned_date).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <span style={{ padding: '3px 10px', borderRadius: 50, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color, whiteSpace: 'nowrap' }}>
                          {c.recovery_stage.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: PRIORITY_COLORS[c.priority] || '#9CA3AF' }} />
                          {c.priority}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-outline btn-sm" style={{ color: 'var(--color-positive)', borderColor: 'rgba(34,197,94,0.3)' }}
                          onClick={() => navigate(`/lawfirm/cases/${c.id}`)}>
                          <Eye size={13} /> View Case
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
