import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../src/lib/supabaseClient';

/* ── HELPERS & THEME ── */
const T = {
  bg: '#0B0B0F',
  bgCard: '#151518',
  border: 'rgba(255,255,255,0.08)',
  borderLight: 'rgba(255,255,255,0.12)',
  accent: '#7C5CFC',
  accentDark: '#6B48F5',
  text: '#FFFFFF',
  textMuted: '#A1A1AA',
  textDim: '#71717A',
  white: '#FFFFFF',
  inputBg: 'rgba(255,255,255,0.03)',
};

/* ── SVG ICONS ── */
const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const IconEmail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);
const IconLock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const IconEyeOpen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const IconEyeClosed = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </svg>
);

/* ── BLOCKCHAIN BG ANIMATION ── */
function BlockchainBg() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const nodes = Array.from({ length: 18 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.16,
      vy: (Math.random() - 0.5) * 0.16,
      r: Math.random() * 2 + 1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      });
      nodes.forEach((a, i) => {
        nodes.slice(i + 1).forEach(b => {
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 180) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(124,92,252,${0.05 * (1 - dist / 180)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
      nodes.forEach(n => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(124,92,252,0.08)';
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}
    />
  );
}

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [showPassword, setShowPassword] = useState(false);

  const resetMessages = () => { setError(null); setSuccessMsg(null); };

  /* ── Original Auth Handlers (UNCHANGED logic) ── */
  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true); resetMessages();
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) throw loginError;
      if (data?.session) navigate('/dashboard');
    } catch (err) { setError(err.message || 'Login failed.'); } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setLoading(true); resetMessages();
    try {
      const { data, error: signupError } = await supabase.auth.signUp({ email, password });
      if (signupError) throw signupError;
      if (data?.user) {
        await supabase.from('profiles').upsert({ id: data.user.id, email: data.user.email, full_name: fullName, role: 'investor' }, { onConflict: 'id' }).then(() => { });
        if (data?.session) { navigate('/dashboard'); }
        else { setSuccessMsg('Account created! Check your email to confirm, then log in.'); setIsLogin(true); }
      }
    } catch (err) { setError(err.message || 'Registration failed.'); } finally { setLoading(false); }
  };

  const inputWrapStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    marginBottom: 14,
  };

  const inputStyle = {
    width: '100%',
    height: '46px',
    padding: '0 40px',
    borderRadius: 10,
    border: `1px solid rgba(255,255,255,0.1)`,
    background: T.inputBg,
    color: T.white,
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: T.bg, fontFamily: "'Inter', system-ui, sans-serif", color: T.text, boxSizing: 'border-box' }}>

      {/* Scope visual focus colors */}
      <style>{`
        .auth-input:focus { border-color: ${T.accent} !important; box-shadow: 0 0 0 3px rgba(124,92,252,0.12) !important; }
        .auth-btn-p:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(124,92,252,0.3); background: linear-gradient(135deg, #8E73FF 0%, #7C5CFC 100%) !important; }
        .auth-btn-p:active:not(:disabled) { transform: translateY(0); }
        
        @media (max-width: 768px) {
          .auth-split-left { display: none !important; }
          .auth-split-right { width: 100% !important; max-width: 100% !important; padding: 24px !important; }
        }
      `}</style>

      {/* ── Left: Branding ── */}
      <div className="auth-split-left" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, position: 'relative', overflow: 'hidden', borderRight: `1px solid ${T.border}` }}>
        <BlockchainBg />
        {/* Glow */}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(124,92,252,0.06) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 1 }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(124,92,252,0.04) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 1 }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 460, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 16px rgba(124,92,252,0.25)` }}>
              <svg width="18" height="18" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
            </div>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: T.white, letterSpacing: '-0.4px' }}>Invoicefi</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 3.8vw, 2.8rem)', fontWeight: 800, color: T.white, lineHeight: 1.15, letterSpacing: '-1.5px', marginBottom: 18 }}>
            Access global <span style={{ color: T.accent }}>liquidity</span> instantly
          </h1>
          <p style={{ fontSize: '0.9rem', color: T.textMuted, lineHeight: 1.6, marginBottom: 28 }}>
            Bridge the divide between real-world trade finance and decentralized liquid markets. The most secure protocol for on-chain invoice financing.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[{ label: 'DeFi Native', icon: '🛡️' }, { label: 'EVM Compliant', icon: '⚡' }, { label: 'Instant Flow', icon: '💸' }].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999, border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.02)', fontSize: '0.76rem', fontWeight: 600, color: T.textMuted }}>
                <span>{item.icon}</span> {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: Auth Form Card ── */}
      <div className="auth-split-right" style={{ width: '45%', maxWidth: 540, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, background: '#0E0E12' }}>
        <div style={{ width: '100%', maxWidth: 410, background: T.bgCard, borderRadius: 20, padding: '32px 28px', border: `1px solid ${T.border}`, boxShadow: '0 20px 48px rgba(0,0,0,0.5)' }}>

          {/* Toggle */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', border: `1px solid ${T.border}`, borderRadius: 12, padding: 3, marginBottom: 24 }}>
            <button onClick={() => { setIsLogin(true); resetMessages(); }} style={{ flex: 1, padding: '8px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, background: isLogin ? T.accent : 'transparent', color: isLogin ? '#FFFFFF' : T.textDim, transition: 'all 0.2s' }}>Login</button>
            <button onClick={() => { setIsLogin(false); resetMessages(); }} style={{ flex: 1, padding: '8px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, background: !isLogin ? T.accent : 'transparent', color: !isLogin ? '#FFFFFF' : T.textDim, transition: 'all 0.2s' }}>Register</button>
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: T.white, marginBottom: 4, textAlign: 'center', letterSpacing: '-0.3px' }}>
            {isLogin ? 'Welcome back' : 'Create an account'}
          </h2>
          <p style={{ fontSize: '0.8rem', color: T.textMuted, marginBottom: 20, textAlign: 'center' }}>
            {isLogin ? 'Enter your details to access your dashboard' : 'Start your on-chain invoice financing journey'}
          </p>

          {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: '0.8rem' }}>{error}</div>}
          {successMsg && <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22C55E', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: '0.8rem' }}>{successMsg}</div>}

          {/* Form */}
          <form onSubmit={isLogin ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column' }}>

            {!isLogin && (
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Full Name</label>
                <div style={inputWrapStyle}>
                  <span style={{ position: 'absolute', left: 14, color: T.textDim, display: 'flex', alignItems: 'center' }}><IconUser /></span>
                  <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe" className="auth-input" style={inputStyle} />
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Email Address</label>
              <div style={inputWrapStyle}>
                <span style={{ position: 'absolute', left: 14, color: T.textDim, display: 'flex', alignItems: 'center' }}><IconEmail /></span>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" className="auth-input" style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Password</label>
              <div style={inputWrapStyle}>
                <span style={{ position: 'absolute', left: 14, color: T.textDim, display: 'flex', alignItems: 'center' }}><IconLock /></span>
                <input type={showPassword ? 'text' : 'password'} required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder={isLogin ? 'Enter your password' : 'Min 6 characters'} className="auth-input" style={inputStyle} />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: 12, background: 'none', border: 'none', cursor: 'pointer', color: T.textDim, display: 'flex', alignItems: 'center', padding: 4 }}
                >
                  {showPassword ? <IconEyeClosed /> : <IconEyeOpen />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="auth-btn-p" style={{ marginTop: 8, width: '100%', height: '46px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, color: T.white, fontWeight: 700, fontSize: '0.9rem', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: `0 4px 16px rgba(124,92,252,0.25)`, opacity: loading ? 0.75 : 1, transition: 'all 0.2s', fontFamily: 'inherit' }}>
              {loading ? (isLogin ? 'Signing in...' : 'Creating account...') : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <p style={{ marginTop: 24, textAlign: 'center', fontSize: '0.72rem', color: T.textDim, lineHeight: 1.4 }}>
            By continuing, you agree to Invoicefi's Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
