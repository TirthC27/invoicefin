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
  const target  = new Date(dueDate + 'T23:59:59Z').getTime();
  const ms      = Math.max(0, target - tick);
  const expired = ms === 0;
  return (
    <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: expired ? 'var(--color-negative)' : 'var(--color-positive)' }}>
      {expired ? 'MATURED' : formatCountdown(ms)}
    </span>
  );
}

function SortIcon({ field, sort }) {
  if (sort.field !== field) return <span style={{ color: 'var(--fg-muted)', marginLeft: 3 }}>⇅</span>;
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
    <div>
      <style>{`
        @keyframes invRowIn {
          from { opacity: 0; transform: translateX(-4px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes invShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .inv-sk {
          background: linear-gradient(90deg, var(--bg-muted) 25%, var(--border) 50%, var(--bg-muted) 75%);
          background-size: 200% 100%;
          animation: invShimmer 1.5s ease-in-out infinite;
          border-radius: 5px;
        }
        .inv-th-sort {
          transition: color 0.14s ease, background 0.14s ease;
          border-radius: 6px;
          padding: 8px 10px;
        }
        .inv-th-sort:hover { color: var(--fg-primary) !important; background: var(--bg-muted); }
        tbody tr { transition: background 0.12s ease; }
        .inv-row:hover { background: var(--bg-muted); }
        .inv-action-link {
          transition: color 0.14s, opacity 0.14s, transform 0.16s cubic-bezier(0.34,1.56,0.64,1);
          display: inline-flex; align-items: center; gap: 3px;
        }
        .inv-action-link:hover { opacity: 0.75; transform: translateX(2px); }
        .inv-pool-btn {
          display: inline-flex; align-items: center; gap: 4px;
          background: rgba(255,255,255,.08); color: #ffffff;
          border: 1px solid rgba(255,255,255,.2); border-radius: 8px;
          padding: 4px 11px; text-decoration: none;
          font-size: 12px; font-weight: 700;
          transition: background 0.16s, transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.16s;
        }
        .inv-pool-btn:hover { background: rgba(255,255,255,.16); transform: translateY(-1px); box-shadow: 0 3px 10px rgba(0,0,0,.3); }
        .inv-pool-btn:active { transform: scale(0.96); }
        .inv-pg-btn {
          transition: background 0.14s, border-color 0.14s, color 0.14s, transform 0.18s cubic-bezier(0.34,1.56,0.64,1);
        }
        .inv-pg-btn:not(.inv-pg-active):hover {
          border-color: var(--border-strong) !important;
          color: var(--fg-primary) !important;
          transform: translateY(-1px);
        }
        .inv-pg-btn:active { transform: scale(0.93) !important; }
      `}</style>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>All Invoices</h1>
          <p>{total} invoice{total !== 1 ? 's' : ''} total</p>
        </div>
        <Link to="/exporter/upload" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          <Plus size={15} /> Upload Invoice
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by invoice # or buyer name…"
            className="form-input"
            style={{ paddingLeft: 36, fontSize: 13.5 }}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <Filter size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)', pointerEvents: 'none' }} />
          <select
            value={statusFilter}
            onChange={(e) => handleStatus(e.target.value)}
            className="form-input"
            style={{ paddingLeft: 32, fontSize: 13.5, cursor: 'pointer' }}
          >
            <option value="">All Statuses</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {(search || statusFilter) && (
          <button onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); load({ search: '', status: '', page: 1 }); }}
            className="btn btn-outline" style={{ height: 38 }}>
            <RotateCcw size={13} /> Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div className="data-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ fontSize: 13.5 }}>
            <thead>
              <tr>
                <th style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }} onClick={() => handleSort('invoice_number')}>
                  Invoice <SortIcon field="invoice_number" sort={sort} />
                </th>
                <th>Buyer</th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('amount')}>
                  Amount <SortIcon field="amount" sort={sort} />
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('status')}>
                  Status <SortIcon field="status" sort={sort} />
                </th>
                <th>Funding</th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('due_date')}>
                  Due Date <SortIcon field="due_date" sort={sort} />
                </th>
                <th>Countdown</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  {[...Array(6)].map((_, i) => (
                    <tr key={i}>
                      {[140, 120, 80, 70, 70, 70, 70, 50].map((w, j) => (
                        <td key={j} style={{ padding: '14px 14px' }}>
                          <div className="inv-sk" style={{ width: w, height: 13 }} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--fg-muted)' }}>
                  No invoices found.{search || statusFilter ? ' Try adjusting your filters.' : ' Upload your first invoice to get started.'}
                </td></tr>
              ) : invoices.map((inv) => {
                const fundPct = inv.funding_percent ?? 0;
                return (
                  <tr key={inv.id} className="inv-row" style={{ animation: `invRowIn 0.22s ${Math.min(0.04 * (invoices.indexOf(inv)), 0.3)}s ease both` }}>
                    <td style={{ fontWeight: 700, letterSpacing: '-0.1px' }}>
                      <Link to={`/exporter/invoices/${inv.id}`} style={{ color: 'var(--fg-primary)', textDecoration: 'none' }}>
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{inv.buyer_name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', marginTop: 1 }}>{inv.buyer_company}</div>
                    </td>
                    <td style={{ fontWeight: 700, letterSpacing: '-0.2px' }}>{fmtAmount(inv.amount, inv.currency)}</td>
                    <td><StatusBadge status={inv.status} /></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 60, height: 5, borderRadius: 99, background: 'var(--bg-muted)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(100, fundPct)}%`, borderRadius: 99, background: fundPct >= 100 ? 'var(--color-positive)' : 'var(--color-accent-strong)', transition: 'width 0.6s ease' }} />
                        </div>
                        <span style={{ fontSize: 11.5, color: 'var(--fg-muted)', fontWeight: 700 }}>{fundPct}%</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--fg-muted)', fontSize: 13 }}>{inv.due_date}</td>
                    <td>
                      {COUNTABLE.has(inv.status)
                        ? <CompactCountdown dueDate={inv.due_date} tick={tick} />
                        : <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>—</span>
                      }
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                        {inv.status === 'Verified' && !inv.pool && (
                          <Link to={`/exporter/invoices/${inv.id}`} className="inv-pool-btn">
                            <TrendingUp size={12} /> Pool
                          </Link>
                        )}
                        <Link to={`/exporter/invoices/${inv.id}`}
                          className="inv-action-link"
                          style={{ color: 'var(--color-accent-fg)', textDecoration: 'none', fontWeight: 600, fontSize: 12.5 }}>
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
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Page {page} of {totalPages} · {total} results</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = i + 1;
                const isActive = p === page;
                return (
                  <button key={p} onClick={() => handlePage(p)}
                    className={`inv-pg-btn${isActive ? ' inv-pg-active' : ''}`}
                    style={{
                      width: 32, height: 32, borderRadius: 8, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer',
                      border: isActive ? '1.5px solid var(--color-accent-strong)' : '1px solid var(--border)',
                      background: isActive ? 'var(--color-accent)' : 'transparent',
                      color: isActive ? 'var(--color-accent-fg)' : 'var(--fg-muted)',
                      fontWeight: isActive ? 700 : 400,
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
