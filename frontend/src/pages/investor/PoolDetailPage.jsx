import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { investorApi } from '../../lib/api';
import { useWallet } from '../../context/WalletContext';
import { investInPool } from '../../lib/contractService';
import { ArrowLeft, TrendingUp, Clock, Users, Shield, Percent, CheckCircle2, Loader2 } from 'lucide-react';

const POLL_INTERVAL = 10000;

const getNestedProviderError = (err) => err?.error || err?.info?.error || null;

const getInvestmentErrorText = (err) => [
  err?.message,
  err?.shortMessage,
  err?.reason,
  getNestedProviderError(err)?.message,
  err?.stack,
].filter(Boolean).join(' ');

const isUserRejection = (err) => {
  const text = getInvestmentErrorText(err).toLowerCase();
  return err?.code === 'ACTION_REJECTED' || err?.code === 4001 || text.includes('user rejected');
};

const isInsufficientFunds = (err) => {
  const text = getInvestmentErrorText(err).toLowerCase();
  return err?.code === 'INSUFFICIENT_FUNDS' || text.includes('insufficient funds');
};

const isConfirmationTimeout = (err) => err?.code === 'TRANSACTION_CONFIRMATION_TIMEOUT';

const isWalletInteractionTimeout = (err) => err?.code === 'WALLET_INTERACTION_TIMEOUT';

const isWalletRpcIssue = (err) => {
  const nested = getNestedProviderError(err);
  const text = getInvestmentErrorText(err);
  return (
    text.includes('BrowserProvider') ||
    text.includes('eth_blockNumber') ||
    (err?.code === 'UNKNOWN_ERROR' && nested?.code === -32002)
  );
};

const isGenuineRateLimit = (err) => {
  const nested = getNestedProviderError(err);
  const text = getInvestmentErrorText(err).toLowerCase();
  return (
    err?.code === 429 ||
    nested?.code === 429 ||
    text.includes('too many requests')
  );
};

const isNetworkFetchFailure = (err) => {
  const text = getInvestmentErrorText(err).toLowerCase();
  return text.includes('fetch failed') || text.includes('networkerror') || text.includes('failed to fetch');
};

export default function PoolDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const wallet = useWallet();
  const [pool, setPool] = useState(null);
  const [loading, setLoading] = useState(true);

  // Invest modal state
  const [showInvest, setShowInvest] = useState(false);
  const [amount, setAmount] = useState('');
  const [calcData, setCalcData] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [step, setStep] = useState('input'); // input | pending | confirming | verifying | success | error
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const debounceRef = useRef(null);
  const intervalRef = useRef(null);

  const fetchPool = useCallback(async () => {
    try {
      const data = await investorApi.getPoolDetail(id);
      setPool(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    fetchPool();
    intervalRef.current = setInterval(fetchPool, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchPool]);

  // Debounced server-side calculation
  useEffect(() => {
    if (!amount || Number(amount) <= 0 || !pool) {
      setCalcData(null);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setCalcLoading(true);
      try {
        const data = await investorApi.calculateInvestment({ pool_id: pool.id, amount });
        setCalcData(data);
      } catch (err) {
        setCalcData(null);
        if (err?.error) setError(err.error);
      }
      setCalcLoading(false);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [amount, pool]);

  const handleInvest = async () => {
    if (!amount || Number(amount) <= 0 || step !== 'input') return;
    setStep('pending');
    setError('');
    try {
      let result;
      if (wallet.signer?.isMock) {
        const dummyTxHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        result = {
          txHash: dummyTxHash,
          wait: async () => { await new Promise(r => setTimeout(r, 1500)); return { blockNumber: Math.floor(Math.random() * 500000) + 12000000, status: 'confirmed' }; },
        };
      } else {
        result = await investInPool(wallet.signer, pool.contract_pool_id, amount);
      }
      setTxHash(result.txHash);
      setStep('confirming');
      const receipt = await result.wait();
      if (receipt.status === 'confirmed' || receipt.status === 1) {
        setStep('verifying');
        try {
          await investorApi.verifyInvestment(result.txHash);
          await fetchPool();
          setStep('success');
        } catch (e) {
          console.error('Backend verify failed:', e);
          setStep('error');
          if (e?.status === 503) {
            setError('The backend could not reach the blockchain RPC to verify this transaction. Please wait a moment and verify again before retrying.');
          } else {
            setError(e?.error || 'Backend verification failed. Please retry after the transaction is indexed.');
          }
        }
      } else {
        setStep('error');
        setError('Transaction reverted on-chain.');
      }
    } catch (err) {
      console.error('[Investment] Raw transaction error', {
        err,
        code: err?.code,
        message: err?.message,
        shortMessage: err?.shortMessage,
        reason: err?.reason,
        error: err?.error,
        info: err?.info,
        data: err?.data,
        stack: err?.stack,
      });
      setStep('error');
      if (isUserRejection(err)) {
        setStep('input');
        return;
      } else if (isWalletInteractionTimeout(err)) {
        setError("Your wallet isn't responding. This is often caused by a network connection issue inside your wallet - check for a pending MetaMask notification, or try the network settings fix above.");
      } else if (isConfirmationTimeout(err)) {
        setError("Your transaction was submitted but confirmation is taking longer than expected. Check your wallet's activity tab or the block explorer for status before retrying, to avoid double-investing.");
      } else if (isWalletRpcIssue(err)) {
        setError("Your wallet's network connection to Polygon Amoy appears to be having issues. Try checking your wallet's network settings (see the banner above), or removing and re-adding the Polygon Amoy network in your wallet.");
      } else if (isGenuineRateLimit(err)) {
        setError('The blockchain network is temporarily busy. Please wait a moment and try again.');
      } else if (isNetworkFetchFailure(err)) {
        setError("Couldn't reach the blockchain network. Check your connection and try again.");
      } else if (isInsufficientFunds(err)) {
        setError('Your wallet has insufficient funds to cover the investment and gas fees.');
      } else {
        setError('Something went wrong with the transaction. Please try again.');
      }
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 80, color: '#A0A0A8' }}>Loading pool...</div>;
  if (!pool) return <div style={{ textAlign: 'center', padding: 80, color: '#EF4444' }}>Pool not found</div>;

  const filled = pool.percent_filled || 0;
  const remaining = Number(pool.remaining_size || 0);

  return (
    <>
      <style>{`
        .pd-back { display: inline-flex; align-items: center; gap: 6px; color: #A0A0A8; font-size: 13px; cursor: pointer; margin-bottom: 24px; font-weight: 500; transition: color 0.2s; background: none; border: none; font-family: inherit; }
        .pd-back:hover { color: #fff; }
        .pd-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; flex-wrap: wrap; gap: 16px; }
        .pd-name { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 4px; }
        .pd-sub { font-size: 14px; color: #A0A0A8; }
        .pd-badge { padding: 6px 14px; border-radius: 10px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
        .pd-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }
        .pd-card { background: #151518; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 28px; }
        .pd-card-title { font-size: 16px; font-weight: 700; margin-bottom: 20px; }
        .pd-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        .pd-stat { }
        .pd-stat-label { font-size: 11px; color: #A0A0A8; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 500; margin-bottom: 4px; }
        .pd-stat-val { font-size: 20px; font-weight: 800; }
        .pd-progress { margin: 24px 0; }
        .pd-progress-bar { height: 10px; background: rgba(255,255,255,0.06); border-radius: 5px; overflow: hidden; }
        .pd-progress-fill { height: 100%; border-radius: 5px; transition: width 0.8s ease; }
        .pd-progress-label { display: flex; justify-content: space-between; margin-top: 8px; font-size: 12px; color: #A0A0A8; }
        .pd-invest-btn { width: 100%; padding: 14px; border-radius: 14px; background: linear-gradient(135deg, #7C5CFC, #6B48F5); color: #fff; font-size: 15px; font-weight: 700; border: none; cursor: pointer; font-family: inherit; transition: opacity 0.2s, transform 0.15s; }
        .pd-invest-btn:hover { opacity: 0.92; transform: translateY(-1px); }
        .pd-invest-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .pd-modal-overlay { position: fixed; inset: 0; background: rgba(5,5,8,0.85); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 9999; }
        .pd-modal { background: #18181D; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 32px; width: 440px; max-width: 90vw; box-shadow: 0 24px 64px rgba(0,0,0,0.6); }
        .pd-modal-title { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
        .pd-modal-sub { font-size: 13px; color: #A0A0A8; margin-bottom: 24px; }
        .pd-input { width: 100%; padding: 12px 16px; background: #111116; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: #fff; font-size: 16px; outline: none; font-family: inherit; box-sizing: border-box; }
        .pd-input:focus { border-color: rgba(124,92,252,0.5); }
        .pd-calc-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 13px; }
        .pd-calc-label { color: #A0A0A8; }
        .pd-calc-val { font-weight: 600; }
        .pd-step-center { text-align: center; padding: 40px 0; }
        .pd-spinner { width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.08); border-top: 3px solid #7C5CFC; border-radius: 50%; animation: pd-spin 0.8s linear infinite; margin: 0 auto 16px; }
        @keyframes pd-spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) { .pd-grid { grid-template-columns: 1fr; } }
      `}</style>

      <button className="pd-back" onClick={() => navigate('/investor/pools')}>
        <ArrowLeft size={16} /> Back to Pools
      </button>

      <div className="pd-header">
        <div>
          <div className="pd-name">{pool.name}</div>
          <div className="pd-sub">Pool #{pool.contract_pool_id}</div>
        </div>
        <span className="pd-badge" style={{
          background: pool.is_settled ? 'rgba(34,197,94,0.1)' : filled >= 100 ? 'rgba(124,92,252,0.1)' : 'rgba(59,130,246,0.1)',
          color: pool.is_settled ? '#22C55E' : filled >= 100 ? '#7C5CFC' : '#3B82F6',
        }}>
          {pool.is_settled ? 'Settled' : filled >= 100 ? 'Fully Funded' : 'Open'}
        </span>
      </div>

      <div className="pd-grid">
        {/* Left: Details */}
        <div className="pd-card">
          <div className="pd-card-title">Pool Details</div>
          <div className="pd-stats">
            <div className="pd-stat">
              <div className="pd-stat-label">Annual Yield (APY)</div>
              <div className="pd-stat-val" style={{ color: '#22C55E' }}>{Number(pool.apy).toFixed(2)}%</div>
            </div>
            <div className="pd-stat">
              <div className="pd-stat-label">ROI (Duration)</div>
              <div className="pd-stat-val" style={{ color: '#7C5CFC' }}>{pool.roi}%</div>
            </div>
            <div className="pd-stat">
              <div className="pd-stat-label">Duration</div>
              <div className="pd-stat-val">{pool.duration_days} days</div>
            </div>
            <div className="pd-stat">
              <div className="pd-stat-label">Days Remaining</div>
              <div className="pd-stat-val">{pool.days_remaining}d</div>
            </div>
            <div className="pd-stat">
              <div className="pd-stat-label">Total Size</div>
              <div className="pd-stat-val">{Number(pool.total_size).toFixed(4)} ETH</div>
            </div>
            <div className="pd-stat">
              <div className="pd-stat-label">Investors</div>
              <div className="pd-stat-val">{pool.investor_count || 0}</div>
            </div>
          </div>

          <div className="pd-progress">
            <div className="pd-progress-bar">
              <div className="pd-progress-fill" style={{
                width: `${Math.min(100, filled)}%`,
                background: filled >= 100 ? 'linear-gradient(90deg, #7C5CFC, #22C55E)' : 'linear-gradient(90deg, #7C5CFC, #6B48F5)',
              }} />
            </div>
            <div className="pd-progress-label">
              <span>{filled.toFixed(1)}% funded</span>
              <span>{remaining.toFixed(4)} ETH remaining</span>
            </div>
          </div>
        </div>

        {/* Right: Invest CTA */}
        <div className="pd-card">
          <div className="pd-card-title">Invest in This Pool</div>
          {pool.is_settled ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#A0A0A8' }}>
              <CheckCircle2 size={32} style={{ marginBottom: 12, color: '#22C55E' }} />
              <p style={{ fontSize: 14, fontWeight: 600 }}>This pool has been settled.</p>
              <p style={{ fontSize: 13 }}>Returns have been distributed to investors.</p>
            </div>
          ) : filled >= 100 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#A0A0A8' }}>
              <Shield size={32} style={{ marginBottom: 12, color: '#7C5CFC' }} />
              <p style={{ fontSize: 14, fontWeight: 600 }}>Fully funded</p>
              <p style={{ fontSize: 13 }}>This pool is no longer accepting investments.</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#A0A0A8', marginBottom: 4 }}>Available: {remaining.toFixed(4)} ETH</div>
                <div style={{ fontSize: 12, color: '#A0A0A8' }}>Est. ROI: {pool.roi}% over {pool.duration_days} days</div>
              </div>
              <button className="pd-invest-btn" onClick={() => setShowInvest(true)}
                disabled={!wallet?.isConnected}>
                {wallet?.isConnected ? 'Invest Now' : 'Connect Wallet to Invest'}
              </button>
              {!wallet?.isConnected && (
                <button style={{ width: '100%', marginTop: 10, padding: 12, borderRadius: 12, background: 'rgba(124,92,252,0.1)', border: '1px solid rgba(124,92,252,0.2)', color: '#7C5CFC', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  onClick={wallet?.connectWallet}>
                  Connect Wallet
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Invest Modal */}
      {showInvest && (
        <div className="pd-modal-overlay" onClick={() => { if (step === 'input' || step === 'success' || step === 'error') { setShowInvest(false); setStep('input'); setAmount(''); setCalcData(null); setError(''); } }}>
          <div className="pd-modal" onClick={e => e.stopPropagation()}>
            {step === 'input' && (
              <>
                <div className="pd-modal-title">Invest in {pool.name}</div>
                <div className="pd-modal-sub">{remaining.toFixed(4)} ETH remaining · {pool.roi}% ROI</div>
                <label style={{ display: 'block', fontSize: 12, color: '#A0A0A8', marginBottom: 8, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Amount (ETH)</label>
                <input className="pd-input" type="number" step="0.001" min="0" max={remaining} value={amount}
                  onChange={e => setAmount(e.target.value)} placeholder="0.00" autoFocus />

                {calcLoading && <div style={{ fontSize: 12, color: '#A0A0A8', marginTop: 8 }}>Calculating...</div>}

                {calcData && (
                  <div style={{ margin: '16px 0', padding: '12px 16px', background: 'rgba(124,92,252,0.06)', borderRadius: 12, border: '1px solid rgba(124,92,252,0.1)' }}>
                    <div className="pd-calc-row"><span className="pd-calc-label">Platform Fee (0.5%)</span><span className="pd-calc-val" style={{ color: '#F59E0B' }}>{Number(calcData.transaction_fee).toFixed(6)} ETH</span></div>
                    <div className="pd-calc-row"><span className="pd-calc-label">Net Investment</span><span className="pd-calc-val">{Number(calcData.net_amount).toFixed(6)} ETH</span></div>
                    <div className="pd-calc-row"><span className="pd-calc-label">ROI ({pool.duration_days}d)</span><span className="pd-calc-val" style={{ color: '#7C5CFC' }}>{calcData.roi}%</span></div>
                    <div className="pd-calc-row" style={{ borderBottom: 'none' }}><span className="pd-calc-label">Expected Profit</span><span className="pd-calc-val" style={{ color: '#22C55E' }}>+{Number(calcData.expected_profit).toFixed(6)} ETH</span></div>
                  </div>
                )}

                {error && <div style={{ color: '#EF4444', fontSize: 13, marginTop: 8 }}>{error}</div>}

                <button className="pd-invest-btn" style={{ marginTop: 16 }} onClick={handleInvest}
                  disabled={!amount || Number(amount) <= 0 || Number(amount) > remaining}>
                  Confirm Investment
                </button>
              </>
            )}

            {step === 'pending' && (
              <div className="pd-step-center">
                <div className="pd-spinner" />
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Connecting Wallet</div>
                <div style={{ fontSize: 13, color: '#A0A0A8' }}>Please confirm the transaction in MetaMask...</div>
              </div>
            )}

            {step === 'confirming' && (
              <div className="pd-step-center">
                <div className="pd-spinner" style={{ borderTopColor: '#F59E0B' }} />
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Confirming On-Chain</div>
                <div style={{ fontSize: 13, color: '#A0A0A8' }}>Waiting for block confirmation...</div>
                {txHash && <div style={{ fontSize: 11, color: '#7C5CFC', marginTop: 8, wordBreak: 'break-all' }}>{txHash}</div>}
              </div>
            )}

            {step === 'verifying' && (
              <div className="pd-step-center">
                <div className="pd-spinner" style={{ borderTopColor: '#22C55E' }} />
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Verifying Investment</div>
                <div style={{ fontSize: 13, color: '#A0A0A8' }}>Checking the transaction against the backend ledger...</div>
                {txHash && <div style={{ fontSize: 11, color: '#7C5CFC', marginTop: 8, wordBreak: 'break-all' }}>{txHash}</div>}
              </div>
            )}

            {step === 'success' && (
              <div className="pd-step-center">
                <CheckCircle2 size={48} color="#22C55E" style={{ marginBottom: 16 }} />
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Investment Successful!</div>
                <div style={{ fontSize: 13, color: '#A0A0A8', marginBottom: 16 }}>
                  {amount} ETH invested in {pool.name}
                </div>
                {calcData && <div style={{ fontSize: 14, color: '#22C55E', fontWeight: 600 }}>Expected profit: +{Number(calcData.expected_profit).toFixed(6)} ETH</div>}
                <button className="pd-invest-btn" style={{ marginTop: 24, background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}
                  onClick={() => navigate('/investor/portfolio')}>
                  View Portfolio
                </button>
              </div>
            )}

            {step === 'error' && (
              <div className="pd-step-center">
                <Shield size={48} color="#EF4444" style={{ marginBottom: 16 }} />
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Transaction Failed</div>
                <div style={{ fontSize: 13, color: '#EF4444', marginBottom: 16 }}>{error}</div>
                <button className="pd-invest-btn" onClick={() => { setStep('input'); setError(''); }}>
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
