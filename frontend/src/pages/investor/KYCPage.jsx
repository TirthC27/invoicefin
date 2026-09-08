import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { supabase } from '../../lib/supabaseClient';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const STEPS = [
  {
    title: 'Personal Information',
    desc: 'Verify your identity details',
    icon: '👤',
    fields: ['Full legal name', 'Date of birth', 'Nationality'],
  },
  {
    title: 'Business Details',
    desc: 'Tell us about your export business',
    icon: '🏢',
    fields: ['Company name', 'Business registration number', 'Country of incorporation'],
  },
  {
    title: 'Document Upload',
    desc: 'Upload verification documents',
    icon: '📋',
    fields: ['Government-issued ID', 'Business registration certificate', 'Proof of address'],
  },
];

function StepIndicator({ current, total }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
      {Array.from({ length: total }).map((_, i) => (
        <React.Fragment key={i}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: i < current ? '#7C5CFC' : i === current ? 'rgba(124,92,252,0.2)' : 'rgba(255,255,255,0.06)',
            border: i === current ? '2px solid #7C5CFC' : '2px solid transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700,
            color: i < current ? '#fff' : i === current ? '#7C5CFC' : '#A0A0A8',
            transition: 'all 0.3s',
          }}>
            {i < current ? '✓' : i + 1}
          </div>
          {i < total - 1 && (
            <div style={{
              flex: 1, height: 2,
              background: i < current ? '#7C5CFC' : 'rgba(255,255,255,0.08)',
              transition: 'background 0.3s',
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function PendingBanner({ secondsRemaining, onApproved }) {
  const [secs, setSecs] = useState(secondsRemaining);

  useEffect(() => {
    const iv = setInterval(() => {
      setSecs(s => {
        if (s <= 1) { clearInterval(iv); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  // Poll for approval
  useEffect(() => {
    const pollId = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const resp = await fetch(`${API_BASE}/kyc/status/`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.can_export || data.status === 'APPROVED') {
            clearInterval(pollId);
            onApproved();
          }
        }
      } catch (e) { /* silent */ }
    }, 5000);
    return () => clearInterval(pollId);
  }, [onApproved]);

  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  const timeStr = secs > 0 ? `${mins}:${String(s).padStart(2, '0')}` : 'any moment…';

  return (
    <div style={{
      background: 'rgba(124,92,252,0.06)', border: '1px solid rgba(124,92,252,0.25)',
      borderRadius: 16, padding: '28px 32px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
      <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
        KYC Review in Progress
      </h3>
      <p style={{ color: '#A0A0A8', fontSize: 14, marginBottom: 20 }}>
        Your application is being processed. Auto-approval in approximately:
      </p>
      <div style={{
        fontSize: 42, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
        color: '#7C5CFC', letterSpacing: '-1px', marginBottom: 20,
        fontFamily: 'monospace',
      }}>
        {timeStr}
      </div>
      <div style={{
        display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap',
        fontSize: 12, color: '#A0A0A8',
      }}>
        {['Identity Verified', 'Business Checked', 'Documents Scanned'].map(s => (
          <span key={s} style={{
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
            color: '#22C55E', padding: '4px 12px', borderRadius: 20, fontSize: 11,
          }}>✓ {s}</span>
        ))}
      </div>
    </div>
  );
}

export default function KYCPage() {
  const { user, session, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [kycStatus, setKycStatus] = useState(null); // null | {status, seconds_remaining, can_export}
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Redirect if already has exporter access
  useEffect(() => {
    if (user?.can_export || user?.role === 'EXPORTER') {
      navigate('/investor/exporter/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Check existing KYC status
  useEffect(() => {
    const check = async () => {
      if (!session?.access_token) return;
      try {
        const resp = await fetch(`${API_BASE}/kyc/status/`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (resp.ok) {
          const data = await resp.json();
          setKycStatus(data);
        }
      } catch (e) { /* silent */ }
      setLoading(false);
    };
    check();
  }, [session]);

  const handleSkip = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const resp = await fetch(`${API_BASE}/kyc/submit/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ full_name: user?.full_name || '' }),
      });
      const data = await resp.json();
      if (resp.ok || resp.status === 201) {
        setKycStatus(data);
      } else {
        setError(data.error || 'Submission failed.');
      }
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproved = async () => {
    // Re-fetch user profile from backend so can_export=true propagates
    // into React Context — no hard reload needed.
    await refreshUser();
    navigate('/investor/exporter/dashboard', { replace: true });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(124,92,252,0.2)', borderTopColor: '#7C5CFC', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const isPending = kycStatus?.status === 'PENDING';
  const isApproved = kycStatus?.status === 'APPROVED' || kycStatus?.can_export;

  return (
    <>
      <style>{`
        @keyframes kyc-slide-in {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .kyc-card { animation: kyc-slide-in 0.4s ease-out both; }
        .kyc-skip-btn { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: #A0A0A8; padding: 10px 24px; border-radius: 10px; font-size: 14px; cursor: pointer; transition: all 0.2s; font-family: inherit; }
        .kyc-skip-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .kyc-next-btn { background: linear-gradient(135deg, #7C5CFC, #6B48F5); border: none; color: #fff; padding: 10px 28px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: inherit; }
        .kyc-next-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(124,92,252,0.3); }
        .kyc-next-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .kyc-field-row { display: flex; align-items: center; gap: 12; padding: 12px 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; margin-bottom: 8px; color: #A0A0A8; font-size: 14px; }
        .kyc-field-check { width: 20px; height: 20px; border-radius: 50%; background: rgba(124,92,252,0.15); border: 1px solid rgba(124,92,252,0.3); display: flex; align-items: center; justify-content: center; font-size: 10px; color: #7C5CFC; flex-shrink: 0; margin-right: 12px; }
      `}</style>

      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', marginBottom: 6 }}>
            Become an Exporter
          </h1>
          <p style={{ color: '#A0A0A8', fontSize: 14 }}>
            Complete KYC verification to unlock invoice upload and pool creation capabilities — all on the same account.
          </p>
        </div>

        {/* Badge showing what they gain */}
        <div style={{
          display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap',
        }}>
          {['Upload Invoices', 'Create Investment Pools', 'Manage Repayments'].map(f => (
            <div key={f} style={{
              background: 'rgba(124,92,252,0.08)', border: '1px solid rgba(124,92,252,0.2)',
              borderRadius: 8, padding: '6px 14px', fontSize: 12, color: '#A0A0A8',
            }}>
              <span style={{ color: '#7C5CFC', marginRight: 6 }}>→</span>{f}
            </div>
          ))}
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            color: '#EF4444', padding: '10px 16px', borderRadius: 10, fontSize: 13, marginBottom: 20,
          }}>{error}</div>
        )}

        {/* Pending state */}
        {isPending && !isApproved ? (
          <div className="kyc-card">
            <PendingBanner
              secondsRemaining={kycStatus.seconds_remaining ?? 120}
              onApproved={handleApproved}
            />
          </div>
        ) : isApproved ? (
          <div className="kyc-card" style={{
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
            borderRadius: 16, padding: 32, textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <h3 style={{ color: '#22C55E', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>KYC Approved!</h3>
            <p style={{ color: 'var(--fg-muted)', marginBottom: 20 }}>You now have Exporter capabilities. Start uploading invoices.</p>
            <button className="kyc-next-btn" onClick={() => navigate('/investor/exporter/upload')}>
              Upload First Invoice →
            </button>
          </div>
        ) : (
          /* Step wizard */
          <div className="kyc-card" style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 20, padding: 32,
          }}>
            <StepIndicator current={step} total={STEPS.length} />

            <div style={{ fontSize: 36, marginBottom: 12 }}>{STEPS[step].icon}</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg-primary)', marginBottom: 6 }}>
              {STEPS[step].title}
            </h2>
            <p style={{ color: 'var(--fg-muted)', fontSize: 13, marginBottom: 24 }}>
              {STEPS[step].desc}
            </p>

            {STEPS[step].fields.map(f => (
              <div key={f} className="kyc-field-row">
                <div className="kyc-field-check">✓</div>
                {f}
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-accent-strong)' }}>Demo: pre-filled</span>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28 }}>
              <button className="kyc-skip-btn" onClick={handleSkip}>
                Skip this step →
              </button>

              {step < STEPS.length - 1 ? (
                <button className="kyc-next-btn" onClick={() => setStep(s => s + 1)}>
                  Next
                </button>
              ) : (
                <button className="kyc-next-btn" disabled={submitting} onClick={handleSubmit}>
                  {submitting ? 'Submitting…' : 'Submit KYC Application'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
