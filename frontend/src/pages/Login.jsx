import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';

import { useAuth } from '../context/AuthContext';

/* ─────────────────────────────────────────────────────────────
   SVG ICONS (inline — zero extra dependencies)
───────────────────────────────────────────────────────────── */
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
const IconGoogle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);
const IconMetaMask = () => (
  <svg width="22" height="22" viewBox="0 0 35 33" fill="none">
    <path d="M32.958.528 19.47 10.586l2.47-5.837L32.958.528ZM2.042.528 15.406 10.68l-2.343-5.931L2.042.528ZM28.15 23.66l-3.572 5.47 7.643 2.103 2.19-7.46-6.262-.113ZM.62 23.773l2.18 7.46 7.633-2.104-3.562-5.47-6.251.114Z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m10.15 14.52-2.13 3.22 7.59.345-.264-8.17-5.195 4.605ZM24.85 14.52l-5.27-4.7-.175 8.265 7.58-.345-2.135-3.22ZM10.433 29.13l4.573-2.208-3.942-3.07-.63 5.278ZM19.994 26.922l4.563 2.208-.62-5.278-3.943 3.07Z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m24.557 29.13-4.563-2.208.365 2.984-.04 1.248 4.238-2.024ZM10.433 29.13l4.248 2.024-.03-1.248.355-2.984-4.573 2.208Z" fill="#D5BFB2" stroke="#D5BFB2" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m14.74 21.887-3.798-1.116 2.678-1.228 1.12 2.344ZM20.26 21.887l1.12-2.344 2.688 1.228-3.808 1.116Z" fill="#233447" stroke="#233447" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m10.433 29.13.65-5.47-4.212.114 3.562 5.356ZM23.917 23.66l.64 5.47 3.572-5.356-4.212-.114ZM27.15 17.74l-7.58.345.702 3.802 1.12-2.344 2.688 1.228 3.07-3.031ZM10.942 20.77l2.678-1.228 1.12 2.344.712-3.802-7.59-.345 3.08 3.031Z" fill="#CC6228" stroke="#CC6228" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m7.862 17.74 3.18 6.198-.102-3.168-3.078-3.03ZM24.07 20.77l-.112 3.168 3.19-6.198-3.078 3.03ZM15.452 18.085l-.712 3.802.895 4.62.203-6.085-.386-2.337ZM19.548 18.085l-.376 2.327.183 6.095.905-4.62-.712-3.802Z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m20.26 21.887-.905 4.62.651.457 3.942-3.07.112-3.168-3.8 1.16ZM10.942 20.77l.102 3.168 3.942 3.07.651-.456-.895-4.62-3.8-1.162Z" fill="#F5841F" stroke="#F5841F" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m20.31 31.154.04-1.248-.335-.285h-4.03l-.315.285.03 1.248-4.247-2.024 1.485 1.218 3.01 2.083h5.134l3.02-2.083 1.475-1.218-4.267 2.024Z" fill="#C0AC9D" stroke="#C0AC9D" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m19.994 26.922-.65-.457h-3.69l-.65.457-.356 2.984.315-.285h4.03l.335.285-.334-2.984Z" fill="#161616" stroke="#161616" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M33.517 11.142 34.5 6.198l-1.542-5.67-11.964 8.879 4.603 3.895 6.506 1.9 1.444-1.686-.629-.456 1.007-.916-.772-.6 1.007-.773-.643-.505ZM.5 6.198l.993 4.944-.629.505 1.007.773-.762.6 1.007.916-.629.456 1.434 1.686 6.506-1.9 4.603-3.895L2.042.528.5 6.198Z" fill="#763E1A" stroke="#763E1A" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m32.103 15.202-6.506-1.9 1.95 2.94-2.907 5.667 3.83-.05h5.714l-2.081-6.657ZM9.403 13.302l-6.506 1.9-2.062 6.657h5.704l3.82.05-2.897-5.667 1.941-2.94ZM19.548 18.085l.416-7.215 1.9-5.14h-8.45l1.87 5.14.446 7.215.163 2.358.01 5.826h3.69l.02-5.826.183-2.358Z" fill="#F5841F" stroke="#F5841F" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12l7 7 7-7" />
  </svg>
);
const IconShield = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IconPolygon = () => (
  <svg width="14" height="14" viewBox="0 0 38 33" fill="none">
    <path d="M29.27 10.06a2.88 2.88 0 0 0-2.84 0L20.8 13.65l-3.79 2.13-5.6 3.59a2.88 2.88 0 0 1-2.85 0L4 16.17a2.76 2.76 0 0 1-1.42-2.4v-5.3a2.75 2.75 0 0 1 1.42-2.4l4.55-2.6a2.88 2.88 0 0 1 2.84 0l4.55 2.6a2.76 2.76 0 0 1 1.43 2.4v3.59l3.79-2.19V8.3a2.75 2.75 0 0 0-1.42-2.4L11.4 1.12a2.88 2.88 0 0 0-2.84 0L.71 5.9A2.75 2.75 0 0 0 0 8.37v9.52a2.75 2.75 0 0 0 1.42 2.4l7.9 4.5a2.88 2.88 0 0 0 2.84 0l5.6-3.18 3.79-2.19 5.6-3.18a2.88 2.88 0 0 1 2.84 0l4.55 2.6a2.76 2.76 0 0 1 1.42 2.4v5.3a2.75 2.75 0 0 1-1.42 2.4l-4.55 2.6a2.88 2.88 0 0 1-2.84 0L23 29.45a2.76 2.76 0 0 1-1.42-2.4v-3.59l-3.79 2.19v3.59a2.75 2.75 0 0 0 1.42 2.4l7.9 4.5a2.88 2.88 0 0 0 2.84 0l7.9-4.5A2.75 2.75 0 0 0 38 29.3V19.7a2.75 2.75 0 0 0-1.43-2.4l-7.3-4.18z" fill="#8247E5" />
  </svg>
);

/* ─────────────────────────────────────────────────────────────
   MINI SPARKLINE CHARTS (pure SVG)
───────────────────────────────────────────────────────────── */
function Sparkline({ points, color = '#7C5CFC', filled = false }) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 80, h = 32;
  const xs = points.map((_, i) => (i / (points.length - 1)) * w);
  const ys = points.map(p => h - ((p - min) / range) * (h - 4) - 2);
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ');
  const fillD = `${d} L${w},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {filled && <path d={fillD} fill={color} opacity="0.12" />}
      <path d={d} stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   BLOCKCHAIN BACKGROUND CANVAS
───────────────────────────────────────────────────────────── */
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

    const nodes = Array.from({ length: 22 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
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
          if (dist < 160) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(124,92,252,${0.04 * (1 - dist / 160)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
      nodes.forEach(n => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(124,92,252,0.06)';
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
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN LOGIN COMPONENT
───────────────────────────────────────────────────────────── */
export default function Login() {
  /* ── Existing Auth State (UNCHANGED) ── */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  /* ── New UI-only state ── */
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  /* ── Wallet context ── */
  const { connectWallet, connectionStatus, truncatedAddress } = useWallet();

  const { isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  /* ── Existing handleLogin (UNCHANGED logic) ── */
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) throw loginError;
      if (data?.session) {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Google OAuth (uses existing supabase client) ── */
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err.message || 'Google sign-in failed.');
      setGoogleLoading(false);
    }
  };

  /* ── Wallet connect (uses existing WalletContext) ── */
  const handleWalletConnect = async () => {
    setWalletLoading(true);
    try {
      await connectWallet();
    } finally {
      setWalletLoading(false);
    }
  };

  const isWalletConnected = connectionStatus === 'connected';

  /* ── Workflow steps ── */
  const steps = [
    { icon: '📄', label: 'Invoice Uploaded', num: '01' },
    { icon: '💰', label: 'Investor Funding', num: '02' },
    { icon: '⚡', label: 'Smart Contract', num: '03' },
    { icon: '✅', label: 'Funds Released', num: '04' },
  ];

  /* ── Analytics cards data ── */
  const analyticsCards = [
    {
      value: '$2.5M+',
      label: 'Invoices Financed',
      chart: [12, 18, 14, 22, 19, 28, 24, 32, 30, 38],
      color: '#7C5CFC',
      trend: '+12.4%',
      trendUp: true,
    },
    {
      value: '2.1 sec',
      label: 'Avg Confirmation',
      chart: [30, 25, 28, 22, 20, 18, 22, 19, 21, 18],
      color: '#22C55E',
      trend: '-8.2%',
      trendUp: true,
    },
    {
      value: '<0.01',
      label: 'Avg Gas Fee (MATIC)',
      chart: [5, 4, 6, 3, 5, 2, 4, 3, 2, 3],
      color: '#7C5CFC',
      trend: '-15.1%',
      trendUp: true,
    },
  ];

  return (
    <>
      {/* ── Global styles scoped to this page ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        .lp-root * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', -apple-system, sans-serif; }
        .lp-root { background: #0B0B0F; color: #FFFFFF; display: flex; flex-direction: column; min-height: 100vh; }

        /* Navbar */
        .lp-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 0 40px; height: 64px; background: rgba(11,11,15,0.8); border-bottom: 1px solid rgba(255,255,255,0.05); backdrop-filter: blur(12px); }
        .lp-logo { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 700; color: #fff; letter-spacing: -0.3px; }
        .lp-logo-dot { width: 8px; height: 8px; border-radius: 50%; background: #7C5CFC; }
        .lp-nav-links { display: flex; align-items: center; gap: 32px; }
        .lp-nav-link { font-size: 14px; color: #A0A0A8; text-decoration: none; transition: color 0.2s; position: relative; padding-bottom: 2px; }
        .lp-nav-link::after { content: ''; position: absolute; bottom: -2px; left: 0; width: 100%; height: 1px; background: #7C5CFC; transform: scaleX(0); transform-origin: left; transition: transform 0.25s ease; }
        .lp-nav-link:hover { color: #fff; }
        .lp-nav-link:hover::after { transform: scaleX(1); }

        /* Layout */
        .lp-body { display: flex; flex: 1; padding-top: 64px; min-height: 0; }
        .lp-left { flex: 0 0 60%; padding: 48px 60px 48px 60px; display: flex; flex-direction: column; justify-content: center; position: relative; overflow: hidden; }
        .lp-right { flex: 0 0 40%; padding: 40px; display: flex; flex-direction: column; justify-content: center; align-items: center; border-left: 1px solid rgba(255,255,255,0.05); background: #0E0E12; overflow-y: auto; }

        @media (min-width: 769px) {
          .lp-root { height: 100vh; overflow: hidden; }
          .lp-body { height: calc(100vh - 64px - 56px); }
          .lp-left { height: 100%; overflow-y: auto; }
          .lp-right { height: 100%; }
        }

        /* Left side heading */
        .lp-heading { font-size: 42px; font-weight: 800; line-height: 1.15; letter-spacing: -1.5px; color: #fff; margin-bottom: 16px; }
        .lp-heading-accent { color: #7C5CFC; }
        .lp-subheading { font-size: 14.5px; color: #A0A0A8; line-height: 1.6; max-width: 460px; margin-bottom: 28px; }

        /* Workflow card */
        .lp-workflow-card { background: #151518; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px 24px; margin-bottom: 24px; }
        .lp-workflow-title { font-size: 11px; font-weight: 600; letter-spacing: 1.2px; color: #A0A0A8; text-transform: uppercase; margin-bottom: 16px; }
        .lp-workflow-steps { display: flex; align-items: center; gap: 0; }
        .lp-step { display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1; }
        .lp-step-icon-wrap { width: 42px; height: 42px; border-radius: 12px; background: rgba(124,92,252,0.08); border: 1px solid rgba(124,92,252,0.2); display: flex; align-items: center; justify-content: center; font-size: 18px; transition: transform 0.2s, background 0.2s; cursor: default; }
        .lp-step:hover .lp-step-icon-wrap { transform: translateY(-2px); background: rgba(124,92,252,0.15); }
        .lp-step-num { font-size: 9px; font-weight: 700; color: #7C5CFC; letter-spacing: 0.5px; }
        .lp-step-label { font-size: 11px; font-weight: 500; color: #A0A0A8; text-align: center; line-height: 1.3; }
        .lp-step-arrow { color: rgba(124,92,252,0.45); flex-shrink: 0; padding: 0 4px; display: flex; align-items: center; margin-bottom: 22px; }
        .lp-step-arrow svg { transition: filter 0.3s; }
        .lp-workflow-card:hover .lp-step-arrow svg { filter: drop-shadow(0 0 4px rgba(124,92,252,0.7)); }

        /* Analytics cards */
        .lp-analytics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .lp-analytics-card { background: #151518; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 16px; transition: transform 0.3s, box-shadow 0.3s; animation: cardFloat 6s ease-in-out infinite; }
        .lp-analytics-card:nth-child(2) { animation-delay: 2s; }
        .lp-analytics-card:nth-child(3) { animation-delay: 4s; }
        .lp-analytics-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(124,92,252,0.08); }
        .lp-analytics-value { font-size: 20px; font-weight: 800; color: #fff; letter-spacing: -0.5px; margin-bottom: 2px; }
        .lp-analytics-label { font-size: 11.5px; color: #A0A0A8; margin-bottom: 10px; }
        .lp-analytics-footer { display: flex; align-items: center; justify-content: space-between; }
        .lp-trend { font-size: 10.5px; font-weight: 600; }
        .lp-trend.up { color: #22C55E; }

        @keyframes cardFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .lp-analytics-card:hover { animation-play-state: paused; }

        /* Page fade-in */
        @keyframes lpFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .lp-fade-in { animation: lpFadeIn 0.5s ease-out both; }
        .lp-fade-in-delay-1 { animation: lpFadeIn 0.5s 0.08s ease-out both; }
        .lp-fade-in-delay-2 { animation: lpFadeIn 0.5s 0.16s ease-out both; }
        .lp-fade-in-delay-3 { animation: lpFadeIn 0.5s 0.24s ease-out both; }

        /* Auth card */
        .lp-auth-card { background: #151518; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 24px 28px; box-shadow: 0 20px 48px rgba(0,0,0,0.4); width: 100%; max-width: 420px; margin: auto 0; flex-shrink: 0; }
        .lp-auth-title { font-size: 24px; font-weight: 800; color: #fff; letter-spacing: -0.6px; margin-bottom: 4px; }
        .lp-auth-subtitle { font-size: 13px; color: #A0A0A8; margin-bottom: 20px; line-height: 1.4; }

        /* Error banner */
        .lp-error { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); color: #EF4444; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 12px; }

        /* Input groups */
        .lp-input-group { margin-bottom: 12px; }
        .lp-label { font-size: 12px; font-weight: 500; color: #A0A0A8; margin-bottom: 4px; display: block; }
        .lp-input-wrap { position: relative; display: flex; align-items: center; }
        .lp-input-icon { position: absolute; left: 14px; color: #A0A0A8; pointer-events: none; display: flex; align-items: center; }
        .lp-input { width: 100%; height: 46px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #fff; font-size: 14px; padding: 0 40px; outline: none; transition: border-color 0.2s, box-shadow 0.2s; font-family: inherit; }
        .lp-input::placeholder { color: rgba(160,160,168,0.45); }
        .lp-input:focus { border-color: #7C5CFC; box-shadow: 0 0 0 3px rgba(124,92,252,0.12); }
        .lp-input-right { position: absolute; right: 12px; background: none; border: none; cursor: pointer; color: #A0A0A8; display: flex; align-items: center; padding: 4px; transition: color 0.2s; }
        .lp-input-right:hover { color: #fff; }

        /* Remember / Forgot row */
        .lp-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; margin-top: 2px; }
        .lp-remember { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12.5px; color: #A0A0A8; }
        .lp-checkbox { width: 15px; height: 15px; border: 1.5px solid rgba(255,255,255,0.2); border-radius: 4px; appearance: none; background: transparent; cursor: pointer; position: relative; flex-shrink: 0; transition: border-color 0.2s, background 0.2s; }
        .lp-checkbox:checked { background: #7C5CFC; border-color: #7C5CFC; }
        .lp-checkbox:checked::after { content: '✓'; position: absolute; top: -2px; left: 2px; font-size: 10px; color: #fff; font-weight: 700; }
        .lp-forgot { font-size: 12.5px; color: #7C5CFC; text-decoration: none; transition: color 0.2s; }
        .lp-forgot:hover { color: #8E73FF; }

        /* Primary button */
        .lp-btn-primary { width: 100%; height: 46px; background: linear-gradient(135deg, #7C5CFC 0%, #6B48F5 100%); color: #fff; font-size: 14.5px; font-weight: 600; border: none; border-radius: 12px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s, background 0.2s; letter-spacing: 0.1px; font-family: inherit; position: relative; overflow: hidden; }
        .lp-btn-primary:hover:not(:disabled) { transform: translateY(-1.5px); box-shadow: 0 6px 16px rgba(124,92,252,0.3); background: linear-gradient(135deg, #8E73FF 0%, #7C5CFC 100%); }
        .lp-btn-primary:active:not(:disabled) { transform: translateY(0); }
        .lp-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Divider */
        .lp-divider { display: flex; align-items: center; gap: 12px; margin: 12px 0; }
        .lp-divider-line { flex: 1; height: 1px; background: rgba(255,255,255,0.06); }
        .lp-divider-text { font-size: 11.5px; color: rgba(160,160,168,0.55); white-space: nowrap; }

        /* Secondary buttons */
        .lp-btn-secondary { width: 100%; height: 42px; background: transparent; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; color: #fff; font-size: 13.5px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: border-color 0.2s, background 0.2s, transform 0.2s; margin-bottom: 8px; font-family: inherit; }
        .lp-btn-secondary:hover:not(:disabled) { border-color: rgba(255,255,255,0.18); background: rgba(255,255,255,0.03); transform: translateY(-1px); }
        .lp-btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }
        .lp-btn-secondary.connected { border-color: rgba(34,197,94,0.35); color: #22C55E; }

        /* Sign-up link */
        .lp-signup-row { margin-top: 18px; text-align: center; font-size: 13.5px; color: #A0A0A8; }
        .lp-signup-link { color: #7C5CFC; font-weight: 600; text-decoration: none; transition: color 0.2s; }
        .lp-signup-link:hover { color: #8E73FF; }

        /* Footer */
        .lp-footer { background: #0B0B0F; border-top: 1px solid rgba(255,255,255,0.05); padding: 14px 40px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .lp-footer-copy { font-size: 11px; color: rgba(160,160,168,0.45); }
        .lp-footer-center { display: flex; align-items: center; gap: 20px; }
        .lp-footer-badge { display: flex; align-items: center; gap: 5px; font-size: 11px; color: rgba(160,160,168,0.45); }
        .lp-footer-badge svg { opacity: 0.35; }
        .lp-footer-right { display: flex; align-items: center; gap: 6px; font-size: 11px; color: rgba(160,160,168,0.45); }

        /* Responsive & Short Viewports scaling */
        @media (min-width: 769px) and (max-height: 800px) {
          .lp-heading { font-size: 34px; margin-bottom: 10px; }
          .lp-subheading { font-size: 13px; margin-bottom: 20px; }
          .lp-workflow-card { padding: 14px 18px; margin-bottom: 16px; }
          .lp-workflow-title { margin-bottom: 10px; }
          .lp-step-icon-wrap { width: 36px; height: 36px; border-radius: 10px; font-size: 16px; }
          .lp-step-label { font-size: 10.5px; }
          .lp-step-arrow { margin-bottom: 16px; }
          .lp-analytics-card { padding: 12px 14px; }
          .lp-analytics-value { font-size: 18px; }
          .lp-analytics-label { font-size: 10.5px; margin-bottom: 6px; }
          .lp-auth-card { padding: 24px 20px; border-radius: 16px; }
          .lp-auth-title { font-size: 21px; }
          .lp-auth-subtitle { margin-bottom: 16px; }
          .lp-input-group { margin-bottom: 10px; }
          .lp-input { height: 42px; font-size: 13.5px; }
          .lp-btn-primary { height: 42px; font-size: 13.5px; }
          .lp-btn-secondary { height: 38px; font-size: 12.5px; margin-bottom: 8px; }
          .lp-divider { margin: 10px 0; }
          .lp-signup-row { margin-top: 12px; }
          .lp-row { margin-bottom: 10px; }
        }

        @media (max-width: 1024px) {
          .lp-left { flex: 0 0 55%; padding: 40px; }
          .lp-right { flex: 0 0 45%; padding: 30px; }
          .lp-heading { font-size: 36px; }
        }
        @media (max-width: 768px) {
          .lp-body { flex-direction: column; padding-top: 64px; }
          .lp-left { flex: none; padding: 40px 20px 24px; overflow: visible; }
          .lp-right { flex: none; border-left: none; border-top: 1px solid rgba(255,255,255,0.05); padding: 24px 20px 40px; overflow: visible; }
          .lp-heading { font-size: 32px; letter-spacing: -1px; }
          .lp-analytics { grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .lp-analytics-value { font-size: 16px; }
          .lp-auth-card { border-radius: 16px; padding: 28px 20px; }
          .lp-nav { padding: 0 20px; }
          .lp-footer { flex-direction: column; gap: 12px; padding: 16px 20px; text-align: center; }
          .lp-footer-center { gap: 12px; flex-wrap: wrap; justify-content: center; }
        }
      `}</style>

      <div className="lp-root" style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.4s' }}>

        {/* ── NAVBAR ── */}
        <nav className="lp-nav">
          <div className="lp-logo">
            <div className="lp-logo-dot" />
            Invoicefi
          </div>
          <div className="lp-nav-links">
            <a href="#" className="lp-nav-link">Documentation</a>
            <a href="#" className="lp-nav-link">About</a>
            <a href="#" className="lp-nav-link">Contact</a>
          </div>
        </nav>

        {/* ── BODY ── */}
        <div className="lp-body">

          {/* ══════════ LEFT SECTION ══════════ */}
          <section className="lp-left">
            <BlockchainBg />

            {/* Heading */}
            <h1 className="lp-heading lp-fade-in">
              Trade Finance,<br />
              Reimagined on{' '}
              <span className="lp-heading-accent">Polygon</span>
            </h1>
            <p className="lp-subheading lp-fade-in-delay-1">
              Instant invoice financing for exporters through transparent blockchain-powered investment pools.
            </p>

            {/* Workflow Card */}
            <div className="lp-workflow-card lp-fade-in-delay-2">
              <div className="lp-workflow-title">How It Works</div>
              <div className="lp-workflow-steps">
                {steps.map((step, i) => (
                  <React.Fragment key={step.num}>
                    <div className="lp-step">
                      <div className="lp-step-num">{step.num}</div>
                      <div className="lp-step-icon-wrap">{step.icon}</div>
                      <div className="lp-step-label">{step.label}</div>
                    </div>
                    {i < steps.length - 1 && (
                      <div className="lp-step-arrow">
                        <IconArrow />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Analytics Cards */}
            <div className="lp-analytics lp-fade-in-delay-3">
              {analyticsCards.map((card) => (
                <div className="lp-analytics-card" key={card.label}>
                  <div className="lp-analytics-value">{card.value}</div>
                  <div className="lp-analytics-label">{card.label}</div>
                  <div className="lp-analytics-footer">
                    <span className={`lp-trend up`}>{card.trend}</span>
                    <Sparkline points={card.chart} color={card.color} filled />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ══════════ RIGHT SECTION ══════════ */}
          <section className="lp-right">
            <div className="lp-auth-card lp-fade-in">

              {/* Card header */}
              <h2 className="lp-auth-title">Welcome Back</h2>
              <p className="lp-auth-subtitle">Continue managing your invoice investments.</p>

              {/* Error display (existing) */}
              {error && <div className="lp-error">{error}</div>}

              {/* ── AUTH FORM (all existing logic preserved) ── */}
              <form onSubmit={handleLogin}>

                {/* Email input */}
                <div className="lp-input-group">
                  <label htmlFor="login-email" className="lp-label">Email address</label>
                  <div className="lp-input-wrap">
                    <span className="lp-input-icon"><IconEmail /></span>
                    <input
                      id="login-email"
                      type="email"
                      required
                      className="lp-input"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* Password input */}
                <div className="lp-input-group">
                  <label htmlFor="login-password" className="lp-label">Password</label>
                  <div className="lp-input-wrap">
                    <span className="lp-input-icon"><IconLock /></span>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="lp-input"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="lp-input-right"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <IconEyeClosed /> : <IconEyeOpen />}
                    </button>
                  </div>
                </div>

                {/* Remember Me + Forgot Password */}
                <div className="lp-row">
                  <label className="lp-remember">
                    <input
                      type="checkbox"
                      className="lp-checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    Remember me
                  </label>
                  <a href="#" className="lp-forgot">Forgot password?</a>
                </div>

                {/* Primary login button */}
                <button
                  id="login-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="lp-btn-primary"
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>

              {/* Divider */}
              <div className="lp-divider">
                <div className="lp-divider-line" />
                <span className="lp-divider-text">OR</span>
                <div className="lp-divider-line" />
              </div>

              {/* Google button (existing supabase OAuth) */}
              <button
                id="google-login-btn"
                type="button"
                className="lp-btn-secondary"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
              >
                <IconGoogle />
                {googleLoading ? 'Redirecting…' : 'Continue with Google'}
              </button>

              {/* MetaMask / Wallet button (existing WalletContext) */}
              <button
                id="wallet-login-btn"
                type="button"
                className={`lp-btn-secondary${isWalletConnected ? ' connected' : ''}`}
                onClick={handleWalletConnect}
                disabled={walletLoading || isWalletConnected}
              >
                <IconMetaMask />
                {isWalletConnected
                  ? `Connected: ${truncatedAddress}`
                  : walletLoading
                    ? 'Connecting…'
                    : 'Connect Wallet'}
              </button>

              {/* Sign-up link (existing routing) */}
              <div className="lp-signup-row">
                Don't have an account?{' '}
                <Link to="/signup" className="lp-signup-link">Create Account</Link>
              </div>
            </div>
          </section>
        </div>

        {/* ── FOOTER ── */}
        <footer className="lp-footer">
          <span className="lp-footer-copy">© Invoicefi</span>
          <div className="lp-footer-center">
            <span className="lp-footer-badge">
              <IconShield /> Secure
            </span>
            <span className="lp-footer-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              Transparent
            </span>
            <span className="lp-footer-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
              Decentralized
            </span>
          </div>
          <div className="lp-footer-right">
            <IconPolygon />
            <span>Powered by Polygon</span>
          </div>
        </footer>

      </div>
    </>
  );
}
