import React, { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import { Plus, Building2, Copy, Check, X, AlertTriangle } from 'lucide-react';

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '28px 32px', maxWidth: 480, width: '100%', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function FirmStatusBadge({ status }) {
  const isActive = status === 'ACTIVE';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 50, fontSize: 12, fontWeight: 600, background: isActive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)', color: isActive ? '#16a34a' : '#dc2626', border: `1px solid ${isActive ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#16a34a' : '#dc2626' }} />
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
  const [formData, setFormData] = useState({ firm_name: '', business_email: '', contact_person: '', country: '', website: '', phone: '' });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchFirms = async () => {
    try { const data = await adminApi.listLawFirms(); setFirms(data); }
    catch (err) { console.error('Failed to load law firms:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchFirms(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault(); setFormError(''); setSubmitting(true);
    try {
      const result = await adminApi.createLawFirm(formData);
      setCreatedData({ email: formData.business_email, password: result.temp_password, firmName: formData.firm_name });
      setShowCreate(false); setShowCreated(true);
      setFormData({ firm_name: '', business_email: '', contact_person: '', country: '', website: '', phone: '' });
      fetchFirms();
    } catch (err) { setFormError(err.error || 'Failed to create law firm.'); }
    finally { setSubmitting(false); }
  };

  const handleToggleStatus = async (firm) => {
    const newStatus = firm.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try { await adminApi.updateLawFirm(firm.id, { status: newStatus }); fetchFirms(); }
    catch (err) { console.error(err); }
  };

  const copyToClipboard = (text) => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Law Firms</h1>
          <p>Manage law firm partners for recovery operations</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Add Law Firm
        </button>
      </div>

      <div className="data-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--fg-muted)' }}>Loading...</div>
        ) : firms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--fg-muted)' }}>
            <Building2 size={36} style={{ opacity: 0.25, margin: '0 auto 12px' }} />
            <p>No law firms yet. Click "Add Law Firm" to create a partner.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead><tr>
              <th>Firm Name</th><th>Country</th><th>Contact Person</th>
              <th>Email</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {firms.map(firm => (
                <tr key={firm.id}>
                  <td style={{ fontWeight: 600 }}>{firm.firm_name}</td>
                  <td>{firm.country}</td>
                  <td>{firm.contact_person}</td>
                  <td style={{ color: 'var(--fg-muted)' }}>{firm.business_email}</td>
                  <td><FirmStatusBadge status={firm.status} /></td>
                  <td>
                    <button className={`btn btn-outline btn-sm${firm.status === 'ACTIVE' ? ' btn-danger' : ''}`}
                      onClick={() => handleToggleStatus(firm)}>
                      {firm.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Add Law Firm Partner</h2>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Create a new law firm account with login credentials</p>
          </div>
          <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', padding: 4 }}><X size={20} /></button>
        </div>
        {formError && <div style={{ background: 'rgba(201,64,64,0.07)', border: '1px solid rgba(201,64,64,0.2)', color: 'var(--color-negative)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: 13, marginBottom: 12 }}>{formError}</div>}
        <form onSubmit={handleCreate}>
          {[
            { label: 'Firm Name *', key: 'firm_name', placeholder: 'e.g. Smith & Associates', full: true },
            { label: 'Business Email *', key: 'business_email', type: 'email', placeholder: 'firm@example.com' },
            { label: 'Contact Person *', key: 'contact_person', placeholder: 'John Smith' },
            { label: 'Country *', key: 'country', placeholder: 'e.g. India' },
            { label: 'Phone', key: 'phone', placeholder: '+91 XXXXX XXXXX' },
            { label: 'Website', key: 'website', type: 'url', placeholder: 'https://example.com', full: true },
          ].reduce((rows, field, i, arr) => {
            if (field.full) { rows.push([field]); return rows; }
            if (rows.length && rows[rows.length-1].length === 1 && !rows[rows.length-1][0].full) { rows[rows.length-1].push(field); return rows; }
            rows.push([field]); return rows;
          }, []).map((row, ri) => (
            <div key={ri} style={{ display: 'grid', gridTemplateColumns: row.length === 2 ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 12 }}>
              {row.map(f => (
                <div key={f.key}>
                  <label className="form-label">{f.label}</label>
                  <input className="form-input" type={f.type || 'text'} placeholder={f.placeholder}
                    value={formData[f.key]} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                    required={f.label.includes('*')} />
                </div>
              ))}
            </div>
          ))}
          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}>
            {submitting ? 'Creating...' : 'Create Law Firm Partner'}
          </button>
        </form>
      </Modal>

      {/* Created Credentials Modal */}
      <Modal open={showCreated} onClose={() => setShowCreated(false)}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-lg)', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Check size={28} color="#16a34a" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Partner Created!</h2>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Share these credentials securely with {createdData?.firmName}</p>
        </div>
        <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16 }}>
          {[{ label: 'Email', value: createdData?.email }, { label: 'Temporary Password', value: createdData?.password, copy: true }].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: item.copy ? 'none' : '1px solid rgba(34,197,94,0.1)' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'monospace' }}>{item.value}</div>
              </div>
              {item.copy && (
                <button onClick={() => copyToClipboard(createdData?.password || '')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(34,197,94,0.2)', background: 'transparent', color: '#16a34a', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                </button>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
          <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
            This password will <strong style={{ color: '#d97706' }}>not be shown again</strong>. Make sure to copy and share it securely.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreated(false)} style={{ width: '100%', justifyContent: 'center' }}>Done</button>
      </Modal>
    </>
  );
}
