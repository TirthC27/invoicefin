// ─────────────────────────────────────────────────────────────
//  InvoiceFi — Invoice Service Layer
//  Tries real API first; gracefully falls back to localStorage.
// ─────────────────────────────────────────────────────────────

const LS_KEY = 'invoicefi_invoices';
const LS_ACT = 'invoicefi_activities';

const SEED_INVOICES = [
  { id: 'INV-2026-001', invoiceNumber: 'INV-2026-001', buyerName: 'Raj Mehta',       buyerCompany: 'Acme Corp Inc.',         amount: 45000,  currency: 'USD', issueDate: '2026-06-15', dueDate: '2026-08-15', poNumber: 'PO-99281', country: 'United States',       description: 'Cross-border logistics equipment.',  fileName: 'invoice_acme_001.pdf',    status: 'Active',    fundedAmount: 45000, blockchainHash: '0x8f3e2b1a9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f', createdAt: '2026-06-16T10:30:00Z' },
  { id: 'INV-2026-002', invoiceNumber: 'INV-2026-002', buyerName: 'Klaus Bauer',     buyerCompany: 'Nexus Technologies GmbH', amount: 82000,  currency: 'EUR', issueDate: '2026-07-01', dueDate: '2026-09-01', poNumber: 'PO-88120', country: 'Germany',              description: 'Hardware component supply contract.', fileName: 'invoice_nexus_002.pdf',   status: 'Funding',   fundedAmount: 55000, blockchainHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b', createdAt: '2026-07-02T14:15:00Z' },
  { id: 'INV-2026-003', invoiceNumber: 'INV-2026-003', buyerName: 'Li Wei',          buyerCompany: 'Pacific Imports Ltd',    amount: 125000, currency: 'USD', issueDate: '2026-07-10', dueDate: '2026-09-30', poNumber: 'PO-77412', country: 'Singapore',           description: 'Textile and garment bulk shipment.',  fileName: 'invoice_pacific_003.pdf', status: 'Verified',  fundedAmount: 0,     blockchainHash: '0x3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e', createdAt: '2026-07-11T09:00:00Z' },
  { id: 'INV-2026-004', invoiceNumber: 'INV-2026-004', buyerName: 'Emma Wilson',     buyerCompany: 'London Retail PLC',     amount: 38000,  currency: 'GBP', issueDate: '2026-05-01', dueDate: '2026-07-01', poNumber: 'PO-55102', country: 'United Kingdom',      description: 'Consumer goods seasonal inventory.',  fileName: 'invoice_london_004.pdf',  status: 'Completed', fundedAmount: 38000, blockchainHash: '0x7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d', createdAt: '2026-05-02T11:20:00Z' },
  { id: 'INV-2026-005', invoiceNumber: 'INV-2026-005', buyerName: 'Ahmed Al Rashid', buyerCompany: 'Apex Global LLC',       amount: 60000,  currency: 'AED', issueDate: '2026-07-18', dueDate: '2026-10-18', poNumber: 'PO-33419', country: 'United Arab Emirates', description: 'Agricultural produce bulk supply.',    fileName: 'invoice_apex_005.pdf',    status: 'Draft',     fundedAmount: 0,     blockchainHash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b', createdAt: '2026-07-19T16:45:00Z' },
];

const SEED_ACTIVITIES = [
  { id: 'a1', text: 'Invoice INV-2026-003 status changed to Verified',            timestamp: '2 hours ago',  type: 'verified'  },
  { id: 'a2', text: 'Funding pool created for INV-2026-002 (€55,000 raised)',     timestamp: '5 hours ago',  type: 'funding'   },
  { id: 'a3', text: 'Uploaded new invoice INV-2026-005 (AED 60,000)',             timestamp: '1 day ago',    type: 'upload'    },
  { id: 'a4', text: 'Invoice INV-2026-004 matured — full payout completed',       timestamp: '2 days ago',   type: 'completed' },
  { id: 'a5', text: 'Blockchain hash generated for INV-2026-001',                 timestamp: '3 days ago',   type: 'hash'      },
  { id: 'a6', text: 'Buyer Acme Corp verified on-chain',                          timestamp: '4 days ago',   type: 'buyer'     },
  { id: 'a7', text: 'Exporter profile updated with Polygon Amoy wallet',          timestamp: '5 days ago',   type: 'profile'   },
  { id: 'a8', text: 'Invoice INV-2026-001 fully funded ($45,000)',                timestamp: '1 week ago',   type: 'funded'    },
];

function getInvoices() {
  try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : (() => { localStorage.setItem(LS_KEY, JSON.stringify(SEED_INVOICES)); return SEED_INVOICES; })(); }
  catch { return SEED_INVOICES; }
}
function saveInvoices(l) { try { localStorage.setItem(LS_KEY, JSON.stringify(l)); } catch {} }
function getActivities() {
  try { const r = localStorage.getItem(LS_ACT); return r ? JSON.parse(r) : (() => { localStorage.setItem(LS_ACT, JSON.stringify(SEED_ACTIVITIES)); return SEED_ACTIVITIES; })(); }
  catch { return SEED_ACTIVITIES; }
}
function saveActivities(l) { try { localStorage.setItem(LS_ACT, JSON.stringify(l)); } catch {} }

export function generateBlockchainHash() {
  const h = '0123456789abcdef';
  return '0x' + Array.from({ length: 64 }, () => h[Math.floor(Math.random() * 16)]).join('');
}

export const invoiceService = {
  async getAllInvoices() {
    try {
      const res = await fetch('/api/invoice/all', { headers: { Accept: 'application/json' } });
      if (res.ok) { const b = await res.json(); return Array.isArray(b) ? b : (b.invoices ?? getInvoices()); }
    } catch {}
    return getInvoices();
  },

  async getDashboardStats() {
    const invoices = await this.getAllInvoices();
    const activities = getActivities();
    const by = (s) => invoices.filter((i) => i.status === s).length;
    const totalRaised = invoices.reduce((s, i) => s + (Number(i.fundedAmount) || 0), 0);
    const totalFace   = invoices.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const statusMap   = { Draft: 0, Verified: 0, Funding: 0, Funded: 0, Active: 0, Completed: 0 };
    invoices.forEach((i) => { if (i.status in statusMap) statusMap[i.status]++; else statusMap.Draft++; });
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
      monthlyFunding: [
        { month: 'Feb', amount: 12000 }, { month: 'Mar', amount: 28000 },
        { month: 'Apr', amount: 38000 }, { month: 'May', amount: 45000 },
        { month: 'Jun', amount: 55000 }, { month: 'Jul', amount: 72000 },
      ],
      activities: activities.slice(0, 10),
      invoices,
    };
  },

  async getInvoiceById(id) {
    const all = getInvoices();
    return all.find((i) => i.id === id || i.invoiceNumber === id) ?? all[0];
  },

  async uploadInvoice(payload) {
    const hash = generateBlockchainHash();
    try {
      const body = { ...payload }; delete body.file;
      const res = await fetch('/api/invoice/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) { const d = await res.json(); return { success: true, invoice: d.invoice ?? d, blockchainHash: d.blockchainHash ?? hash }; }
    } catch {}
    // localStorage stub
    const inv = { id: payload.invoiceNumber, ...payload, fileName: payload.file?.name ?? 'invoice.pdf', status: 'Verified', fundedAmount: 0, blockchainHash: hash, createdAt: new Date().toISOString() };
    delete inv.file;
    saveInvoices([inv, ...getInvoices()]);
    saveActivities([{ id: `a-${Date.now()}`, text: `Uploaded & verified invoice ${inv.invoiceNumber} (${inv.currency} ${Number(inv.amount).toLocaleString()})`, timestamp: 'Just now', type: 'upload' }, ...getActivities()]);
    return { success: true, invoice: inv, blockchainHash: hash };
  },
};
