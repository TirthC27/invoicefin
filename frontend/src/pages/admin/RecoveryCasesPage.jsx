import React, { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import { Scale, X, ChevronDown } from 'lucide-react';

const STAGE_COLORS = {
  DEFAULT: { bg: 'rgba(156,163,175,0.08)', color: '#9CA3AF', border: 'rgba(156,163,175,0.2)' },
  LEGAL_NOTICE_SENT: { bg: 'rgba(245,158,11,0.08)', color: '#F59E0B', border: 'rgba(245,158,11,0.2)' },
  NEGOTIATION: { bg: 'rgba(59,130,246,0.08)', color: '#3B82F6', border: 'rgba(59,130,246,0.2)' },
  SETTLEMENT: { bg: 'rgba(124,92,252,0.08)', color: '#7C5CFC', border: 'rgba(124,92,252,0.2)' },
  RECOVERED: { bg: 'rgba(34,197,94,0.08)', color: '#22C55E', border: 'rgba(34,197,94,0.2)' },
  CLOSED: { bg: 'rgba(107,114,128,0.08)', color: '#6B7280', border: 'rgba(107,114,128,0.2)' },
};

const PRIORITY_COLORS = {
  LOW: '#9CA3AF', MEDIUM: '#F59E0B', HIGH: '#EF4444', CRITICAL: '#DC2626',
};

function StageBadge({ stage }) {
  const s = STAGE_COLORS[stage] || STAGE_COLORS.DEFAULT;
  return (
    <span style={{
      padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap',
    }}>
      {stage.replace(/_/g, ' ')}
    </span>
  );
}

function PriorityDot({ priority }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: PRIORITY_COLORS[priority] || '#9CA3AF',
      }} />
      {priority}
    </span>
  );
}

export default function RecoveryCasesPage() {
  const [cases, setCases] = useState([]);
  const [firms, setFirms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);
  const [selectedFirmId, setSelectedFirmId] = useState('');

  const fetchData = async () => {
    try {
      const [casesData, firmsData] = await Promise.all([
        adminApi.listRecoveryCases(),
        adminApi.listLawFirms(),
      ]);
      setCases(casesData);
      setFirms(firmsData.filter(f => f.status === 'ACTIVE'));
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAssign = async (caseId) => {
    if (!selectedFirmId) return;
    try {
      await adminApi.assignLawFirm(caseId, parseInt(selectedFirmId));
      setAssigningId(null);
      setSelectedFirmId('');
      fetchData();
    } catch (err) {
      console.error('Failed to assign:', err);
    }
  };

  return (
    <>
      <style>{`
        .rc-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .rc-title { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .rc-subtitle { font-size: 14px; color: #A0A0A8; margin-top: 4px; }
        .rc-table-wrap { background: #151518; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; overflow-x: auto; }
        .rc-table { width: 100%; border-collapse: collapse; min-width: 900px; }
        .rc-table th { text-align: left; padding: 14px 16px; font-size: 12px; font-weight: 600; color: #A0A0A8; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); white-space: nowrap; }
        .rc-table td { padding: 14px 16px; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .rc-table tr:last-child td { border-bottom: none; }
        .rc-table tr:hover td { background: rgba(124,92,252,0.03); }
        .rc-assign-wrap { display: flex; align-items: center; gap: 8px; }
        .rc-select { height: 34px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 12px; padding: 0 10px; outline: none; font-family: inherit; min-width: 160px; }
        .rc-assign-btn { padding: 6px 12px; border-radius: 8px; background: linear-gradient(135deg, #7C5CFC, #6B48F5); color: #fff; border: none; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; white-space: nowrap; }
        .rc-assign-btn:hover { box-shadow: 0 4px 12px rgba(124,92,252,0.3); }
        .rc-cancel-btn { padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: #A0A0A8; cursor: pointer; font-size: 12px; font-family: inherit; }
        .rc-action-btn { padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(124,92,252,0.2); background: transparent; color: #7C5CFC; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .rc-action-btn:hover { background: rgba(124,92,252,0.08); }
        .rc-empty { text-align: center; padding: 48px 20px; color: #A0A0A8; }
      `}</style>

      <div className="rc-header">
        <div>
          <h1 className="rc-title">Recovery Cases</h1>
          <p className="rc-subtitle">Manage and assign recovery cases to law firms</p>
        </div>
      </div>

      <div className="rc-table-wrap">
        {loading ? (
          <div className="rc-empty">Loading...</div>
        ) : cases.length === 0 ? (
          <div className="rc-empty">
            <Scale size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p>No recovery cases yet.</p>
          </div>
        ) : (
          <table className="rc-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Pool / Invoice</th>
                <th>Exporter</th>
                <th>Investor</th>
                <th>Outstanding</th>
                <th>Stage</th>
                <th>Priority</th>
                <th>Law Firm</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cases.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>#{c.id}</td>
                  <td>Pool #{c.pool_contract_id} <span style={{ color: '#A0A0A8' }}>({c.pool_name})</span></td>
                  <td style={{ color: '#A0A0A8' }}>{c.exporter_email}</td>
                  <td style={{ color: '#A0A0A8' }}>{c.investor_email}</td>
                  <td style={{ fontWeight: 600 }}>{Number(c.outstanding_amount).toFixed(4)}</td>
                  <td><StageBadge stage={c.recovery_stage} /></td>
                  <td><PriorityDot priority={c.priority} /></td>
                  <td>
                    {c.law_firm_name ? (
                      <span style={{ color: '#22C55E', fontWeight: 500 }}>{c.law_firm_name}</span>
                    ) : (
                      <span style={{ color: '#A0A0A8', fontStyle: 'italic' }}>Unassigned</span>
                    )}
                  </td>
                  <td>
                    {assigningId === c.id ? (
                      <div className="rc-assign-wrap">
                        <select className="rc-select" value={selectedFirmId}
                          onChange={e => setSelectedFirmId(e.target.value)}>
                          <option value="">Select firm...</option>
                          {firms.map(f => (
                            <option key={f.id} value={f.id}>{f.firm_name}</option>
                          ))}
                        </select>
                        <button className="rc-assign-btn" onClick={() => handleAssign(c.id)}>Assign</button>
                        <button className="rc-cancel-btn" onClick={() => { setAssigningId(null); setSelectedFirmId(''); }}>
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button className="rc-action-btn" onClick={() => setAssigningId(c.id)}>
                        {c.law_firm_name ? 'Reassign' : 'Assign Law Firm'}
                      </button>
                    )}
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
