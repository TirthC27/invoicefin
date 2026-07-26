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
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const started = useRef(false);

  useEffect(() => {
    if (!isOpen || started.current) return;
    started.current = true;

    // Random total duration 3000–5000 ms
    const duration = Math.floor(Math.random() * 2001) + 3000;
    const TICK = 50;
    const totalTicks = duration / TICK;
    let elapsed = 0;

    const id = setInterval(() => {
      elapsed++;
      const pct = Math.min(100, (elapsed / totalTicks) * 100);
      setProgress(pct);
      if (pct < 25) setStepIndex(0);
      else if (pct < 50) setStepIndex(1);
      else if (pct < 75) setStepIndex(2);
      else if (pct < 99) setStepIndex(3);
      else setStepIndex(4);

      if (elapsed >= totalTicks) {
        clearInterval(id);
        setProgress(100);
        setStepIndex(4);
        setDone(true);
        setTimeout(() => {
          const dest = invoiceData?.id || invoiceData?.invoiceNumber || 'unknown';
          navigate(`/exporter/invoice/${dest}`, { state: { invoice: invoiceData, blockchainHash } });
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
      backgroundColor: 'rgba(11,11,15,.88)', backdropFilter: 'blur(14px)',
      padding: '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: 460,
        background: '#151518',
        border: '1px solid rgba(255,255,255,.1)',
        borderRadius: 24, padding: '36px 32px',
        boxShadow: '0 30px 60px rgba(0,0,0,.55),0 0 40px rgba(124,92,252,.12)',
        textAlign: 'center', color: '#fff', position: 'relative', overflow: 'hidden',
      }}>
        {/* Glow blob */}
        <div style={{
          position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
          width: 220, height: 220, borderRadius: '50%',
          background: done ? 'rgba(34,197,94,.18)' : 'rgba(124,92,252,.18)',
          filter: 'blur(55px)', pointerEvents: 'none', transition: 'background .5s',
        }} />

        {/* Icon */}
        <div style={{
          width: 72, height: 72, borderRadius: 20, margin: '0 auto 22px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: done ? 'rgba(34,197,94,.12)' : 'rgba(124,92,252,.12)',
          border: done ? '1px solid rgba(34,197,94,.3)' : '1px solid rgba(124,92,252,.3)',
          transition: 'all .4s ease',
        }}>
          {done
            ? <CheckCircle2 size={36} color="#22C55E" />
            : <Cpu size={36} color="#7C5CFC" style={{ animation: 'vcSpin 3s linear infinite' }} />
          }
        </div>

        {/* Title */}
        <h3 style={{ fontSize: 21, fontWeight: 700, marginBottom: 6, letterSpacing: '-.3px' }}>
          {done ? 'Verification Complete!' : 'Analyzing Invoice...'}
        </h3>
        <p style={{ fontSize: 13, color: '#A0A0A8', marginBottom: 26, lineHeight: 1.5 }}>
          AI fraud detection &amp; Polygon Amoy smart contract verification in progress.
        </p>

        {/* Progress bar */}
        <div style={{ marginBottom: 22, textAlign: 'left' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 8, fontSize: 13, fontWeight: 600,
          }}>
            <span style={{
              color: done ? '#22C55E' : '#9E80FF',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'color .3s',
            }}>
              {!done && <Loader2 size={14} style={{ animation: 'vcSpin 1s linear infinite' }} />}
              {STEPS[stepIndex]}
            </span>
            <span style={{ color: '#A0A0A8' }}>{Math.round(progress)}%</span>
          </div>

          <div style={{
            width: '100%', height: 10, borderRadius: 99,
            background: 'rgba(255,255,255,.06)',
            border: '1px solid rgba(255,255,255,.08)', padding: 2, boxSizing: 'border-box',
          }}>
            <div style={{
              height: '100%', width: `${progress}%`, borderRadius: 99,
              background: done
                ? 'linear-gradient(90deg,#22C55E,#16A34A)'
                : 'linear-gradient(90deg,#7C5CFC,#A78BFA)',
              transition: 'width .06s linear, background .4s ease',
              boxShadow: done ? '0 0 10px rgba(34,197,94,.5)' : '0 0 10px rgba(124,92,252,.5)',
            }} />
          </div>
        </div>

        {/* Hash */}
        {blockchainHash && (
          <div style={{
            background: 'rgba(255,255,255,.03)',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 12, padding: '12px 14px', textAlign: 'left',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 11, fontWeight: 600, color: '#A0A0A8',
              textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5,
            }}>
              <ShieldCheck size={13} color="#22C55E" /> Blockchain Hash (simulated)
            </div>
            <div style={{
              fontFamily: 'monospace', fontSize: 11.5, color: '#E0E0E8',
              wordBreak: 'break-all', lineHeight: 1.5,
              opacity: progress > 60 ? 1 : 0.3, transition: 'opacity .4s',
            }}>
              {blockchainHash}
            </div>
          </div>
        )}

        <style>{`@keyframes vcSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}
