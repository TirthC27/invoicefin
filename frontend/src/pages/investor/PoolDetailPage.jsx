import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { investorApi } from '../../lib/api';
import { useWallet } from '../../context/useWallet';
import { formatWalletError, investInPool } from '../../lib/contractService';
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
    setError('');
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
        if (err?.status === 401 || err?.status === 403) {
          setError('Your session is not authorized. Please sign in again.');
        } else if (err?.error) {
          setError(err.error);
        }
      }
      setCalcLoading(false);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [amount, pool]);

  const handleInvest = async () => {
    if (!amount || Number(amount) <= 0 || !calcData || !pool?.is_investable) return;
    setStep('pending');
    setError('');
    try {
      const result = await investInPool(wallet.signer, pool.contract_pool_id, amount);
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
      console.error('[Investment] Raw transaction error', err);
      
      if (isUserRejection(err)) {
        setStep('input');
        return;
      } else if (isWalletInteractionTimeout(err)) {
        setStep('error');
        setError("Your wallet isn't responding. Check for a pending MetaMask notification.");
      } else if (isConfirmationTimeout(err)) {
        setStep('error');
        setError("Your transaction was submitted but confirmation is taking longer than expected.");
      } else if (isWalletRpcIssue(err)) {
        setStep('error');
        setError("Your wallet's network connection appears to be having issues.");
      } else if (isGenuineRateLimit(err)) {
        setStep('error');
        setError('The blockchain network is temporarily busy. Please wait a moment and try again.');
      } else if (isNetworkFetchFailure(err)) {
        setStep('error');
        setError("Couldn't reach the blockchain network. Check your connection and try again.");
      } else if (isInsufficientFunds(err)) {
        setStep('error');
        setError('Your wallet has insufficient funds to cover the investment and gas fees.');
      } else {
        setStep('error');
        setError(formatWalletError(err));
      }
    }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 80, color: 'var(--fg-muted)' }}>
      <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--color-accent-strong)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      Loading pool...
    </div>
  );
  if (!pool) return <div style={{ textAlign: 'center', padding: 80, color: 'var(--color-negative)' }}>Pool not found</div>;

  const filled = pool.percent_filled || 0;
  const remaining = Number(pool.remaining_size || 0);
  const isInvestable = Boolean(pool.is_investable) && !pool.is_settled && pool.status === 'open' && remaining > 0;

  return (
    <>
      <style>{`
        @keyframes pd-spin { to { transform: rotate(360deg); } }
        .pd-spinner { width: 40px; height: 40px; border: 3px solid var(--border); border-top-color: var(--color-accent-strong); border-radius: 50%; animation: pd-spin 0.8s linear infinite; margin: 0 auto 16px; }
        @media (max-width: 900px) { .pd-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)', fontSize: 13, cursor: 'pointer', marginBottom: 24, fontWeight: 500, background: 'none', border: 'none', fontFamily: 'inherit', transition: 'color 0.2s' }}
        onClick={() => navigate('/investor/pools')}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--fg-primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--fg-muted)'}>
        <ArrowLeft size={16} /> Back to Pools
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>{pool.name}</div>
          <div style={{ fontSize: 14, color: 'var(--fg-muted)' }}>Pool #{pool.contract_pool_id}</div>
        </div>
        <span style={{
          padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, textTransform: 'uppercase',
          background: pool.is_settled ? 'rgba(34,197,94,0.1)' : filled >= 100 ? 'rgba(124,92,252,0.1)' : 'rgba(59,130,246,0.1)',
          color: pool.is_settled ? '#16a34a' : filled >= 100 ? '#7C5CFC' : '#2563eb',
        }}>
          {pool.is_settled ? 'Settled' : filled >= 100 ? 'Fully Funded' : 'Open'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }} className="pd-grid">
        {/* Left: Details */}
        <div className="data-card" style={{ padding: 28 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Pool Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 20 }}>
            {[
              { label: 'Annual Yield (APY)', value: `${Number(pool.apy).toFixed(2)}%`, color: 'var(--color-positive)' },
              { label: 'ROI (Duration)',     value: `${pool.roi}%`, color: '#7C5CFC' },
              { label: 'Duration',           value: `${pool.duration_days} days` },
              { label: 'Days Remaining',     value: `${pool.days_remaining}d` },
              { label: 'Total Size',         value: `${Number(pool.total_size).toFixed(4)} MATIC` },
              { label: 'Investors',          value: pool.investor_count || 0 },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color || 'var(--fg-primary)' }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ margin: '24px 0' }}>
            <div style={{ height: 10, background: 'var(--bg-muted)', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 5, transition: 'width 0.8s ease',
                width: `${Math.min(100, filled)}%`,
                background: filled >= 100 ? 'linear-gradient(90deg, var(--color-accent-strong), #22c55e)' : 'var(--color-accent-strong)',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--fg-muted)' }}>
              <span>{filled.toFixed(1)}% funded</span>
              <span>{remaining.toFixed(4)} MATIC remaining</span>
            </div>
          </div>
        </div>

        {/* Right: Invest CTA */}
        <div className="data-card" style={{ padding: 28 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Invest in This Pool</div>
          {!isInvestable && pool.is_settled ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--fg-muted)' }}>
              <CheckCircle2 size={32} style={{ marginBottom: 12, color: 'var(--color-positive)' }} />
              <p style={{ fontSize: 14, fontWeight: 600 }}>This pool has been settled.</p>
              <p style={{ fontSize: 13 }}>Returns have been distributed to investors.</p>
            </div>
          ) : !isInvestable ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--fg-muted)' }}>
              <Shield size={32} style={{ marginBottom: 12, color: 'var(--color-accent-strong)' }} />
              <p style={{ fontSize: 14, fontWeight: 600 }}>{filled >= 100 ? 'Fully funded' : 'Not accepting investments'}</p>
              <p style={{ fontSize: 13 }}>This pool is no longer accepting investments.</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 4 }}>Available: {remaining.toFixed(4)} MATIC</div>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Est. ROI: {pool.roi}% over {pool.duration_days} days</div>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14, fontSize: 15, fontWeight: 700, borderRadius: 14 }}
                onClick={() => setShowInvest(true)} disabled={!wallet?.isConnected || !isInvestable}>
                {wallet?.isConnected ? 'Invest Now' : 'Connect Wallet to Invest'}
              </button>
              {!wallet?.isConnected && (
                <button style={{ width: '100%', marginTop: 10, padding: 12, borderRadius: 12, background: 'rgba(124,92,252,0.08)', border: '1px solid rgba(124,92,252,0.2)', color: 'var(--color-accent-fg)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  onClick={wallet?.connectWallet}>
                  Connect Wallet
                </button>
              )}
              {wallet?.walletError && <div style={{ color: 'var(--color-negative)', fontSize: 12, marginTop: 10 }}>{wallet.walletError}</div>}
            </>
          )}
        </div>
      </div>

      {/* Invest Modal */}
      {showInvest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={() => { if (step === 'input' || step === 'success' || step === 'error') { setShowInvest(false); setStep('input'); setAmount(''); setCalcData(null); setError(''); } }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 32, width: 440, maxWidth: '90vw', boxShadow: 'var(--shadow-lg)' }}
            onClick={e => e.stopPropagation()}>

            {step === 'input' && (
              <>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Invest in {pool.name}</div>
                <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 24 }}>{remaining.toFixed(4)} MATIC remaining · {pool.roi}% ROI</div>
                <label className="form-label">Amount (MATIC)</label>
                <input className="form-input" type="number" step="0.001" min="0" max={remaining} value={amount}
                  onChange={e => setAmount(e.target.value)} placeholder="0.00" autoFocus />

                {calcLoading && <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 8 }}>Calculating...</div>}

                {calcData && (
                  <div style={{ margin: '16px 0', padding: '12px 16px', background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    {[
                      { label: 'Platform Fee (0.5%)', value: `${Number(calcData.transaction_fee).toFixed(6)} MATIC`, color: '#d97706' },
                      { label: 'Net Investment',       value: `${Number(calcData.net_amount).toFixed(6)} MATIC` },
                      { label: `ROI (${pool.duration_days}d)`, value: `${calcData.roi}%`, color: 'var(--color-accent-strong)' },
                      { label: 'Expected Profit',     value: `+${Number(calcData.expected_profit).toFixed(6)} MATIC`, color: 'var(--color-positive)', last: true },
                    ].map(r => (
                      <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: r.last ? 'none' : '1px solid var(--border)', fontSize: 13 }}>
                        <span style={{ color: 'var(--fg-muted)' }}>{r.label}</span>
                        <span style={{ fontWeight: 600, color: r.color || 'var(--fg-primary)' }}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {error && <div style={{ color: 'var(--color-negative)', fontSize: 13, marginTop: 8 }}>{error}</div>}

                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 16, padding: 14, fontSize: 15, fontWeight: 700, borderRadius: 14 }}
                  onClick={handleInvest}
                  disabled={!amount || Number(amount) <= 0 || Number(amount) > remaining || calcLoading || !calcData || !isInvestable}>
                  Confirm Investment
                </button>
              </>
            )}

            {step === 'pending' && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div className="pd-spinner" />
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Connecting Wallet</div>
                <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Please confirm the transaction in MetaMask...</div>
              </div>
            )}

            {step === 'confirming' && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div className="pd-spinner" style={{ borderTopColor: '#d97706' }} />
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Confirming On-Chain</div>
                <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Waiting for block confirmation...</div>
                {txHash && <div style={{ fontSize: 11, color: 'var(--color-accent-strong)', marginTop: 8, wordBreak: 'break-all' }}>{txHash}</div>}
              </div>
            )}

            {step === 'verifying' && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div className="pd-spinner" style={{ borderTopColor: 'var(--color-positive)' }} />
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Verifying Investment</div>
                <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Checking the transaction against the backend ledger...</div>
                {txHash && <div style={{ fontSize: 11, color: 'var(--color-accent-strong)', marginTop: 8, wordBreak: 'break-all' }}>{txHash}</div>}
              </div>
            )}

            {step === 'success' && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <CheckCircle2 size={48} color="var(--color-positive)" style={{ marginBottom: 16 }} />
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Investment Successful!</div>
                <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 16 }}>
                  {amount} MATIC invested in {pool.name}
                </div>
                {calcData && <div style={{ fontSize: 14, color: 'var(--color-positive)', fontWeight: 600 }}>Expected profit: +{Number(calcData.expected_profit).toFixed(6)} MATIC</div>}
                <button className="btn btn-primary" style={{ marginTop: 24, width: '100%', justifyContent: 'center', background: 'rgba(34,197,94,0.15)', color: 'var(--color-positive)', borderColor: 'rgba(34,197,94,0.3)' }}
                  onClick={() => navigate('/investor/portfolio')}>
                  View Portfolio
                </button>
              </div>
            )}

            {step === 'error' && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Shield size={48} color="var(--color-negative)" style={{ marginBottom: 16 }} />
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Transaction Failed</div>
                <div style={{ fontSize: 13, color: 'var(--color-negative)', marginBottom: 16 }}>{error}</div>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => { setStep('input'); setError(''); }}>
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
