import React, { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import { Plus, Building2, Copy, Check, X, Shield, AlertTriangle } from 'lucide-react';

/* ── Modal Overlay ─────────────────────────────────── */
function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: '#151518', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20, padding: '28px 32px', maxWidth: 480, width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

/* ── Status Badge ──────────────────────────────────── */
function StatusBadge({ status }) {
  const isActive = status === 'ACTIVE';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
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

export default function LawFirmsPage() {
  const [firms, setFirms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreated, setShowCreated] = useState(false);
  const [createdData, setCreatedData] = useState(null);
  const [formData, setFormData] = useState({
    firm_name: '', business_email: '', contact_person: '',
    country: '', website: '', phone: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchFirms = async () => {
    try {
      const data = await adminApi.listLawFirms();
      setFirms(data);
    } catch (err) {
      console.error('Failed to load law firms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFirms(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const result = await adminApi.createLawFirm(formData);
      setCreatedData({
        email: formData.business_email,
        password: result.temp_password,
        firmName: formData.firm_name,
      });
      setShowCreate(false);
      setShowCreated(true);
      setFormData({ firm_name: '', business_email: '', contact_person: '', country: '', website: '', phone: '' });
      fetchFirms();
    } catch (err) {
      setFormError(err.error || 'Failed to create law firm.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (firm) => {
    const newStatus = firm.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await adminApi.updateLawFirm(firm.id, { status: newStatus });
      fetchFirms();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputStyle = {
    width: '100%', height: 44, background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
    color: '#fff', fontSize: 14, padding: '0 14px', outline: 'none',
    fontFamily: 'inherit', transition: 'border-color 0.2s',
  };

  return (
    <>
      <style>{`
        .lf-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .lf-title { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .lf-subtitle { font-size: 14px; color: #A0A0A8; margin-top: 4px; }
        .lf-add-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: linear-gradient(135deg, #7C5CFC, #6B48F5); color: #fff; border: none; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: inherit; }
        .lf-add-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(124,92,252,0.3); }
        .lf-table-wrap { background: #151518; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; overflow: hidden; }
        .lf-table { width: 100%; border-collapse: collapse; }
        .lf-table th { text-align: left; padding: 14px 20px; font-size: 12px; font-weight: 600; color: #A0A0A8; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); }
        .lf-table td { padding: 16px 20px; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .lf-table tr:last-child td { border-bottom: none; }
        .lf-table tr:hover td { background: rgba(124,92,252,0.03); }
        .lf-action-btn { padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: #A0A0A8; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s; font-family: inherit; }
        .lf-action-btn:hover { border-color: rgba(124,92,252,0.3); color: #7C5CFC; }
        .lf-action-btn.danger:hover { border-color: rgba(239,68,68,0.3); color: #EF4444; }
        .lf-empty { text-align: center; padding: 48px 20px; color: #A0A0A8; }
        .lf-empty-icon { margin-bottom: 12px; opacity: 0.3; }
        .lf-modal-title { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
        .lf-modal-subtitle { font-size: 13px; color: #A0A0A8; margin-bottom: 20px; }
        .lf-form-group { margin-bottom: 14px; }
        .lf-form-label { font-size: 12px; font-weight: 500; color: #A0A0A8; margin-bottom: 4px; display: block; }
        .lf-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .lf-form-error { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #EF4444; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 12px; }
        .lf-submit-btn { width: 100%; height: 44px; background: linear-gradient(135deg, #7C5CFC, #6B48F5); color: #fff; border: none; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; margin-top: 8px; }
        .lf-submit-btn:hover:not(:disabled) { box-shadow: 0 6px 16px rgba(124,92,252,0.3); }
        .lf-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .lf-created-box { background: rgba(34,197,94,0.06); border: 1px solid rgba(34,197,94,0.15); border-radius: 12px; padding: 16px; margin: 16px 0; }
        .lf-cred-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; }
        .lf-cred-label { font-size: 12px; color: #A0A0A8; }
        .lf-cred-value { font-size: 14px; font-weight: 600; font-family: 'SF Mono', 'Fira Code', monospace; }
        .lf-copy-btn { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(34,197,94,0.2); background: transparent; color: #22C55E; font-size: 12px; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .lf-copy-btn:hover { background: rgba(34,197,94,0.08); }
      `}</style>

      <div className="lf-header">
        <div>
          <h1 className="lf-title">Law Firms</h1>
          <p className="lf-subtitle">Manage law firm partners for recovery operations</p>
        </div>
        <button className="lf-add-btn" onClick={() => setShowCreate(true)}>
          <Plus size={18} /> Add Law Firm
        </button>
      </div>

      {/* ── Table ── */}
      <div className="lf-table-wrap">
        {loading ? (
          <div className="lf-empty">Loading...</div>
        ) : firms.length === 0 ? (
          <div className="lf-empty">
            <Building2 size={40} className="lf-empty-icon" />
            <p>No law firms yet. Click "Add Law Firm" to create a partner.</p>
          </div>
        ) : (
          <table className="lf-table">
            <thead>
              <tr>
                <th>Firm Name</th>
                <th>Country</th>
                <th>Contact Person</th>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {firms.map(firm => (
                <tr key={firm.id}>
                  <td style={{ fontWeight: 600 }}>{firm.firm_name}</td>
                  <td>{firm.country}</td>
                  <td>{firm.contact_person}</td>
                  <td style={{ color: '#A0A0A8' }}>{firm.business_email}</td>
                  <td><StatusBadge status={firm.status} /></td>
                  <td>
                    <button
                      className={`lf-action-btn ${firm.status === 'ACTIVE' ? 'danger' : ''}`}
                      onClick={() => handleToggleStatus(firm)}
                    >
                      {firm.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Create Modal ── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 className="lf-modal-title">Add Law Firm Partner</h2>
            <p className="lf-modal-subtitle">Create a new law firm account with login credentials</p>
          </div>
          <button onClick={() => setShowCreate(false)} style={{
            background: 'none', border: 'none', color: '#A0A0A8', cursor: 'pointer', padding: 4,
          }}><X size={20} /></button>
        </div>

        {formError && <div className="lf-form-error">{formError}</div>}

        <form onSubmit={handleCreate}>
          <div className="lf-form-group">
            <label className="lf-form-label">Firm Name *</label>
            <input style={inputStyle} placeholder="e.g. Smith & Associates"
              value={formData.firm_name} onChange={e => setFormData({ ...formData, firm_name: e.target.value })} required />
          </div>

          <div className="lf-form-row">
            <div className="lf-form-group">
              <label className="lf-form-label">Business Email *</label>
              <input style={inputStyle} type="email" placeholder="firm@example.com"
                value={formData.business_email} onChange={e => setFormData({ ...formData, business_email: e.target.value })} required />
            </div>
            <div className="lf-form-group">
              <label className="lf-form-label">Contact Person *</label>
              <input style={inputStyle} placeholder="John Smith"
                value={formData.contact_person} onChange={e => setFormData({ ...formData, contact_person: e.target.value })} required />
            </div>
          </div>

          <div className="lf-form-row">
            <div className="lf-form-group">
              <label className="lf-form-label">Country *</label>
              <input style={inputStyle} placeholder="e.g. India"
                value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} required />
            </div>
            <div className="lf-form-group">
              <label className="lf-form-label">Phone</label>
              <input style={inputStyle} placeholder="+91 XXXXX XXXXX"
                value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            </div>
          </div>

          <div className="lf-form-group">
            <label className="lf-form-label">Website</label>
            <input style={inputStyle} type="url" placeholder="https://example.com"
              value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} />
          </div>

          <button type="submit" className="lf-submit-btn" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Law Firm Partner'}
          </button>
        </form>
      </Modal>

      {/* ── Partner Created Modal ── */}
      <Modal open={showCreated} onClose={() => setShowCreated(false)}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(34,197,94,0.1)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <Check size={28} color="#22C55E" />
          </div>
          <h2 className="lf-modal-title">Partner Created!</h2>
          <p className="lf-modal-subtitle">Share these credentials securely with {createdData?.firmName}</p>
        </div>

        <div className="lf-created-box">
          <div className="lf-cred-row">
            <div>
              <div className="lf-cred-label">Email</div>
              <div className="lf-cred-value">{createdData?.email}</div>
            </div>
          </div>
          <div style={{ height: 1, background: 'rgba(34,197,94,0.1)', margin: '4px 0' }} />
          <div className="lf-cred-row">
            <div>
              <div className="lf-cred-label">Temporary Password</div>
              <div className="lf-cred-value">{createdData?.password}</div>
            </div>
            <button className="lf-copy-btn"
              onClick={() => copyToClipboard(createdData?.password || '')}>
              {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
            </button>
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '12px 14px', background: 'rgba(245,158,11,0.06)',
          border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10,
          marginTop: 16, marginBottom: 16,
        }}>
          <AlertTriangle size={18} color="#F59E0B" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: '#A0A0A8', lineHeight: 1.5 }}>
            This password will <strong style={{ color: '#F59E0B' }}>not be shown again</strong>.
            Make sure to copy and share it securely with the law firm contact.
          </p>
        </div>

        <button className="lf-submit-btn" onClick={() => setShowCreated(false)}>
          Done
        </button>
      </Modal>
    </>
  );
}
