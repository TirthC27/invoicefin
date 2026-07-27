/**
 * InvoicesPage — Module 6: Exporter Invoice Table
 * Features:
 *  - Sortable columns (Amount, Due Date, Status, Created)
 *  - Search by invoice number or buyer name
 *  - Filter dropdown by Status
 *  - Pagination (20 per page)
 *  - Live compact countdown timer for Active/Funded invoices (Module 7)
 *    Uses a single shared tick (useTick) — one interval for all visible rows.
 */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, ChevronRight, ChevronUp, ChevronDown,
  Filter, TrendingUp, Clock, Plus, RotateCcw,
} from 'lucide-react';
import { exporterApi } from '../../lib/api';
import {
  fmtAmount, formatCountdown, useTick,
} from './exporterUtils';
import StatusBadge from './StatusBadge';

const ALL_STATUSES = ['Draft', 'Verified', 'Funding', 'Funded', 'Active', 'Completed'];
const COUNTABLE    = new Set(['Funded', 'Active']);

function CompactCountdown({ dueDate, tick }) {
  const target   = new Date(dueDate + 'T23:59:59Z').getTime();
  const ms       = Math.max(0, target - tick);
  const expired  = ms === 0;
  return (
    <span style={{
      fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
      color: expired ? '#EF4444' : '#22C55E',
    }}>
      {expired ? 'MATURED' : formatCountdown(ms)}
    </span>
  );
}

function SortIcon({ field, sort }) {
  if (sort.field !== field) return <span style={{ color: '#404048', marginLeft: 3 }}>⇅</span>;
  return sort.dir === 'asc'
    ? <ChevronUp size={13} style={{ marginLeft: 3 }} />
    : <ChevronDown size={13} style={{ marginLeft: 3 }} />;
}

export default function InvoicesPage() {
  const [invoices, setInvoices]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort]           = useState({ field: 'created_at', dir: 'desc' });
  const tick = useTick(); // shared second ticker for all countdown cells

  const PER_PAGE = 20;

  const load = useCallback(async (opts = {}) => {
    setLoading(true);
    const params = {
      page:     opts.page     ?? page,
      per_page: PER_PAGE,
      sort:     (opts.sort ?? sort).dir === 'desc'
                ? `-${(opts.sort ?? sort).field}`
                : (opts.sort ?? sort).field,
    };
    if (opts.search !== undefined ? opts.search : search) params.search = opts.search ?? search;
    if (opts.status !== undefined ? opts.status : statusFilter) params.status = opts.status ?? statusFilter;

    try {
      const data = await exporterApi.listInvoices(params);
      setInvoices(data.invoices ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.total_pages ?? 1);
    } catch (err) {
      console.error('Failed to load invoices:', err);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [page, sort, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSort = (field) => {
    const newSort = { field, dir: sort.field === field && sort.dir === 'asc' ? 'desc' : 'asc' };
    setSort(newSort);
    setPage(1);
    load({ sort: newSort, page: 1 });
  };

  const handleSearch = (v) => {
    setSearch(v);
    setPage(1);
    load({ search: v, page: 1 });
  };

  const handleStatus = (v) => {
    setStatusFilter(v);
    setPage(1);
    load({ status: v, page: 1 });
  };

  const handlePage = (p) => {
    setPage(p);
    load({ page: p });
  };

  const thStyle = (field) => ({
    padding: '10px 14px', textAlign: 'left',
    fontWeight: 600, fontSize: 11.5, color: '#A0A0A8',
    textTransform: 'uppercase', letterSpacing: '.5px',
    cursor: field ? 'pointer' : 'default', userSelect: 'none',
    whiteSpace: 'nowrap',
  });

  return (
    <div style={{ color: '#fff', fontFamily: "'Inter',sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, letterSpacing: '-.5px' }}>All Invoices</h2>
          <p style={{ margin: 0, fontSize: 13.5, color: '#A0A0A8' }}>{total} invoice{total !== 1 ? 's' : ''} total</p>
        </div>
        <Link to="/exporter/upload" style={{
          height: 40, padding: '0 18px', borderRadius: 12, fontSize: 14, fontWeight: 600,
          background: 'linear-gradient(135deg,#7C5CFC,#6B48F5)', color: '#fff',
          textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 7,
          boxShadow: '0 4px 14px rgba(124,92,252,.3)',
        }}>
          <Plus size={16} /> Upload Invoice
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#606068', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by invoice # or buyer name…"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#1A1A1F', border: '1px solid rgba(255,255,255,.08)',
              borderRadius: 10, color: '#fff', fontSize: 13.5,
              padding: '9px 14px 9px 36px', outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>
        {/* Status filter */}
        <div style={{ position: 'relative' }}>
          <Filter size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#606068', pointerEvents: 'none' }} />
          <select
            value={statusFilter}
            onChange={(e) => handleStatus(e.target.value)}
            style={{
              background: '#1A1A1F', border: '1px solid rgba(255,255,255,.08)',
              borderRadius: 10, color: statusFilter ? '#fff' : '#A0A0A8', fontSize: 13.5,
              padding: '9px 14px 9px 32px', outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            <option value="">All Statuses</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {/* Reset */}
        {(search || statusFilter) && (
          <button onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); load({ search: '', status: '', page: 1 }); }}
            style={{ height: 38, padding: '0 14px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, color: '#A0A0A8', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
            <RotateCcw size={13} /> Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: '#151518', border: '1px solid rgba(255,255,255,.07)', borderRadius: 18, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead style={{ borderBottom: '1px solid rgba(255,255,255,.08)' }}>
              <tr>
                <th style={thStyle('invoice_number')} onClick={() => handleSort('invoice_number')}>
                  Invoice <SortIcon field="invoice_number" sort={sort} />
                </th>
                <th style={thStyle(null)}>Buyer</th>
                <th style={thStyle('amount')} onClick={() => handleSort('amount')}>
                  Amount <SortIcon field="amount" sort={sort} />
                </th>
                <th style={thStyle('status')} onClick={() => handleSort('status')}>
                  Status <SortIcon field="status" sort={sort} />
                </th>
                <th style={thStyle(null)}>Funding</th>
                <th style={thStyle('due_date')} onClick={() => handleSort('due_date')}>
                  Due Date <SortIcon field="due_date" sort={sort} />
                </th>
                <th style={thStyle(null)}>Countdown</th>
                <th style={{ ...thStyle(null), textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: '40px 20px', textAlign: 'center', color: '#606068' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 20, height: 20, border: '2px solid rgba(124,92,252,.2)', borderTopColor: '#7C5CFC', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Loading invoices…
                  </div>
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '48px 20px', textAlign: 'center', color: '#606068' }}>
                  No invoices found.{search || statusFilter ? ' Try adjusting your filters.' : ' Upload your first invoice to get started.'}
                </td></tr>
              ) : invoices.map((inv) => {
                const fundPct = inv.funding_percent ?? 0;
                return (
                  <tr key={inv.id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,.04)', transition: 'background .15s', cursor: 'default' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,.025)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '13px 14px', fontWeight: 700 }}>
                      <Link to={`/exporter/invoices/${inv.id}`} style={{ color: '#E0E0E8', textDecoration: 'none' }}>
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td style={{ padding: '13px 14px', color: '#C0C0C8' }}>
                      <div style={{ fontWeight: 500 }}>{inv.buyer_name}</div>
                      <div style={{ fontSize: 11.5, color: '#606068' }}>{inv.buyer_company}</div>
                    </td>
                    <td style={{ padding: '13px 14px', fontWeight: 700 }}>
                      {fmtAmount(inv.amount, inv.currency)}
                    </td>
                    <td style={{ padding: '13px 14px' }}>
                      <StatusBadge status={inv.status} />
                    </td>
                    <td style={{ padding: '13px 14px' }}>
                      {/* Mini progress bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 60, height: 5, borderRadius: 99, background: 'rgba(255,255,255,.07)' }}>
                          <div style={{ height: '100%', width: `${Math.min(100, fundPct)}%`, borderRadius: 99, background: fundPct >= 100 ? '#22C55E' : '#7C5CFC' }} />
                        </div>
                        <span style={{ fontSize: 11.5, color: '#A0A0A8', fontWeight: 600 }}>{fundPct}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '13px 14px', color: '#A0A0A8', fontSize: 13 }}>
                      {inv.due_date}
                    </td>
                    <td style={{ padding: '13px 14px' }}>
                      {COUNTABLE.has(inv.status)
                        ? <CompactCountdown dueDate={inv.due_date} tick={tick} />
                        : <span style={{ color: '#404048', fontSize: 12 }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '13px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                        {inv.status === 'Verified' && !inv.pool && (
                          <Link to={`/exporter/invoices/${inv.id}`}
                            style={{ background: 'rgba(124,92,252,.1)', color: '#7C5CFC', border: '1px solid rgba(124,92,252,.2)', borderRadius: 8, padding: '4px 10px', textDecoration: 'none', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <TrendingUp size={12} /> Pool
                          </Link>
                        )}
                        <Link to={`/exporter/invoices/${inv.id}`}
                          style={{ color: '#7C5CFC', textDecoration: 'none', fontWeight: 600, fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          View <ChevronRight size={13} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#A0A0A8' }}>
              Page {page} of {totalPages} · {total} results
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = i + 1;
                const isActive = p === page;
                return (
                  <button key={p} onClick={() => handlePage(p)} style={{
                    width: 32, height: 32, borderRadius: 8, border: isActive ? '1px solid #7C5CFC' : '1px solid rgba(255,255,255,.08)',
                    background: isActive ? 'rgba(124,92,252,.15)' : 'transparent',
                    color: isActive ? '#7C5CFC' : '#A0A0A8', fontSize: 13, fontWeight: isActive ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit',
                  }}>{p}</button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
