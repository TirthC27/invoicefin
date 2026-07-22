import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lawfirmApi } from '../../lib/api';
import {
  ArrowLeft, FileText, Send, MessageSquare, Handshake,
  DollarSign, CheckCircle2, XCircle, Upload, Clock,
  AlertTriangle, Loader2
} from 'lucide-react';

/* ── Stage Timeline Config ────────────────────────── */
const STAGES = [
  { key: 'DEFAULT', label: 'Default', color: '#9CA3AF' },
  { key: 'LEGAL_NOTICE_SENT', label: 'Legal Notice', color: '#F59E0B' },
  { key: 'NEGOTIATION', label: 'Negotiation', color: '#3B82F6' },
  { key: 'SETTLEMENT', label: 'Settlement', color: '#7C5CFC' },
  { key: 'RECOVERED', label: 'Recovered', color: '#22C55E' },
  { key: 'CLOSED', label: 'Closed', color: '#6B7280' },
];

const EVENT_ICONS = {
  LEGAL_NOTICE_SENT: Send,
  NEGOTIATION_STARTED: MessageSquare,
  SETTLEMENT_RECORDED: Handshake,
  PARTIAL_RECOVERY: DollarSign,
  FULL_RECOVERY: CheckCircle2,
  CASE_CLOSED: XCircle,
  DOCUMENT_UPLOADED: Upload,
  NOTE_ADDED: FileText,
};

const EVENT_COLORS = {
  LEGAL_NOTICE_SENT: '#F59E0B',
  NEGOTIATION_STARTED: '#3B82F6',
  SETTLEMENT_RECORDED: '#7C5CFC',
  PARTIAL_RECOVERY: '#22C55E',
  FULL_RECOVERY: '#22C55E',
  CASE_CLOSED: '#6B7280',
  DOCUMENT_UPLOADED: '#3B82F6',
  NOTE_ADDED: '#A0A0A8',
};

/* ── Action Buttons Config ────────────────────────── */
const ACTIONS = [
  { event_type: 'LEGAL_NOTICE_SENT', label: 'Send Legal Notice', icon: Send, color: '#F59E0B', needsNote: true },
  { event_type: 'NEGOTIATION_STARTED', label: 'Start Negotiation', icon: MessageSquare, color: '#3B82F6', needsNote: true },
  { event_type: 'SETTLEMENT_RECORDED', label: 'Record Settlement', icon: Handshake, color: '#7C5CFC', needsNote: true },
  { event_type: 'PARTIAL_RECOVERY', label: 'Partial Recovery', icon: DollarSign, color: '#22C55E', needsNote: true },
  { event_type: 'FULL_RECOVERY', label: 'Full Recovery', icon: CheckCircle2, color: '#22C55E', needsNote: true },
  { event_type: 'CASE_CLOSED', label: 'Close Case', icon: XCircle, color: '#6B7280', needsNote: true },
];

export default function CaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [noteModal, setNoteModal] = useState(null); // { event_type, label }
  const [noteText, setNoteText] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [showDocModal, setShowDocModal] = useState(false);
  const [docNotes, setDocNotes] = useState('');

  const fetchCase = async () => {
    try {
      const data = await lawfirmApi.getCaseDetail(id);
      setCaseData(data.case);
      setEvents(data.events);
    } catch (err) {
      console.error('Failed to load case:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCase(); }, [id]);

  const handleAction = async (eventType, notes = '') => {
    setActionLoading(eventType);
    try {
      await lawfirmApi.createEvent(id, { event_type: eventType, notes });
      setNoteModal(null);
      setNoteText('');
      await fetchCase();
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDocUpload = async () => {
    if (!docUrl) return;
    setActionLoading('DOCUMENT_UPLOADED');
    try {
      await lawfirmApi.uploadDocument(id, { document_url: docUrl, notes: docNotes || 'Document uploaded' });
      setShowDocModal(false);
      setDocUrl('');
      setDocNotes('');
      await fetchCase();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const currentStageIndex = caseData ? STAGES.findIndex(s => s.key === caseData.recovery_stage) : 0;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, color: '#A0A0A8' }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!caseData) {
    return <div style={{ color: '#EF4444', textAlign: 'center', padding: 48 }}>Case not found.</div>;
  }

  return (
    <>
      <style>{`
        .cd-back { display: inline-flex; align-items: center; gap: 8px; color: #A0A0A8; font-size: 14px; font-weight: 500; cursor: pointer; margin-bottom: 24px; background: none; border: none; font-family: inherit; transition: color 0.2s; padding: 0; }
        .cd-back:hover { color: #fff; }
        .cd-header { margin-bottom: 32px; }
        .cd-title { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 4px; }
        .cd-meta { font-size: 13px; color: #A0A0A8; }

        .cd-grid { display: grid; grid-template-columns: 1fr 380px; gap: 24px; }
        @media (max-width: 1024px) { .cd-grid { grid-template-columns: 1fr; } }

        .cd-section { background: #151518; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 24px; margin-bottom: 20px; }
        .cd-section-title { font-size: 15px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }

        /* Info Grid */
        .cd-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .cd-info-item { }
        .cd-info-label { font-size: 11px; font-weight: 600; color: #A0A0A8; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 4px; }
        .cd-info-value { font-size: 14px; font-weight: 600; }

        /* Stage Timeline Visual */
        .cd-stages { display: flex; align-items: center; gap: 0; margin: 20px 0; overflow-x: auto; padding-bottom: 4px; }
        .cd-stage-step { display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1; min-width: 80px; position: relative; }
        .cd-stage-dot { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; border: 2px solid; transition: all 0.3s; z-index: 1; }
        .cd-stage-label { font-size: 10px; font-weight: 600; text-align: center; white-space: nowrap; }
        .cd-stage-line { position: absolute; top: 16px; left: 50%; width: 100%; height: 2px; z-index: 0; }

        /* Timeline Events */
        .cd-timeline { position: relative; padding-left: 28px; }
        .cd-timeline::before { content: ''; position: absolute; left: 12px; top: 0; bottom: 0; width: 2px; background: rgba(255,255,255,0.06); }
        .cd-event { position: relative; margin-bottom: 20px; padding-left: 20px; }
        .cd-event-dot { position: absolute; left: -22px; top: 4px; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 1; }
        .cd-event-type { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
        .cd-event-notes { font-size: 12px; color: #A0A0A8; line-height: 1.5; }
        .cd-event-time { font-size: 11px; color: rgba(160,160,168,0.5); margin-top: 4px; }

        /* Action Buttons */
        .cd-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .cd-action-btn { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; border: 1px solid; background: transparent; }
        .cd-action-btn:hover:not(:disabled) { transform: translateY(-1px); }
        .cd-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .cd-action-btn svg { flex-shrink: 0; }

        /* Modal */
        .cd-modal-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 20px; }
        .cd-modal { background: #151518; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 28px; max-width: 440px; width: 100%; box-shadow: 0 24px 64px rgba(0,0,0,0.5); }
        .cd-modal-title { font-size: 18px; font-weight: 800; margin-bottom: 4px; }
        .cd-modal-subtitle { font-size: 13px; color: #A0A0A8; margin-bottom: 16px; }
        .cd-textarea { width: 100%; min-height: 80px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #fff; font-size: 14px; padding: 12px; outline: none; font-family: inherit; resize: vertical; }
        .cd-textarea:focus { border-color: #7C5CFC; box-shadow: 0 0 0 3px rgba(124,92,252,0.12); }
        .cd-input { width: 100%; height: 44px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #fff; font-size: 14px; padding: 0 14px; outline: none; font-family: inherit; margin-bottom: 12px; }
        .cd-input:focus { border-color: #7C5CFC; box-shadow: 0 0 0 3px rgba(124,92,252,0.12); }
        .cd-modal-actions { display: flex; gap: 10px; margin-top: 16px; }
        .cd-modal-cancel { flex: 1; height: 42px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: #A0A0A8; font-size: 14px; font-weight: 500; cursor: pointer; font-family: inherit; }
        .cd-modal-submit { flex: 1; height: 42px; border-radius: 10px; border: none; background: linear-gradient(135deg, #7C5CFC, #6B48F5); color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .cd-modal-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Documents */
        .cd-doc-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; margin-bottom: 8px; transition: background 0.2s; }
        .cd-doc-item:hover { background: rgba(255,255,255,0.04); }
        .cd-doc-icon { width: 36px; height: 36px; border-radius: 8px; background: rgba(59,130,246,0.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .cd-doc-name { font-size: 13px; font-weight: 500; }
        .cd-doc-date { font-size: 11px; color: #A0A0A8; }
        .cd-upload-btn { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 10px; border: 1px dashed rgba(255,255,255,0.15); background: transparent; color: #A0A0A8; font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; width: 100%; justify-content: center; margin-top: 8px; transition: all 0.2s; }
        .cd-upload-btn:hover { border-color: rgba(124,92,252,0.3); color: #7C5CFC; background: rgba(124,92,252,0.04); }
      `}</style>

      {/* Back Button */}
      <button className="cd-back" onClick={() => navigate('/lawfirm/cases')}>
        <ArrowLeft size={18} /> Back to Cases
      </button>

      {/* Header */}
      <div className="cd-header">
        <h1 className="cd-title">Recovery Case #{caseData.id}</h1>
        <p className="cd-meta">Pool #{caseData.pool_contract_id} · Outstanding: {Number(caseData.outstanding_amount).toFixed(4)} MATIC</p>
      </div>

      <div className="cd-grid">
        {/* ── Left Column ── */}
        <div>
          {/* Case Info */}
          <div className="cd-section">
            <div className="cd-section-title"><FileText size={16} color="#7C5CFC" /> Case Information</div>
            <div className="cd-info-grid">
              <div className="cd-info-item">
                <div className="cd-info-label">Pool / Invoice</div>
                <div className="cd-info-value">#{caseData.pool_contract_id} — {caseData.pool_name}</div>
              </div>
              <div className="cd-info-item">
                <div className="cd-info-label">Outstanding Amount</div>
                <div className="cd-info-value" style={{ color: '#F59E0B' }}>{Number(caseData.outstanding_amount).toFixed(4)} MATIC</div>
              </div>
              <div className="cd-info-item">
                <div className="cd-info-label">Exporter</div>
                <div className="cd-info-value">{caseData.exporter_email}</div>
              </div>
              <div className="cd-info-item">
                <div className="cd-info-label">Investor</div>
                <div className="cd-info-value">{caseData.investor_email}</div>
              </div>
              <div className="cd-info-item">
                <div className="cd-info-label">Priority</div>
                <div className="cd-info-value">{caseData.priority}</div>
              </div>
              <div className="cd-info-item">
                <div className="cd-info-label">Assigned Date</div>
                <div className="cd-info-value">
                  {caseData.assigned_date ? new Date(caseData.assigned_date).toLocaleDateString() : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Stage Progress */}
          <div className="cd-section">
            <div className="cd-section-title"><Clock size={16} color="#F59E0B" /> Recovery Stage</div>
            <div className="cd-stages">
              {STAGES.map((stage, idx) => {
                const isCompleted = idx <= currentStageIndex;
                const isCurrent = idx === currentStageIndex;
                return (
                  <React.Fragment key={stage.key}>
                    <div className="cd-stage-step">
                      <div className="cd-stage-dot" style={{
                        background: isCompleted ? stage.color : 'transparent',
                        borderColor: isCompleted ? stage.color : 'rgba(255,255,255,0.15)',
                        color: isCompleted ? '#fff' : '#A0A0A8',
                        transform: isCurrent ? 'scale(1.15)' : 'scale(1)',
                        boxShadow: isCurrent ? `0 0 12px ${stage.color}40` : 'none',
                      }}>
                        {isCompleted ? '✓' : idx + 1}
                      </div>
                      <span className="cd-stage-label" style={{
                        color: isCompleted ? stage.color : '#A0A0A8',
                        fontWeight: isCurrent ? 700 : 500,
                      }}>
                        {stage.label}
                      </span>
                    </div>
                    {idx < STAGES.length - 1 && (
                      <div style={{
                        flex: '0 0 auto', height: 2, width: 30,
                        background: idx < currentStageIndex ? STAGES[idx + 1].color : 'rgba(255,255,255,0.08)',
                        marginTop: -20, borderRadius: 1,
                      }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Event Timeline */}
          <div className="cd-section">
            <div className="cd-section-title"><Clock size={16} color="#3B82F6" /> Timeline</div>
            {events.length === 0 ? (
              <p style={{ color: '#A0A0A8', fontSize: 13, textAlign: 'center', padding: 20 }}>
                No events yet. Use the action buttons to progress this case.
              </p>
            ) : (
              <div className="cd-timeline">
                {events.map(event => {
                  const IconComp = EVENT_ICONS[event.event_type] || FileText;
                  const color = EVENT_COLORS[event.event_type] || '#A0A0A8';
                  return (
                    <div className="cd-event" key={event.id}>
                      <div className="cd-event-dot" style={{ background: `${color}15` }}>
                        <IconComp size={14} color={color} />
                      </div>
                      <div className="cd-event-type" style={{ color }}>
                        {event.event_type.replace(/_/g, ' ')}
                      </div>
                      {event.notes && <div className="cd-event-notes">{event.notes}</div>}
                      {event.document_url && (
                        <a href={event.document_url} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 12, color: '#3B82F6', display: 'inline-block', marginTop: 4 }}>
                          📎 View Document
                        </a>
                      )}
                      <div className="cd-event-time">
                        {new Date(event.created_at).toLocaleString()}
                        {event.created_by_email && ` · ${event.created_by_email}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column ── */}
        <div>
          {/* Actions */}
          <div className="cd-section">
            <div className="cd-section-title"><Send size={16} color="#22C55E" /> Actions</div>
            <div className="cd-actions">
              {ACTIONS.map(action => (
                <button
                  key={action.event_type}
                  className="cd-action-btn"
                  style={{
                    color: action.color,
                    borderColor: `${action.color}30`,
                  }}
                  disabled={actionLoading === action.event_type || caseData.recovery_stage === 'CLOSED'}
                  onClick={() => {
                    if (action.needsNote) {
                      setNoteModal(action);
                      setNoteText('');
                    } else {
                      handleAction(action.event_type);
                    }
                  }}
                >
                  {actionLoading === action.event_type ? (
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <action.icon size={14} />
                  )}
                  {action.label}
                </button>
              ))}
            </div>

            {caseData.recovery_stage === 'CLOSED' && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', background: 'rgba(107,114,128,0.06)',
                border: '1px solid rgba(107,114,128,0.15)', borderRadius: 10,
                marginTop: 12, fontSize: 12, color: '#6B7280',
              }}>
                <AlertTriangle size={16} /> This case is closed. No further actions allowed.
              </div>
            )}
          </div>

          {/* Documents */}
          <div className="cd-section">
            <div className="cd-section-title"><FileText size={16} color="#3B82F6" /> Documents</div>
            {events.filter(e => e.document_url).length === 0 ? (
              <p style={{ color: '#A0A0A8', fontSize: 13, textAlign: 'center', padding: 12 }}>
                No documents uploaded yet.
              </p>
            ) : (
              events.filter(e => e.document_url).map(e => (
                <div className="cd-doc-item" key={e.id}>
                  <div className="cd-doc-icon">
                    <FileText size={16} color="#3B82F6" />
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div className="cd-doc-name">{e.notes || 'Document'}</div>
                    <div className="cd-doc-date">{new Date(e.created_at).toLocaleDateString()}</div>
                  </div>
                  <a href={e.document_url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 12, color: '#3B82F6', whiteSpace: 'nowrap' }}>View</a>
                </div>
              ))
            )}
            <button className="cd-upload-btn" onClick={() => setShowDocModal(true)}
              disabled={caseData.recovery_stage === 'CLOSED'}>
              <Upload size={16} /> Upload Document
            </button>
          </div>
        </div>
      </div>

      {/* ── Note/Action Modal ── */}
      {noteModal && (
        <div className="cd-modal-overlay" onClick={() => setNoteModal(null)}>
          <div className="cd-modal" onClick={e => e.stopPropagation()}>
            <h3 className="cd-modal-title">{noteModal.label}</h3>
            <p className="cd-modal-subtitle">Add notes for this action (optional)</p>
            <textarea
              className="cd-textarea"
              placeholder="Enter notes, details, or context..."
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              autoFocus
            />
            <div className="cd-modal-actions">
              <button className="cd-modal-cancel" onClick={() => setNoteModal(null)}>Cancel</button>
              <button className="cd-modal-submit"
                disabled={actionLoading === noteModal.event_type}
                onClick={() => handleAction(noteModal.event_type, noteText)}>
                {actionLoading === noteModal.event_type ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Document Upload Modal ── */}
      {showDocModal && (
        <div className="cd-modal-overlay" onClick={() => setShowDocModal(false)}>
          <div className="cd-modal" onClick={e => e.stopPropagation()}>
            <h3 className="cd-modal-title">Upload Document</h3>
            <p className="cd-modal-subtitle">Provide a URL to the document</p>
            <input
              className="cd-input"
              type="url"
              placeholder="https://example.com/document.pdf"
              value={docUrl}
              onChange={e => setDocUrl(e.target.value)}
              autoFocus
            />
            <textarea
              className="cd-textarea"
              placeholder="Document description..."
              value={docNotes}
              onChange={e => setDocNotes(e.target.value)}
              style={{ minHeight: 60 }}
            />
            <div className="cd-modal-actions">
              <button className="cd-modal-cancel" onClick={() => setShowDocModal(false)}>Cancel</button>
              <button className="cd-modal-submit"
                disabled={!docUrl || actionLoading === 'DOCUMENT_UPLOADED'}
                onClick={handleDocUpload}>
                {actionLoading === 'DOCUMENT_UPLOADED' ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
