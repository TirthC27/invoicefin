import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { lawfirmApi } from '../../lib/api';
import { Scale, Eye } from 'lucide-react';

const STAGE_COLORS = {
  DEFAULT: { bg: 'rgba(156,163,175,0.08)', color: '#9CA3AF', border: 'rgba(156,163,175,0.2)' },
  LEGAL_NOTICE_SENT: { bg: 'rgba(245,158,11,0.08)', color: '#F59E0B', border: 'rgba(245,158,11,0.2)' },
  NEGOTIATION: { bg: 'rgba(59,130,246,0.08)', color: '#3B82F6', border: 'rgba(59,130,246,0.2)' },
  SETTLEMENT: { bg: 'rgba(124,92,252,0.08)', color: '#7C5CFC', border: 'rgba(124,92,252,0.2)' },
  RECOVERED: { bg: 'rgba(34,197,94,0.08)', color: '#22C55E', border: 'rgba(34,197,94,0.2)' },
  CLOSED: { bg: 'rgba(107,114,128,0.08)', color: '#6B7280', border: 'rgba(107,114,128,0.2)' },
};

const PRIORITY_COLORS = { LOW: '#9CA3AF', MEDIUM: '#F59E0B', HIGH: '#EF4444', CRITICAL: '#DC2626' };

export default function AssignedCasesPage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await lawfirmApi.listCases();
        setCases(data);
      } catch (err) {
        console.error('Failed to load cases:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return (
    <>
      <style>{`
        .ac-title { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 8px; }
        .ac-subtitle { font-size: 14px; color: #A0A0A8; margin-bottom: 24px; }
        .ac-table-wrap { background: #151518; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; overflow-x: auto; }
        .ac-table { width: 100%; border-collapse: collapse; min-width: 800px; }
        .ac-table th { text-align: left; padding: 14px 16px; font-size: 12px; font-weight: 600; color: #A0A0A8; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); white-space: nowrap; }
        .ac-table td { padding: 14px 16px; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .ac-table tr:last-child td { border-bottom: none; }
        .ac-table tr:hover td { background: rgba(34,197,94,0.03); }
        .ac-view-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 16px; border-radius: 8px; background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.2); color: #22C55E; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .ac-view-btn:hover { background: rgba(34,197,94,0.15); box-shadow: 0 2px 8px rgba(34,197,94,0.15); }
        .ac-empty { text-align: center; padding: 48px 20px; color: #A0A0A8; }
      `}</style>

      <h1 className="ac-title">Assigned Cases</h1>
      <p className="ac-subtitle">Recovery cases assigned to your firm</p>

      <div className="ac-table-wrap">
        {loading ? (
          <div className="ac-empty">Loading...</div>
        ) : cases.length === 0 ? (
          <div className="ac-empty">
            <Scale size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p>No cases assigned to your firm yet.</p>
          </div>
        ) : (
          <table className="ac-table">
            <thead>
              <tr>
                <th>Case</th>
                <th>Pool / Invoice</th>
                <th>Exporter</th>
                <th>Outstanding</th>
                <th>Assigned</th>
                <th>Stage</th>
                <th>Priority</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {cases.map(c => {
                const stageStyle = STAGE_COLORS[c.recovery_stage] || STAGE_COLORS.DEFAULT;
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>#{c.id}</td>
                    <td>Pool #{c.pool_contract_id}</td>
                    <td style={{ color: '#A0A0A8' }}>{c.exporter_email}</td>
                    <td style={{ fontWeight: 600 }}>{Number(c.outstanding_amount).toFixed(4)}</td>
                    <td style={{ color: '#A0A0A8', fontSize: 12 }}>
                      {c.assigned_date ? new Date(c.assigned_date).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: stageStyle.bg, color: stageStyle.color,
                        border: `1px solid ${stageStyle.border}`, whiteSpace: 'nowrap',
                      }}>
                        {c.recovery_stage.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: PRIORITY_COLORS[c.priority] || '#9CA3AF',
                        }} />
                        {c.priority}
                      </span>
                    </td>
                    <td>
                      <button className="ac-view-btn" onClick={() => navigate(`/lawfirm/cases/${c.id}`)}>
                        <Eye size={14} /> View Case
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
