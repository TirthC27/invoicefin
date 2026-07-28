/**
 * API client for multi-role endpoints (admin, law firm, notifications).
 * Uses Supabase JWT tokens for private API authentication.
 */
import { supabase } from './supabaseClient';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

async function getAuthHeaders() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) {
    throw new Error('Not authenticated. Please sign in again.');
  }
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

async function parseResponse(resp) {
  const text = await resp.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

async function apiRequest(method, path, body = null, options = {}) {
  const headers = options.auth === false
    ? { 'Content-Type': 'application/json' }
    : await getAuthHeaders();
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  let resp;
  try {
    resp = await fetch(`${API_BASE}${path}`, opts);
  } catch (err) {
    console.error(`[API Network Error] ${method} ${API_BASE}${path} failed:`, err);
    throw {
      status: 0,
      error: `Unable to connect to backend at ${API_BASE}. Please verify server status and CORS settings.`,
      message: err?.message || 'Network request failed',
    };
  }

  const data = await parseResponse(resp);

  if (!resp.ok) {
    throw { status: resp.status, ...data };
  }
  return data;
}

export const adminApi = {
  listLawFirms: () => apiRequest('GET', '/admin/law-firms/'),
  createLawFirm: (data) => apiRequest('POST', '/admin/law-firms/create/', data),
  updateLawFirm: (id, data) => apiRequest('PATCH', `/admin/law-firms/${id}/`, data),
  listRecoveryCases: () => apiRequest('GET', '/admin/recovery-cases/'),
  createRecoveryCase: (data) => apiRequest('POST', '/admin/recovery-cases/create/', data),
  assignLawFirm: (caseId, lawFirmId) =>
    apiRequest('POST', `/admin/recovery-cases/${caseId}/assign/`, { law_firm_id: lawFirmId }),
  listUsers: (role = null) =>
    apiRequest('GET', `/admin/users/${role ? `?role=${role}` : ''}`),
};

export const lawfirmApi = {
  listCases: () => apiRequest('GET', '/lawfirm/cases/'),
  getCaseDetail: (id) => apiRequest('GET', `/lawfirm/cases/${id}/`),
  createEvent: (caseId, data) => apiRequest('POST', `/lawfirm/cases/${caseId}/events/`, data),
  uploadDocument: (caseId, data) => apiRequest('POST', `/lawfirm/cases/${caseId}/documents/`, data),
};

export const notificationsApi = {
  list: () => apiRequest('GET', '/notifications/'),
  markRead: (id) => apiRequest('PATCH', `/notifications/${id}/read/`),
  markAllRead: () => apiRequest('POST', '/notifications/read-all/'),
};

const investorApi = {
  listPools: () => apiRequest('GET', '/pools/', null, { auth: false }),
  getPoolDetail: (id) => apiRequest('GET', `/pools/${id}/`, null, { auth: false }),
  calculateInvestment: (data) => apiRequest('POST', '/investment/calculate/', data),
  verifyInvestment: (txHash) => apiRequest('POST', '/investments/verify/', { tx_hash: txHash }),
  getPortfolio: () => apiRequest('GET', '/portfolio/'),
  getRecoveryCases: () => apiRequest('GET', '/investor/recovery-cases/'),
};
export { investorApi };

export const exporterApi = {
  uploadInvoice: (data) => apiRequest('POST', '/exporter/invoices/', data),
  listInvoices: (params = {}) => apiRequest('GET',
    '/exporter/invoices/list/?' + new URLSearchParams(params).toString()),
  getInvoice: (id) => apiRequest('GET', `/exporter/invoices/${id}/`),
  createPool: (id, data) => apiRequest('POST', `/exporter/invoices/${id}/pool/`, data),
  updateStatus: (id, status) => apiRequest('PATCH', `/exporter/invoices/${id}/status/`, { status }),
  matureInvoice: (id) => apiRequest('PATCH', `/exporter/invoices/${id}/mature/`),
  getActivities: () => apiRequest('GET', '/exporter/activities/'),
};
