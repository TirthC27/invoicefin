import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../src/lib/supabaseClient';

const T = {
  bg: '#0c1421',
  bgCard: '#1b2336',
  border: 'rgba(255,255,255,0.07)',
  borderLight: 'rgba(255,255,255,0.1)',
  accent: '#c7f284',
  accentDark: '#9fc95e',
  text: '#e2e8f0',
  textMuted: '#64748b',
  textDim: '#475569',
  white: '#f8fafc',
  inputBg: '#131a2a',
};

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const resetMessages = () => { setError(null); setSuccessMsg(null); };

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

  const inputStyle = {
    width: '100%', padding: '14px 16px', borderRadius: 12,
    border: `1px solid ${T.borderLight}`, background: T.inputBg,
    color: T.white, fontSize: '0.95rem', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: T.bg, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Left: Branding ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, position: 'relative', overflow: 'hidden' }}>
        {/* Glow */}
        <div style={{ position: 'absolute', top: '-20%', left: '-20%', width: '60%', height: '60%', background: 'radial-gradient(circle, rgba(199,242,132,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 480, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 20px rgba(199,242,132,0.2)` }}>
              <svg width="22" height="22" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
            </div>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: T.white, letterSpacing: '-0.5px' }}>InvoiceFi</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: T.white, lineHeight: 1.1, letterSpacing: '-0.04em', marginBottom: 20 }}>
            Access global <span style={{ color: T.accent, fontStyle: 'italic' }}>liquidity</span> instantly
          </h1>
          <p style={{ fontSize: 16, color: T.textMuted, lineHeight: 1.7, marginBottom: 32 }}>
            Bridge the divide between real-world trade finance and decentralized liquid markets. The most secure protocol for on-chain invoice financing.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[{ label: 'DeFi Native', icon: '🛡️' }, { label: '99.9% Up-time', icon: '⚡' }, { label: 'Instant Flow', icon: '💸' }].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999, border: `1px solid ${T.borderLight}`, background: 'rgba(255,255,255,0.03)', fontSize: '0.78rem', fontWeight: 600, color: T.textMuted }}>
                <span>{item.icon}</span> {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: Auth Form ── */}
      <div style={{ width: '50%', maxWidth: 560, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ width: '100%', maxWidth: 420, background: T.bgCard, borderRadius: 24, padding: '36px 32px', border: `1px solid ${T.border}`, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>

          {/* Toggle */}
          <div style={{ display: 'flex', background: T.inputBg, borderRadius: 14, padding: 3, marginBottom: 28 }}>
            <button onClick={() => { setIsLogin(true); resetMessages(); }} style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, background: isLogin ? T.accent : 'transparent', color: isLogin ? '#111' : T.textDim, transition: 'all 0.2s' }}>Login</button>
            <button onClick={() => { setIsLogin(false); resetMessages(); }} style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, background: !isLogin ? T.accent : 'transparent', color: !isLogin ? '#111' : T.textDim, transition: 'all 0.2s' }}>Register</button>
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: T.white, marginBottom: 6, textAlign: 'center' }}>
            {isLogin ? 'Welcome back' : 'Create an account'}
          </h2>
          <p style={{ fontSize: '0.82rem', color: T.textMuted, marginBottom: 24, textAlign: 'center' }}>
            {isLogin ? 'Enter your details to access your portfolio' : 'Start your on-chain invoice financing journey'}
          </p>

          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '10px 14px', borderRadius: 12, marginBottom: 16, fontSize: '0.82rem' }}>{error}</div>}
          {successMsg && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80', padding: '10px 14px', borderRadius: 12, marginBottom: 16, fontSize: '0.82rem' }}>{successMsg}</div>}

          <form onSubmit={isLogin ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!isLogin && (
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Full Name</label>
                <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe" style={inputStyle} onFocus={e => e.target.style.borderColor = T.accent} onBlur={e => e.target.style.borderColor = T.borderLight} />
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Email Address</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" style={inputStyle} onFocus={e => e.target.style.borderColor = T.accent} onBlur={e => e.target.style.borderColor = T.borderLight} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Password</label>
              <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder={isLogin ? 'Enter your password' : 'Min 6 characters'} style={inputStyle} onFocus={e => e.target.style.borderColor = T.accent} onBlur={e => e.target.style.borderColor = T.borderLight} />
            </div>
            <button type="submit" disabled={loading} style={{ marginTop: 8, width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, color: '#111', fontWeight: 700, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: `0 4px 20px rgba(199,242,132,0.2)`, opacity: loading ? 0.7 : 1, transition: 'all 0.2s' }}>
              {loading ? (isLogin ? 'Signing in...' : 'Creating account...') : (isLogin ? 'Sign In →' : 'Create Account →')}
            </button>
          </form>

          <p style={{ marginTop: 24, textAlign: 'center', fontSize: '0.75rem', color: T.textDim }}>
            By continuing, you agree to InvoiceFi's Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
