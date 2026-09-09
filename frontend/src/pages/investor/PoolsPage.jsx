import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { investorApi } from '../../lib/api';
import { Search, TrendingUp, ChevronRight, Percent } from 'lucide-react';

const POLL_INTERVAL = 10000;

/* Skeleton card for loading state */
function PoolCardSkeleton() {
  return (
    <div className="data-card" style={{ padding: '20px 22px 18px', borderRadius: 14 }}>
      <style>{`
        @keyframes poolSk{0%,100%{opacity:.7}50%{opacity:.3}}
        .pool-sk{animation:poolSk 1.4s ease-in-out infinite;background:var(--bg-muted);border-radius:6px}
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div className="pool-sk" style={{ width: 140, height: 14, marginBottom: 7 }} />
          <div className="pool-sk" style={{ width: 80, height: 11 }} />
        </div>
        <div className="pool-sk" style={{ width: 64, height: 22, borderRadius: 50 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
        {[0, 1, 2].map(i => (
          <div key={i}>
            <div className="pool-sk" style={{ width: '50%', height: 10, marginBottom: 5 }} />
            <div className="pool-sk" style={{ width: '70%', height: 15 }} />
          </div>
        ))}
      </div>
      <div className="pool-sk" style={{ height: 7, borderRadius: 6, marginBottom: 16 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="pool-sk" style={{ width: 160, height: 11 }} />
        <div className="pool-sk" style={{ width: 64, height: 30, borderRadius: 8 }} />
      </div>
    </div>
  );
}

export default function PoolsPage() {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();
  const intervalRef = useRef(null);

  const fetchPools = useCallback(async () => {
    try {
      const data = await investorApi.listPools();
      setPools(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchPools();
    intervalRef.current = setInterval(fetchPools, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchPools]);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(timer);
  }, []);

  const filtered = pools.filter(p => {
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'open' && p.is_settled) return false;
    if (filter === 'funded' && p.percent_filled < 100) return false;
    return true;
  });

  return (
    <>
      <style>{`
        @keyframes poolCardIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes progressShimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
        .pool-card-enter {
          animation: poolCardIn 0.32s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .pool-search-input {
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
          background: #ffffff !important;
          border: 1px solid rgba(0, 0, 0, 0.12) !important;
          color: #111111 !important;
          border-radius: 10px !important;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease !important;
        }
        .pool-search-input:focus {
          border-color: rgba(0, 0, 0, 0.35) !important;
          box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.06) !important;
          background: #ffffff !important;
        }
        .pool-filter-btn {
          transition: background 0.2s ease, border-color 0.2s ease,
                      color 0.2s ease, transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.2s ease !important;
          border-radius: 50px !important;
          background: rgba(0, 0, 0, 0.04) !important;
          border-color: rgba(0, 0, 0, 0.12) !important;
          color: rgba(0, 0, 0, 0.65) !important;
        }
        .pool-filter-btn:hover {
          transform: translateY(-1px) scale(1.02);
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
          color: #111111 !important;
          background: rgba(0, 0, 0, 0.08) !important;
        }
        .pool-filter-btn:active {
          transform: scale(0.95) translateY(0) !important;
        }
        .pool-filter-btn.active {
          background: #111111 !important;
          border-color: #111111 !important;
          color: #ffffff !important;
          font-weight: 700 !important;
          box-shadow: 0 3px 12px rgba(0, 0, 0, 0.15) !important;
        }
        .pool-card-wrap {
          position: relative !important;
          overflow: hidden !important;
          cursor: pointer;
          border-radius: 14px !important;
          background: #ffffff !important;
          border: 1px solid rgba(0, 0, 0, 0.08) !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
          transition: box-shadow 0.35s cubic-bezier(0.22, 0.9, 0.3, 1),
                      transform 0.35s cubic-bezier(0.22, 0.9, 0.3, 1),
                      border-color 0.25s ease !important;
        }
        .pool-card-wrap:hover {
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.10) !important;
          transform: translateY(-4px) !important;
          border-color: rgba(0, 0, 0, 0.14) !important;
        }
        .pool-card-wrap:active {
          transform: translateY(-1px) scale(0.99) !important;
        }
        .pool-card-base-content {
          transition: transform 0.35s cubic-bezier(0.22, 0.9, 0.3, 1),
                      opacity 0.3s ease !important;
          transform: translateY(0);
          opacity: 1;
        }
        .pool-card-wrap:hover .pool-card-base-content {
          transform: translateY(-6px);
          opacity: 0.35;
        }
        .pool-card-reveal-panel {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 26px 22px 18px;
          background: linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.96) 24%,
            #ffffff 100%
          );
          transform: translateY(100%);
          transition: transform 0.35s cubic-bezier(0.22, 0.9, 0.3, 1) !important;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          gap: 12px;
          z-index: 10;
        }
        .pool-card-wrap:hover .pool-card-reveal-panel {
          transform: translateY(0%);
          pointer-events: auto;
        }
        .pool-status-badge {
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          transition: all 0.2s ease;
        }
        .pool-progress {
          height: 7px;
          background: rgba(0, 0, 0, 0.08);
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 14px;
          position: relative;
        }
        .pool-progress-fill {
          height: 100%;
          border-radius: 6px;
          position: relative;
          overflow: hidden;
          transition: width 0.85s cubic-bezier(0.34, 1.2, 0.64, 1);
        }
        .pool-progress-fill::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.35) 50%, transparent 100%);
          animation: progressShimmer 2.4s infinite ease-in-out;
        }
        .pool-search-wrap {
          position: relative;
          flex: 1;
          min-width: 200px;
        }
        .pool-search-icon {
          position: absolute; left: 14px; top: 50%;
          transform: translateY(-50%);
          color: rgba(0, 0, 0, 0.45);
          pointer-events: none;
          transition: color 0.18s;
        }
        .pool-search-wrap:focus-within .pool-search-icon {
          color: #111111;
        }
        .pool-invest-btn {
          position: relative !important;
          overflow: hidden !important;
          background: #111111 !important;
          color: #ffffff !important;
          border: 1px solid #111111 !important;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15) !important;
          transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.22s ease,
                      background 0.2s ease !important;
          display: inline-flex;
          align-items: center;
          border-radius: 8px !important;
        }
        .pool-invest-btn::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -75%;
          width: 50%;
          height: 200%;
          background: linear-gradient(
            115deg,
            transparent 0%,
            rgba(255, 255, 255, 0.3) 50%,
            transparent 100%
          );
          transform: rotate(25deg) translateX(-100%);
          transition: transform 0.65s ease;
          pointer-events: none;
        }
        .pool-invest-btn:hover::after {
          transform: rotate(25deg) translateX(350%);
        }
        .pool-invest-btn:hover {
          background: #262626 !important;
          transform: translateY(-1px) scale(1.02) !important;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2) !important;
        }
        .pool-invest-btn:hover svg {
          transform: translateX(3.5px) !important;
        }
        .pool-invest-btn:active {
          transform: scale(0.96) translateY(0) !important;
        }
        .pool-invest-btn svg {
          transition: transform 0.2s ease !important;
        }
      `}</style>

      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Investment Pools</h1>
          <p>Browse and invest in invoice-backed pools</p>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="pool-search-wrap">
          <Search size={15} className="pool-search-icon" />
          <input
            className="form-input pool-search-input"
            style={{ paddingLeft: 40, height: 40, fontSize: 13.5 }}
            placeholder="Search pools..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'open', 'funded'].map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              className={`btn btn-outline btn-sm pool-filter-btn${filter === f ? ' active' : ''}`}
            >
              {f === 'all' ? 'All Pools' : f === 'open' ? 'Open' : 'Fully Funded'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {[0, 1, 2, 3].map(i => <PoolCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '70px 20px', color: 'var(--fg-muted)', animation: 'poolCardIn 0.3s ease both' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Percent size={24} style={{ opacity: 0.35 }} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: 'var(--fg-secondary)' }}>No pools found</p>
          <p style={{ fontSize: 13 }}>Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filtered.map((pool, idx) => {
            const filled = pool.percent_filled || 0;
            const settled = pool.is_settled;
            const filledWidth = mounted ? `${Math.min(100, filled)}%` : '0%';
            const staggerDelay = `${idx * 0.05}s`;
            const fillDelay = `${idx * 0.06 + 0.08}s`;

            return (
              <div
                key={pool.id}
                className="data-card pool-card-wrap pool-card-enter"
                style={{ animationDelay: staggerDelay }}
                onClick={() => navigate(`/investor/pools/${pool.id}`)}
              >
                {/* Resting Base Content */}
                <div className="pool-card-base-content">
                  <div style={{ padding: '20px 22px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 3, letterSpacing: '-0.2px', wordBreak: 'break-word', color: '#111111' }}>{pool.name}</div>
                        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.52)' }}>Pool #{pool.contract_pool_id}</div>
                      </div>
                      <span className="pool-status-badge" style={{
                        padding: '4px 11px', borderRadius: 50, fontSize: 10.5, fontWeight: 700,
                        letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0,
                        background: 'rgba(0, 0, 0, 0.06)',
                        color: '#111111',
                        border: '1px solid rgba(0, 0, 0, 0.12)',
                      }}>
                        {settled ? 'Settled' : filled >= 100 ? 'Fully Funded' : 'Open'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 14 }}>
                      {[
                        { label: 'APY', value: `${Number(pool.apy).toFixed(1)}%`, color: '#111111' },
                        { label: 'ROI', value: `${pool.roi}%`, color: '#333333' },
                        { label: 'Duration', value: `${pool.duration_days}d`, color: '#111111' },
                      ].map(s => (
                        <div key={s.label}>
                          <div style={{ fontSize: 10.5, color: 'rgba(0,0,0,0.52)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{s.label}</div>
                          <div style={{ fontSize: 15.5, fontWeight: 700, color: s.color, letterSpacing: '-0.2px' }}>{s.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Progress bar */}
                    <div className="pool-progress">
                      <div
                        className="pool-progress-fill"
                        style={{
                          width: filledWidth,
                          transitionDelay: fillDelay,
                          background: '#111111',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ padding: '0 22px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.52)' }}>
                      <strong style={{ color: '#111111', fontWeight: 600 }}>{filled.toFixed(1)}%</strong> funded · {pool.investor_count || 0} investors · {pool.days_remaining}d left
                    </span>
                  </div>
                </div>

                {/* Hover Reveal Detail Panel */}
                <div className="pool-card-reveal-panel">
                  <p style={{ fontSize: 12.5, color: 'rgba(0,0,0,0.72)', margin: 0, lineHeight: 1.45, fontWeight: 500, textAlign: 'center' }}>
                    Invoice-backed pool with {pool.investor_count || 0} active investors · {pool.duration_days}-day term · {pool.days_remaining}d remaining.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <button
                      className="btn btn-accent btn-sm pool-invest-btn"
                      style={{ gap: 5, fontWeight: 700, padding: '7px 24px', borderRadius: 8 }}
                      onClick={e => { e.stopPropagation(); navigate(`/investor/pools/${pool.id}`); }}
                    >
                      {!settled && filled < 100 ? 'Invest Now' : 'View Details'} <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

