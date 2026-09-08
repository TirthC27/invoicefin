import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { investorApi } from '../../lib/api';
import { Search, TrendingUp, ChevronRight, Percent } from 'lucide-react';

const POLL_INTERVAL = 10000;

export default function PoolsPage() {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const filtered = pools.filter(p => {
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'open' && p.is_settled) return false;
    if (filter === 'funded' && p.percent_filled < 100) return false;
    return true;
  });

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Investment Pools</h1>
          <p>Browse and invest in invoice-backed pools</p>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)', pointerEvents: 'none' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 40 }}
            placeholder="Search pools..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {['all', 'open', 'funded'].map(f => (
          <button key={f}
            onClick={() => setFilter(f)}
            className="btn btn-outline"
            style={filter === f ? { background: 'var(--color-accent)', borderColor: 'var(--color-accent)', fontWeight: 600 } : {}}>
            {f === 'all' ? 'All Pools' : f === 'open' ? 'Open' : 'Fully Funded'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--fg-muted)' }}>
          <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--color-accent-strong)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          Loading pools...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--fg-muted)' }}>
          <Percent size={40} style={{ marginBottom: 12, opacity: 0.25, margin: '0 auto 12px' }} />
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: 'var(--fg-secondary)' }}>No pools found</p>
          <p style={{ fontSize: 13 }}>Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filtered.map(pool => {
            const filled = pool.percent_filled || 0;
            const settled = pool.is_settled;
            return (
              <div key={pool.id} className="data-card"
                onClick={() => navigate(`/investor/pools/${pool.id}`)}
                style={{ cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}>
                <div style={{ padding: '20px 22px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 3 }}>{pool.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Pool #{pool.contract_pool_id}</div>
                    </div>
                    <span style={{
                      padding: '4px 10px', borderRadius: 50, fontSize: 11, fontWeight: 600,
                      background: settled ? 'rgba(34,197,94,0.1)' : filled >= 100 ? 'rgba(124,92,252,0.1)' : 'rgba(59,130,246,0.1)',
                      color: settled ? '#16a34a' : filled >= 100 ? '#7C5CFC' : '#2563eb',
                    }}>
                      {settled ? 'Settled' : filled >= 100 ? 'Fully Funded' : 'Open'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 14 }}>
                    {[
                      { label: 'APY', value: `${Number(pool.apy).toFixed(1)}%`, color: 'var(--color-positive)' },
                      { label: 'ROI', value: `${pool.roi}%`, color: '#7C5CFC' },
                      { label: 'Duration', value: `${pool.duration_days}d` },
                    ].map(s => (
                      <div key={s.label}>
                        <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>{s.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: s.color || 'var(--fg-primary)' }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: 6, background: 'var(--bg-muted)', borderRadius: 3, overflow: 'hidden', marginBottom: 14 }}>
                    <div style={{
                      height: '100%', borderRadius: 3, transition: 'width 0.6s ease',
                      width: `${Math.min(100, filled)}%`,
                      background: filled >= 100 ? 'linear-gradient(90deg, var(--color-accent-strong), #22c55e)' : 'var(--color-accent)',
                    }} />
                  </div>
                </div>

                <div style={{ padding: '0 22px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                    {filled.toFixed(1)}% funded · {pool.investor_count || 0} investors · {pool.days_remaining}d left
                  </span>
                  {!settled && filled < 100 && (
                    <button className="btn btn-accent btn-sm"
                      onClick={e => { e.stopPropagation(); navigate(`/investor/pools/${pool.id}`); }}>
                      Invest <ChevronRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
