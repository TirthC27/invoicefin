import React, { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import { Scale, X } from 'lucide-react';

const STAGE_COLORS = {
  DEFAULT:           { bg: 'rgba(156,163,175,0.08)', color: '#6b7280' },
  LEGAL_NOTICE_SENT: { bg: 'rgba(245,158,11,0.08)',  color: '#d97706' },
  NEGOTIATION:       { bg: 'rgba(59,130,246,0.08)',  color: '#2563eb' },
  SETTLEMENT:        { bg: 'rgba(124,92,252,0.08)',  color: '#7C5CFC' },
  RECOVERED:         { bg: 'rgba(34,197,94,0.08)',   color: '#16a34a' },
  CLOSED:            { bg: 'var(--bg-muted)',         color: 'var(--fg-muted)' },
};

const PRIORITY_COLORS = { LOW: '#9CA3AF', MEDIUM: '#d97706', HIGH: '#dc2626', CRITICAL: '#991b1b' };

function StageBadge({ stage }) {
  const s = STAGE_COLORS[stage] || STAGE_COLORS.DEFAULT;
  return <span style={{ padding: '3px 10px', borderRadius: 50, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>{stage.replace(/_/g, ' ')}</span>;
}

function PriorityDot({ priority }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: PRIORITY_COLORS[priority] || '#9CA3AF' }} />
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
      const [casesData, firmsData] = await Promise.all([adminApi.listRecoveryCases(), adminApi.listLawFirms()]);
      setCases(casesData); setFirms(firmsData.filter(f => f.status === 'ACTIVE'));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAssign = async (caseId) => {
    if (!selectedFirmId) return;
    try { await adminApi.assignLawFirm(caseId, parseInt(selectedFirmId)); setAssigningId(null); setSelectedFirmId(''); fetchData(); }
    catch (err) { console.error(err); }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Recovery Cases</h1>
          <p>Manage and assign recovery cases to law firms</p>
        </div>
      </div>

      <div className="data-card">
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--fg-muted)' }}>Loading...</div>
          ) : cases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--fg-muted)' }}>
              <Scale size={36} style={{ opacity: 0.25, margin: '0 auto 12px' }} />
              <p>No recovery cases yet.</p>
            </div>
          ) : (
            <table className="data-table" style={{ minWidth: 900 }}>
              <thead><tr>
                <th>ID</th><th>Pool / Invoice</th><th>Exporter</th><th>Investor</th>
                <th>Outstanding</th><th>Stage</th><th>Priority</th><th>Law Firm</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {cases.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>#{c.id}</td>
                    <td>Pool #{c.pool_contract_id} <span style={{ color: 'var(--fg-muted)' }}>({c.pool_name})</span></td>
                    <td style={{ color: 'var(--fg-muted)' }}>{c.exporter_email}</td>
                    <td style={{ color: 'var(--fg-muted)' }}>{c.investor_email}</td>
                    <td style={{ fontWeight: 600 }}>{Number(c.outstanding_amount).toFixed(4)}</td>
                    <td><StageBadge stage={c.recovery_stage} /></td>
                    <td><PriorityDot priority={c.priority} /></td>
                    <td>
                      {c.law_firm_name
                        ? <span style={{ color: 'var(--color-positive)', fontWeight: 500 }}>{c.law_firm_name}</span>
                        : <span style={{ color: 'var(--fg-muted)', fontStyle: 'italic' }}>Unassigned</span>}
                    </td>
                    <td>
                      {assigningId === c.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <select
                            className="form-input"
                            style={{ height: 34, padding: '0 10px', fontSize: 12, minWidth: 160 }}
                            value={selectedFirmId}
                            onChange={e => setSelectedFirmId(e.target.value)}>
                            <option value="">Select firm...</option>
                            {firms.map(f => <option key={f.id} value={f.id}>{f.firm_name}</option>)}
                          </select>
                          <button className="btn btn-primary btn-sm" onClick={() => handleAssign(c.id)}>Assign</button>
                          <button className="btn btn-outline btn-sm" onClick={() => { setAssigningId(null); setSelectedFirmId(''); }}><X size={13} /></button>
                        </div>
                      ) : (
                        <button className="btn btn-outline btn-sm" onClick={() => setAssigningId(c.id)}>
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
      </div>
    </>
  );
}
