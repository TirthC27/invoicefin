import React, { useEffect, useState } from 'react';
import { investorApi } from '../../lib/api';
import { Shield, Clock, FileText, Scale, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

const STAGE_STYLES = {
  DEFAULT:            { bg: 'rgba(239,68,68,0.08)', color: '#EF4444', label: 'Default' },
  LEGAL_NOTICE_SENT:  { bg: 'rgba(245,158,11,0.08)', color: '#F59E0B', label: 'Legal Notice Sent' },
  NEGOTIATION:        { bg: 'rgba(59,130,246,0.08)', color: '#3B82F6', label: 'Negotiation' },
  SETTLEMENT:         { bg: 'rgba(124,92,252,0.08)', color: '#7C5CFC', label: 'Settlement' },
  RECOVERED:          { bg: 'rgba(34,197,94,0.08)', color: '#22C55E', label: 'Recovered' },
  CLOSED:             { bg: 'rgba(161,161,170,0.08)', color: '#A0A0A8', label: 'Closed' },
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
    <div style={{ display: 'flex', gap: 4, margin: '16px 0' }}>
      {STAGE_ORDER.map((stage, i) => {
        const isCompleted = i <= currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={stage} style={{ flex: 1, height: 6, borderRadius: 3, background: isCompleted ? (isCurrent ? '#7C5CFC' : '#22C55E') : 'rgba(255,255,255,0.06)', transition: 'background 0.3s' }} />
        );
      })}
    </div>
  );
}

function CaseCard({ caseData }) {
  const [expanded, setExpanded] = useState(false);
  const stage = STAGE_STYLES[caseData.recovery_stage] || STAGE_STYLES.DEFAULT;

  return (
    <div style={{ background: '#151518', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 24, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
            {caseData.pool_name || `Pool #${caseData.pool_contract_id}`}
          </div>
          <div style={{ fontSize: 13, color: '#A0A0A8' }}>
            Case #{caseData.id} · Outstanding: <span style={{ color: '#EF4444', fontWeight: 600 }}>{Number(caseData.outstanding_amount).toFixed(4)} ETH</span>
          </div>
        </div>
        <span style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', background: stage.bg, color: stage.color }}>
          {stage.label}
        </span>
      </div>

      <StageProgress currentStage={caseData.recovery_stage} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, margin: '16px 0' }}>
        <div>
          <div style={{ fontSize: 11, color: '#A0A0A8', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>Law Firm</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{caseData.law_firm_name || 'Not assigned'}</div>
        </div>
        {caseData.law_firm_country && (
          <div>
            <div style={{ fontSize: 11, color: '#A0A0A8', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>Country</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{caseData.law_firm_country}</div>
          </div>
        )}
        <div>
          <div style={{ fontSize: 11, color: '#A0A0A8', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>Priority</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: caseData.priority === 'CRITICAL' ? '#EF4444' : caseData.priority === 'HIGH' ? '#F59E0B' : '#A0A0A8' }}>{caseData.priority}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#A0A0A8', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>Opened</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{new Date(caseData.created_at).toLocaleDateString()}</div>
        </div>
      </div>

      {/* Timeline toggle */}
      {caseData.events && caseData.events.length > 0 && (
        <>
          <button onClick={() => setExpanded(!expanded)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#7C5CFC', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '8px 0', fontFamily: 'inherit' }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? 'Hide' : 'Show'} Timeline ({caseData.events.length} events)
          </button>

          {expanded && (
            <div style={{ marginTop: 8, paddingLeft: 16, borderLeft: '2px solid rgba(124,92,252,0.2)' }}>
              {caseData.events.map(event => {
                const EventIcon = EVENT_ICONS[event.event_type] || FileText;
                return (
                  <div key={event.id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(124,92,252,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <EventIcon size={16} color="#7C5CFC" />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                        {event.event_type.replace(/_/g, ' ')}
                      </div>
                      {event.notes && <div style={{ fontSize: 12, color: '#A0A0A8', marginBottom: 2 }}>{event.notes}</div>}
                      <div style={{ fontSize: 11, color: '#71717A' }}>{new Date(event.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function RecoveryViewPage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await investorApi.getRecoveryCases();
        setCases(data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 80, color: '#A0A0A8' }}>Loading recovery cases...</div>;

  return (
    <>
      <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, marginBottom: 8 }}>Recovery</h1>
      <p style={{ fontSize: 14, color: '#A0A0A8', marginBottom: 28 }}>Track the status of defaulted investments and recovery proceedings</p>

      {cases.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#A0A0A8' }}>
          <Shield size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No recovery cases</p>
          <p style={{ fontSize: 13 }}>You don't have any defaulted investments. That's great!</p>
        </div>
      ) : (
        cases.map(c => <CaseCard key={c.id} caseData={c} />)
      )}
    </>
  );
}
