// ─────────────────────────────────────────────────────────────
//  InvoiceFin — Invoice Service Layer
//  All data comes from the real Django backend API.
//  No localStorage fallbacks, no seed data.
// ─────────────────────────────────────────────────────────────
import { exporterApi } from './api';

/**
 * Map raw Django invoice objects (snake_case) to the shape the
 * ExporterDashboard components expect (camelCase + display aliases).
 */
function mapInvoice(raw) {
  return {
    id:              raw.id,
    invoiceNumber:   raw.invoice_number,
    buyerName:       raw.buyer_name,
    buyerCompany:    raw.buyer_company,
    amount:          raw.amount,
    currency:        raw.currency,
    issueDate:       raw.issue_date,
    dueDate:         raw.due_date,
    poNumber:        raw.po_number,
    country:         raw.country,
    description:     raw.description,
    fileName:        raw.pdf_url ? raw.pdf_url.split('/').pop() : 'invoice.pdf',
    status:          raw.status,
    fundedAmount:    raw.funded_amount,
    blockchainHash:  raw.blockchain_hash,
    createdAt:       raw.created_at,
    pool:            raw.pool ?? null,
  };
}

/**
 * Map activity entries from UploadHistory serializer to the
 * {id, text, timestamp, type} shape used by the activity feed.
 */
function mapActivity(raw) {
  const TYPE_MAP = {
    uploaded:      'upload',
    verified:      'verified',
    pool_created:  'funding',
    funded:        'funded',
    matured:       'completed',
    status_changed:'verified',
  };
  return {
    id:        raw.id,
    text:      raw.description,
    timestamp: new Date(raw.timestamp).toLocaleString(),
    type:      TYPE_MAP[raw.action_type] || 'upload',
  };
}

/**
 * Group invoices by month and sum funded amounts to produce a
 * 6-month bar chart dataset based on real data.
 */
function buildMonthlyFunding(invoices) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleString('default', { month: 'short' }),
      year:  d.getFullYear(),
      month: d.getMonth(),
      amount: 0,
    });
  }
  invoices.forEach((inv) => {
    const d = new Date(inv.createdAt || inv.created_at || '');
    if (isNaN(d)) return;
    const bucket = months.find(
      (m) => m.year === d.getFullYear() && m.month === d.getMonth()
    );
    if (bucket) bucket.amount += Number(inv.fundedAmount || inv.funded_amount || 0);
  });
  return months.map((m) => ({ month: m.label, amount: m.amount }));
}

export const invoiceService = {
  /**
   * Fetch all invoices for the authenticated exporter.
   * Throws on network/auth failure so the caller can show a real error.
   */
  async getAllInvoices() {
    const result = await exporterApi.listInvoices({ per_page: 100 });
    const raw = result.invoices ?? result;
    return Array.isArray(raw) ? raw.map(mapInvoice) : [];
  },

  /**
   * Fetch dashboard stats from real backend data.
   * monthlyFunding is computed from actual invoice created_at dates.
   */
  async getDashboardStats() {
    const [invoices, activitiesRaw] = await Promise.all([
      this.getAllInvoices(),
      exporterApi.getActivities(),
    ]);

    const by = (s) => invoices.filter((i) => i.status === s).length;
    const totalRaised = invoices.reduce((s, i) => s + (Number(i.fundedAmount) || 0), 0);
    const totalFace   = invoices.reduce((s, i) => s + (Number(i.amount)       || 0), 0);

    const statusMap = { Draft: 0, Verified: 0, Funding: 0, Funded: 0, Active: 0, Completed: 0 };
    invoices.forEach((i) => {
      if (i.status in statusMap) statusMap[i.status]++;
    });

    const activities = Array.isArray(activitiesRaw)
      ? activitiesRaw.map(mapActivity)
      : [];

    return {
      metrics: {
        totalInvoices:     invoices.length,
        activeInvoices:    by('Active'),
        fundedInvoices:    by('Funded') + by('Active') + by('Completed'),
        completedInvoices: by('Completed'),
        totalAmountRaised: totalRaised,
        pendingAmount:     Math.max(0, totalFace - totalRaised),
      },
      statusDistribution: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
      monthlyFunding: buildMonthlyFunding(invoices),
      activities: activities.slice(0, 10),
      invoices,
    };
  },

  /**
   * Fetch a single invoice by ID from the real backend.
   */
  async getInvoiceById(id) {
    const result = await exporterApi.getInvoice(id);
    return mapInvoice(result.invoice ?? result);
  },

  /**
   * Upload a new invoice via the real Django backend.
   * Throws with the real error message on failure — no localStorage stub.
   */
  async uploadInvoice(payload) {
    // Map camelCase form fields → snake_case API fields
    const body = {
      invoice_number: payload.invoiceNumber,
      buyer_name:     payload.buyerName,
      buyer_company:  payload.buyerCompany,
      amount:         payload.amount,
      currency:       payload.currency,
      issue_date:     payload.issueDate,
      due_date:       payload.dueDate,
      po_number:      payload.poNumber || '',
      country:        payload.country  || 'United States',
      description:    payload.description || '',
      pdf_url:        '',           // PDF upload via storage not yet wired
    };

    const data = await exporterApi.uploadInvoice(body);
    return {
      success:        true,
      invoice:        mapInvoice(data.invoice ?? data),
      blockchainHash: data.blockchainHash ?? data.blockchain_hash ?? '',
    };
  },
};
