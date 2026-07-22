import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { investorApi } from '../../lib/api';
import { Search, TrendingUp, Clock, Users, ChevronRight, Percent } from 'lucide-react';

const POLL_INTERVAL = 10000;

const RISK_COLOR = (score) => {
  if (!score && score !== 0) return { label: 'N/A', color: '#A0A0A8' };
  if (score >= 80) return { label: 'Low Risk', color: '#22C55E' };
  if (score >= 50) return { label: 'Medium', color: '#F59E0B' };
  return { label: 'High Risk', color: '#EF4444' };
};

export default function PoolsPage() {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | open | funded
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
      <style>{`
        .pp-title { font-size: 24px; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.5px; }
        .pp-subtitle { font-size: 14px; color: #A0A0A8; margin-bottom: 28px; }
        .pp-toolbar { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
        .pp-search { flex: 1; min-width: 200px; background: #151518; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 10px 16px 10px 42px; color: #fff; font-size: 14px; outline: none; font-family: inherit; position: relative; }
        .pp-search:focus { border-color: rgba(124,92,252,0.4); }
        .pp-search-wrap { position: relative; flex: 1; min-width: 200px; }
        .pp-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #A0A0A8; pointer-events: none; }
        .pp-filter-btn { padding: 10px 18px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: #A0A0A8; font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .pp-filter-btn.active { background: rgba(124,92,252,0.12); color: #7C5CFC; border-color: rgba(124,92,252,0.3); }
        .pp-filter-btn:hover { border-color: rgba(255,255,255,0.15); color: #fff; }
        .pp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
        .pp-card { background: #151518; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 24px; cursor: pointer; transition: all 0.25s; position: relative; overflow: hidden; }
        .pp-card:hover { border-color: rgba(124,92,252,0.25); transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
        .pp-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
        .pp-card-name { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
        .pp-card-id { font-size: 12px; color: #A0A0A8; }
        .pp-badge { padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
        .pp-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
        .pp-stat-label { font-size: 11px; color: #A0A0A8; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 500; }
        .pp-stat-value { font-size: 15px; font-weight: 700; }
        .pp-progress-bar { height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden; margin-bottom: 12px; }
        .pp-progress-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease; }
        .pp-card-footer { display: flex; justify-content: space-between; align-items: center; }
        .pp-invest-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 10px; background: linear-gradient(135deg, #7C5CFC, #6B48F5); color: #fff; font-size: 13px; font-weight: 600; border: none; cursor: pointer; font-family: inherit; transition: opacity 0.2s; }
        .pp-invest-btn:hover { opacity: 0.9; }
        .pp-empty { text-align: center; padding: 60px 20px; color: #A0A0A8; }
      `}</style>

      <h1 className="pp-title">Investment Pools</h1>
      <p className="pp-subtitle">Browse and invest in invoice-backed pools</p>

      <div className="pp-toolbar">
        <div className="pp-search-wrap">
          <Search size={18} className="pp-search-icon" />
          <input className="pp-search" placeholder="Search pools..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {['all', 'open', 'funded'].map(f => (
          <button key={f} className={`pp-filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}>
            {f === 'all' ? 'All Pools' : f === 'open' ? 'Open' : 'Fully Funded'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#A0A0A8' }}>Loading pools...</div>
      ) : filtered.length === 0 ? (
        <div className="pp-empty">
          <Percent size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No pools found</p>
          <p style={{ fontSize: 13 }}>Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="pp-grid">
          {filtered.map(pool => {
            const filled = pool.percent_filled || 0;
            const settled = pool.is_settled;
            return (
              <div key={pool.id} className="pp-card" onClick={() => navigate(`/investor/pools/${pool.id}`)}>
                <div className="pp-card-header">
                  <div>
                    <div className="pp-card-name">{pool.name}</div>
                    <div className="pp-card-id">Pool #{pool.contract_pool_id}</div>
                  </div>
                  <span className="pp-badge" style={{
                    background: settled ? 'rgba(34,197,94,0.1)' : filled >= 100 ? 'rgba(124,92,252,0.1)' : 'rgba(59,130,246,0.1)',
                    color: settled ? '#22C55E' : filled >= 100 ? '#7C5CFC' : '#3B82F6',
                  }}>
                    {settled ? 'Settled' : filled >= 100 ? 'Fully Funded' : 'Open'}
                  </span>
                </div>

                <div className="pp-stats">
                  <div>
                    <div className="pp-stat-label">APY</div>
                    <div className="pp-stat-value" style={{ color: '#22C55E' }}>{Number(pool.apy).toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="pp-stat-label">ROI</div>
                    <div className="pp-stat-value" style={{ color: '#7C5CFC' }}>{pool.roi}%</div>
                  </div>
                  <div>
                    <div className="pp-stat-label">Duration</div>
                    <div className="pp-stat-value">{pool.duration_days}d</div>
                  </div>
                </div>

                <div className="pp-progress-bar">
                  <div className="pp-progress-fill" style={{
                    width: `${Math.min(100, filled)}%`,
                    background: filled >= 100 ? 'linear-gradient(90deg, #7C5CFC, #22C55E)' : 'linear-gradient(90deg, #7C5CFC, #6B48F5)',
                  }} />
                </div>

                <div className="pp-card-footer">
                  <span style={{ fontSize: 12, color: '#A0A0A8' }}>
                    {filled.toFixed(1)}% funded · {pool.investor_count || 0} investors · {pool.days_remaining}d left
                  </span>
                  {!settled && filled < 100 && (
                    <button className="pp-invest-btn" onClick={e => { e.stopPropagation(); navigate(`/investor/pools/${pool.id}`); }}>
                      Invest <ChevronRight size={14} />
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
