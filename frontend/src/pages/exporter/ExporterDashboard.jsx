import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, LogOut, Plus, RefreshCw, ShieldCheck, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { exporterApi } from '../../lib/api';

const emptyInvoice = {
  buyer_name: '',
  buyer_email: '',
  buyer_country: '',
  invoice_amount: '',
  due_date: '',
};

function formatAmount(value) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} MATIC`;
}

function getErrorMessage(err, fallback) {
  if (err?.error) return err.error;
  if (typeof err === 'string') return err;
  return fallback;
}

export default function ExporterDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [form, setForm] = useState(emptyInvoice);
  const [poolInputs, setPoolInputs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const stats = useMemo(() => {
    const total = invoices.reduce((sum, inv) => sum + Number(inv.invoice_amount || 0), 0);
    const activePools = invoices.filter((inv) => inv.pool).length;
    return { total, activePools, invoices: invoices.length };
  }, [invoices]);

  const loadInvoices = async () => {
    setError('');
    setLoading(true);
    try {
      setInvoices(await exporterApi.listInvoices());
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load invoices.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await exporterApi.uploadInvoice(form);
      setForm(emptyInvoice);
      await loadInvoices();
    } catch (err) {
      setError(getErrorMessage(err, 'Invoice upload failed.'));
    } finally {
      setSaving(false);
    }
  };

  const verifyInvoice = async (id) => {
    setError('');
    try {
      const updated = await exporterApi.verifyInvoice(id);
      setInvoices((items) => items.map((item) => (item.id === id ? updated : item)));
    } catch (err) {
      setError(getErrorMessage(err, 'Invoice verification failed.'));
    }
  };

  const createPool = async (invoice) => {
    const values = poolInputs[invoice.id] || {};
    setError('');
    try {
      const updated = await exporterApi.createPool(invoice.id, {
        name: values.name || `${invoice.buyer_name} Invoice #${invoice.id}`,
        apy: values.apy || '14.00',
        duration_days: Number(values.duration_days || 90),
      });
      setInvoices((items) => items.map((item) => (item.id === invoice.id ? updated : item)));
    } catch (err) {
      setError(getErrorMessage(err, 'Pool creation failed.'));
    }
  };

  const updatePoolInput = (id, key, value) => {
    setPoolInputs((current) => ({
      ...current,
      [id]: { ...(current[id] || {}), [key]: value },
    }));
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .ex-root { min-height: 100vh; background: #0B0B0F; color: #fff; font-family: 'Inter', sans-serif; }
        .ex-topbar { height: 64px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between; padding: 0 32px; background: rgba(11,11,15,0.86); backdrop-filter: blur(12px); }
        .ex-logo { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 800; }
        .ex-logo-dot { width: 8px; height: 8px; border-radius: 50%; background: #F59E0B; }
        .ex-user { color: #A0A0A8; font-size: 13px; }
        .ex-signout, .ex-icon-btn { display: inline-flex; align-items: center; gap: 8px; height: 38px; padding: 0 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: #A0A0A8; font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .ex-signout:hover, .ex-icon-btn:hover { border-color: rgba(255,255,255,0.18); color: #fff; }
        .ex-main { max-width: 1180px; margin: 0 auto; padding: 32px 24px 48px; }
        .ex-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 22px; }
        .ex-title { font-size: 28px; font-weight: 800; margin: 0 0 6px; letter-spacing: 0; }
        .ex-subtitle { margin: 0; color: #A0A0A8; font-size: 14px; }
        .ex-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-bottom: 20px; }
        .ex-stat, .ex-panel, .ex-table-wrap { background: #151518; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; }
        .ex-stat { padding: 18px; display: flex; gap: 14px; align-items: center; }
        .ex-stat-icon { width: 42px; height: 42px; border-radius: 8px; display: grid; place-items: center; background: rgba(245,158,11,0.1); color: #F59E0B; flex: 0 0 auto; }
        .ex-label { color: #A0A0A8; font-size: 12px; margin-bottom: 4px; }
        .ex-value { font-size: 20px; font-weight: 800; }
        .ex-grid { display: grid; grid-template-columns: 360px minmax(0, 1fr); gap: 18px; align-items: start; }
        .ex-panel { padding: 18px; }
        .ex-panel h2 { font-size: 16px; margin: 0 0 14px; }
        .ex-field { display: grid; gap: 6px; margin-bottom: 12px; }
        .ex-field label { color: #A0A0A8; font-size: 12px; }
        .ex-input { height: 40px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); color: #fff; padding: 0 12px; font-family: inherit; outline: none; }
        .ex-input:focus { border-color: #F59E0B; box-shadow: 0 0 0 3px rgba(245,158,11,0.12); }
        .ex-primary { width: 100%; height: 42px; border: 0; border-radius: 8px; background: #F59E0B; color: #111; font-weight: 800; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
        .ex-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .ex-error { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.24); color: #EF4444; border-radius: 8px; padding: 10px 12px; font-size: 13px; margin-bottom: 14px; }
        .ex-table-wrap { overflow: auto; }
        .ex-table { width: 100%; border-collapse: collapse; min-width: 760px; }
        .ex-table th, .ex-table td { padding: 14px; border-bottom: 1px solid rgba(255,255,255,0.06); text-align: left; font-size: 13px; vertical-align: top; }
        .ex-table th { color: #A0A0A8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
        .ex-status { display: inline-flex; align-items: center; height: 24px; padding: 0 9px; border-radius: 999px; font-size: 11px; font-weight: 700; background: rgba(160,160,168,0.12); color: #D4D4D8; }
        .ex-status.verified { background: rgba(34,197,94,0.12); color: #22C55E; }
        .ex-status.pool { background: rgba(124,92,252,0.14); color: #A78BFA; }
        .ex-actions { display: grid; gap: 8px; min-width: 210px; }
        .ex-pool-form { display: grid; grid-template-columns: 1fr 78px 78px; gap: 6px; }
        .ex-small { height: 34px; font-size: 12px; }
        .ex-empty { padding: 42px 18px; color: #A0A0A8; text-align: center; }
        @media (max-width: 900px) {
          .ex-grid, .ex-stats { grid-template-columns: 1fr; }
          .ex-header { align-items: flex-start; flex-direction: column; }
          .ex-topbar { padding: 0 18px; }
          .ex-user { display: none; }
        }
      `}</style>

      <div className="ex-root">
        <header className="ex-topbar">
          <div className="ex-logo"><span className="ex-logo-dot" /> InvoiceFi Exporter</div>
          <span className="ex-user">{user?.full_name || user?.email}</span>
          <button className="ex-signout" onClick={handleSignOut}><LogOut size={16} /> Sign Out</button>
        </header>

        <main className="ex-main">
          <div className="ex-header">
            <div>
              <h1 className="ex-title">Exporter Dashboard</h1>
              <p className="ex-subtitle">Upload invoices, verify them, and convert eligible invoices into investor pools.</p>
            </div>
            <button className="ex-icon-btn" onClick={loadInvoices} disabled={loading}>
              <RefreshCw size={16} /> Refresh
            </button>
          </div>

          {error && <div className="ex-error">{error}</div>}

          <section className="ex-stats">
            <div className="ex-stat"><span className="ex-stat-icon"><FileText size={20} /></span><div><div className="ex-label">Invoices</div><div className="ex-value">{stats.invoices}</div></div></div>
            <div className="ex-stat"><span className="ex-stat-icon"><TrendingUp size={20} /></span><div><div className="ex-label">Invoice Value</div><div className="ex-value">{formatAmount(stats.total)}</div></div></div>
            <div className="ex-stat"><span className="ex-stat-icon"><ShieldCheck size={20} /></span><div><div className="ex-label">Pools Created</div><div className="ex-value">{stats.activePools}</div></div></div>
          </section>

          <div className="ex-grid">
            <section className="ex-panel">
              <h2>Upload Invoice</h2>
              <form onSubmit={handleSubmit}>
                <div className="ex-field"><label>Buyer name</label><input className="ex-input" value={form.buyer_name} onChange={(e) => setForm({ ...form, buyer_name: e.target.value })} required /></div>
                <div className="ex-field"><label>Buyer email</label><input className="ex-input" type="email" value={form.buyer_email} onChange={(e) => setForm({ ...form, buyer_email: e.target.value })} /></div>
                <div className="ex-field"><label>Buyer country</label><input className="ex-input" value={form.buyer_country} onChange={(e) => setForm({ ...form, buyer_country: e.target.value })} /></div>
                <div className="ex-field"><label>Invoice amount (MATIC)</label><input className="ex-input" type="number" step="0.00000001" min="0" value={form.invoice_amount} onChange={(e) => setForm({ ...form, invoice_amount: e.target.value })} required /></div>
                <div className="ex-field"><label>Due date</label><input className="ex-input" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} required /></div>
                <button className="ex-primary" disabled={saving}><Plus size={16} /> {saving ? 'Uploading...' : 'Upload Invoice'}</button>
              </form>
            </section>

            <section className="ex-table-wrap">
              {loading ? (
                <div className="ex-empty">Loading invoices...</div>
              ) : invoices.length === 0 ? (
                <div className="ex-empty">No invoices uploaded yet.</div>
              ) : (
                <table className="ex-table">
                  <thead>
                    <tr><th>Buyer</th><th>Amount</th><th>Due</th><th>Status</th><th>Pool</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td><strong>{invoice.buyer_name}</strong><br /><span className="ex-label">{invoice.buyer_email || invoice.buyer_country || 'No buyer details'}</span></td>
                        <td>{formatAmount(invoice.invoice_amount)}</td>
                        <td>{invoice.due_date}</td>
                        <td><span className={`ex-status ${invoice.status === 'VERIFIED' ? 'verified' : ''} ${invoice.status === 'POOL_CREATED' ? 'pool' : ''}`}>{invoice.status.replace('_', ' ')}</span></td>
                        <td>{invoice.pool_name || '-'}</td>
                        <td>
                          <div className="ex-actions">
                            {invoice.status === 'UPLOADED' && <button className="ex-icon-btn ex-small" onClick={() => verifyInvoice(invoice.id)}>Verify</button>}
                            {invoice.status === 'VERIFIED' && (
                              <>
                                <div className="ex-pool-form">
                                  <input className="ex-input ex-small" placeholder="Pool name" value={poolInputs[invoice.id]?.name || ''} onChange={(e) => updatePoolInput(invoice.id, 'name', e.target.value)} />
                                  <input className="ex-input ex-small" placeholder="APY" value={poolInputs[invoice.id]?.apy || ''} onChange={(e) => updatePoolInput(invoice.id, 'apy', e.target.value)} />
                                  <input className="ex-input ex-small" placeholder="Days" value={poolInputs[invoice.id]?.duration_days || ''} onChange={(e) => updatePoolInput(invoice.id, 'duration_days', e.target.value)} />
                                </div>
                                <button className="ex-icon-btn ex-small" onClick={() => createPool(invoice)}>Create Pool</button>
                              </>
                            )}
                            {invoice.status === 'POOL_CREATED' && <span className="ex-label">Pool #{invoice.pool_contract_id}</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
