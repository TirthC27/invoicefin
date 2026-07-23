/**
 * API client for multi-role endpoints (admin, law firm, notifications).
 * Uses the same Supabase JWT token for authentication.
 */
import { supabase } from './supabaseClient';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

async function apiRequest(method, path, body = null) {
  const headers = await getAuthHeaders();
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const resp = await fetch(`${API_BASE}${path}`, opts);
  const data = await resp.json();

  if (!resp.ok) {
    throw { status: resp.status, ...data };
  }
  return data;
}

// ── Admin API ───────────────────────────────────────────
export const adminApi = {
  // Law Firms
  listLawFirms: () => apiRequest('GET', '/admin/law-firms/'),
  createLawFirm: (data) => apiRequest('POST', '/admin/law-firms/create/', data),
  updateLawFirm: (id, data) => apiRequest('PATCH', `/admin/law-firms/${id}/`, data),

  // Recovery Cases
  listRecoveryCases: () => apiRequest('GET', '/admin/recovery-cases/'),
  createRecoveryCase: (data) => apiRequest('POST', '/admin/recovery-cases/create/', data),
  assignLawFirm: (caseId, lawFirmId) =>
    apiRequest('POST', `/admin/recovery-cases/${caseId}/assign/`, { law_firm_id: lawFirmId }),

  // Users
  listUsers: (role = null) =>
    apiRequest('GET', `/admin/users/${role ? `?role=${role}` : ''}`),
};

// ── Law Firm API ────────────────────────────────────────
export const lawfirmApi = {
  listCases: () => apiRequest('GET', '/lawfirm/cases/'),
  getCaseDetail: (id) => apiRequest('GET', `/lawfirm/cases/${id}/`),
  createEvent: (caseId, data) =>
    apiRequest('POST', `/lawfirm/cases/${caseId}/events/`, data),
  uploadDocument: (caseId, data) =>
    apiRequest('POST', `/lawfirm/cases/${caseId}/documents/`, data),
};

// ── Notifications API ───────────────────────────────────
export const notificationsApi = {
  list: () => apiRequest('GET', '/notifications/'),
  markRead: (id) => apiRequest('PATCH', `/notifications/${id}/read/`),
  markAllRead: () => apiRequest('POST', '/notifications/read-all/'),
};

// ── Investor API ──────────────────────────────────────────
const investorApi = {
  listPools: () => apiRequest('GET', '/pools/'),
  getPoolDetail: (id) => apiRequest('GET', `/pools/${id}/`),
  calculateInvestment: (data) => apiRequest('POST', '/investment/calculate/', data),
  getPortfolio: () => apiRequest('GET', '/portfolio/'),
  getRecoveryCases: () => apiRequest('GET', '/investor/recovery-cases/'),
};
export { investorApi };

// ── Exporter API ──────────────────────────────────────────
export const exporterApi = {
  // Invoice CRUD
  uploadInvoice:  (data)          => apiRequest('POST', '/exporter/invoices/', data),
  listInvoices:   (params = {})   => apiRequest('GET',
    '/exporter/invoices/list/?' + new URLSearchParams(params).toString()),
  getInvoice:     (id)            => apiRequest('GET',  `/exporter/invoices/${id}/`),

  // Pool
  createPool:     (id, data)      => apiRequest('POST',  `/exporter/invoices/${id}/pool/`, data),

  // Status transitions
  updateStatus:   (id, status)    => apiRequest('PATCH', `/exporter/invoices/${id}/status/`, { status }),
  matureInvoice:  (id)            => apiRequest('PATCH', `/exporter/invoices/${id}/mature/`),

  // Activities
  getActivities:  ()              => apiRequest('GET', '/exporter/activities/'),
};
