/**
 * InvoiceVerificationModal — Module 3
 * Non-dismissible animated modal that simulates AI + blockchain verification.
 * Duration: random 3–5 seconds. Auto-redirects to /exporter/invoices/:id on completion.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Cpu, ShieldCheck, Loader2 } from 'lucide-react';

const STEPS = [
  'Reading Invoice...',
  'Checking Buyer...',
  'Validating Amount...',
  'Generating Blockchain Hash...',
  'Invoice Verified Successfully',
];

export default function InvoiceVerificationModal({ isOpen, invoiceData, blockchainHash }) {
  const [progress, setProgress]   = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone]           = useState(false);
  const navigate = useNavigate();
  const started  = useRef(false);

  useEffect(() => {
    if (!isOpen || started.current) return;
    started.current = true;

    // Random duration 3000–5000 ms (Module 3 spec)
    const duration   = Math.floor(Math.random() * 2001) + 3000;
    const TICK       = 50;
    const totalTicks = duration / TICK;
    let elapsed      = 0;

    const id = setInterval(() => {
      elapsed++;
      const pct = Math.min(100, (elapsed / totalTicks) * 100);
      setProgress(pct);
      if      (pct < 25) setStepIndex(0);
      else if (pct < 50) setStepIndex(1);
      else if (pct < 75) setStepIndex(2);
      else if (pct < 99) setStepIndex(3);
      else               setStepIndex(4);

      if (elapsed >= totalTicks) {
        clearInterval(id);
        setProgress(100);
        setStepIndex(4);
        setDone(true);
        // ~800ms pause on success message, then redirect
        setTimeout(() => {
          const dest = invoiceData?.id ?? invoiceData?.invoice_number ?? 'unknown';
          navigate(`/exporter/invoices/${dest}`, {
            state: { invoice: invoiceData, blockchainHash },
          });
        }, 850);
      }
    }, TICK);

    return () => clearInterval(id);
  }, [isOpen, invoiceData, blockchainHash, navigate]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(14px)',
      padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 460,
        background: '#ffffff',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        borderRadius: 24, padding: '36px 32px',
        boxShadow: '0 30px 60px rgba(0,0,0,.15)',
        textAlign: 'center', color: '#111111', position: 'relative', overflow: 'hidden',
      }}>
        {/* Glow blob */}
        <div style={{
          position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
          width: 220, height: 220, borderRadius: '50%',
          background: done ? 'rgba(0,0,0,.04)' : 'rgba(0,0,0,.04)',
          filter: 'blur(55px)', pointerEvents: 'none', transition: 'background .5s',
        }} />

        {/* Icon */}
        <div style={{
          width: 72, height: 72, borderRadius: 20, margin: '0 auto 22px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,.04)',
          border: '1px solid rgba(0,0,0,.08)',
          transition: 'all .4s ease',
        }}>
          {done
            ? <CheckCircle2 size={36} color="#111111" />
            : <Cpu size={36} color="#111111" style={{ animation: 'vcSpin 3s linear infinite' }} />
          }
        </div>

        <h3 style={{ fontSize: 21, fontWeight: 700, marginBottom: 6, letterSpacing: '-.3px', color: '#111111' }}>
          {done ? 'Verification Complete!' : 'Analyzing Invoice...'}
        </h3>
        <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)', marginBottom: 26, lineHeight: 1.5 }}>
          Server-side field validation &amp; reference hash generation in progress.
        </p>

        {/* Progress bar */}
        <div style={{ marginBottom: 22, textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13, fontWeight: 600 }}>
            <span style={{ color: '#111111', display: 'flex', alignItems: 'center', gap: 6, transition: 'color .3s' }}>
              {!done && <Loader2 size={14} style={{ animation: 'vcSpin 1s linear infinite' }} />}
              {STEPS[stepIndex]}
            </span>
            <span style={{ color: 'rgba(0,0,0,0.55)' }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ width: '100%', height: 10, borderRadius: 99, background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', padding: 2, boxSizing: 'border-box' }}>
            <div style={{
              height: '100%', width: `${progress}%`, borderRadius: 99,
              background: '#111111',
              transition: 'width .06s linear, background .4s ease',
              boxShadow: '0 0 10px rgba(0,0,0,.15)',
            }} />
          </div>
        </div>

        {/* Blockchain hash */}
        {blockchainHash && (
          <div style={{ background: 'rgba(0,0,0,.03)', border: '1px solid rgba(0,0,0,.08)', borderRadius: 12, padding: '12px 14px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: 'rgba(0,0,0,0.55)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>
              <ShieldCheck size={13} color="#111111" /> Invoice Reference Hash
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 11.5, color: '#111111', wordBreak: 'break-all', lineHeight: 1.5, opacity: progress > 60 ? 1 : 0.3, transition: 'opacity .4s' }}>
              {blockchainHash}
            </div>
          </div>
        )}

        <style>{`@keyframes vcSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}
