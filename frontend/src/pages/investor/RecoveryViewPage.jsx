import React, { useEffect, useState } from 'react';
import { investorApi } from '../../lib/api';
import { Shield, Clock, FileText, Scale, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

const STAGE_STYLES = {
  DEFAULT:           { bg: 'rgba(239,68,68,0.08)',  color: '#dc2626', label: 'Default' },
  LEGAL_NOTICE_SENT: { bg: 'rgba(245,158,11,0.08)', color: '#d97706', label: 'Legal Notice Sent' },
  NEGOTIATION:       { bg: 'rgba(59,130,246,0.08)', color: '#2563eb', label: 'Negotiation' },
  SETTLEMENT:        { bg: 'rgba(124,92,252,0.08)', color: '#7C5CFC', label: 'Settlement' },
  RECOVERED:         { bg: 'rgba(34,197,94,0.08)',  color: '#16a34a', label: 'Recovered' },
  CLOSED:            { bg: 'var(--bg-muted)',        color: 'var(--fg-muted)', label: 'Closed' },
};

const EVENT_ICONS = {
  LEGAL_NOTICE_SENT: Scale,
  NEGOTIATION_STARTED: FileText,
  SETTLEMENT_RECORDED: CheckCircle2,
  PARTIAL_RECOVERY: Clock,
  FULL_RECOVERY: CheckCircle2,
  CASE_CLOSED: Shield,
  DOCUMENT_UPLOADED: FileText,
  NOTE_ADDED: FileText,
};

const STAGE_ORDER = ['DEFAULT', 'LEGAL_NOTICE_SENT', 'NEGOTIATION', 'SETTLEMENT', 'RECOVERED', 'CLOSED'];

function StageProgress({ currentStage }) {
  const currentIdx = STAGE_ORDER.indexOf(currentStage);
  return (
    <div style={{ display: 'flex', gap: 4, margin: '14px 0' }}>
      {STAGE_ORDER.map((stage, i) => {
        const isCompleted = i <= currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={stage} style={{
            flex: 1, height: 6, borderRadius: 3, transition: 'background 0.3s',
            background: isCompleted
              ? (isCurrent ? 'var(--color-investor)' : 'var(--color-accent-strong)')
              : 'var(--bg-muted)',
          }} />
        );
      })}
    </div>
  );
}

function CaseCard({ caseData }) {
  const [expanded, setExpanded] = useState(false);
  const stage = STAGE_STYLES[caseData.recovery_stage] || STAGE_STYLES.DEFAULT;

  return (
    <div className="data-card" style={{ marginBottom: 16 }}>
      <div style={{ padding: '20px 22px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
              {caseData.pool_name || `Pool #${caseData.pool_contract_id}`}
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
              Case #{caseData.id} · Outstanding:{' '}
              <span style={{ color: 'var(--color-negative)', fontWeight: 600 }}>
                {Number(caseData.outstanding_amount).toFixed(4)} MATIC
              </span>
            </div>
          </div>
          <span style={{ padding: '5px 12px', borderRadius: 50, fontSize: 11, fontWeight: 600, background: stage.bg, color: stage.color }}>
            {stage.label}
          </span>
        </div>

        <StageProgress currentStage={caseData.recovery_stage} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px,1fr))', gap: 16, margin: '14px 0' }}>
          {[
            { label: 'Law Firm',   value: caseData.law_firm_name || 'Not assigned' },
            caseData.law_firm_country && { label: 'Country', value: caseData.law_firm_country },
            { label: 'Priority',  value: caseData.priority, color: caseData.priority === 'CRITICAL' ? '#dc2626' : caseData.priority === 'HIGH' ? '#d97706' : 'var(--fg-muted)' },
            { label: 'Opened',    value: new Date(caseData.created_at).toLocaleDateString() },
          ].filter(Boolean).map(item => (
            <div key={item.label}>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>{item.label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: item.color || 'var(--fg-primary)' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {caseData.events && caseData.events.length > 0 && (
        <div style={{ padding: '0 22px 18px' }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--color-accent-fg)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '8px 0', fontFamily: 'inherit' }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? 'Hide' : 'Show'} Timeline ({caseData.events.length} events)
          </button>

          {expanded && (
            <div style={{ marginTop: 8, paddingLeft: 16, borderLeft: '2px solid var(--color-accent)' }}>
              {caseData.events.map(event => {
                const EventIcon = EVENT_ICONS[event.event_type] || FileText;
                return (
                  <div key={event.id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <EventIcon size={15} style={{ color: 'var(--color-accent-fg)' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{event.event_type.replace(/_/g, ' ')}</div>
                      {event.notes && <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 2 }}>{event.notes}</div>}
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{new Date(event.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RecoveryViewPage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const data = await investorApi.getRecoveryCases(); setCases(data); }
      catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 80, color: 'var(--fg-muted)' }}>
      <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--color-accent-strong)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      Loading recovery cases...
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Recovery</h1>
          <p>Track the status of defaulted investments and recovery proceedings</p>
        </div>
      </div>

      {cases.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--fg-muted)' }}>
          <Shield size={40} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: 'var(--fg-secondary)' }}>No recovery cases</p>
          <p style={{ fontSize: 13 }}>You don't have any defaulted investments. That's great!</p>
        </div>
      ) : (
        cases.map(c => <CaseCard key={c.id} caseData={c} />)
      )}
    </>
  );
}
