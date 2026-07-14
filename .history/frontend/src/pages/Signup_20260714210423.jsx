import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

/* ─────────────────────────────────────────────────────────────
   SVG ICONS (inline — zero extra dependencies)
───────────────────────────────────────────────────────────── */
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
const IconArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12l7 7 7-7"/>
  </svg>
);
const IconShield = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IconPolygon = () => (
  <svg width="14" height="14" viewBox="0 0 38 33" fill="none">
    <path d="M29.27 10.06a2.88 2.88 0 0 0-2.84 0L20.8 13.65l-3.79 2.13-5.6 3.59a2.88 2.88 0 0 1-2.85 0L4 16.17a2.76 2.76 0 0 1-1.42-2.4v-5.3a2.75 2.75 0 0 1 1.42-2.4l4.55-2.6a2.88 2.88 0 0 1 2.84 0l4.55 2.6a2.76 2.76 0 0 1 1.43 2.4v3.59l3.79-2.19V8.3a2.75 2.75 0 0 0-1.42-2.4L11.4 1.12a2.88 2.88 0 0 0-2.84 0L.71 5.9A2.75 2.75 0 0 0 0 8.37v9.52a2.75 2.75 0 0 0 1.42 2.4l7.9 4.5a2.88 2.88 0 0 0 2.84 0l5.6-3.18 3.79-2.19 5.6-3.18a2.88 2.88 0 0 1 2.84 0l4.55 2.6a2.76 2.76 0 0 1 1.42 2.4v5.3a2.75 2.75 0 0 1-1.42 2.4l-4.55 2.6a2.88 2.88 0 0 1-2.84 0L23 29.45a2.76 2.76 0 0 1-1.42-2.4v-3.59l-3.79 2.19v3.59a2.75 2.75 0 0 0 1.42 2.4l7.9 4.5a2.88 2.88 0 0 0 2.84 0l7.9-4.5A2.75 2.75 0 0 0 38 29.3V19.7a2.75 2.75 0 0 0-1.43-2.4l-7.3-4.18z" fill="#8247E5"/>
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
   MAIN SIGNUP COMPONENT
───────────────────────────────────────────────────────────── */
export default function Signup() {
  /* ── Existing Auth State (UNCHANGED) ── */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  /* ── New UI-only state ── */
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  /* ── Existing handleSignup (UNCHANGED logic) ── */
  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    console.log('[Signup] Attempting signup for:', email);

    try {
      // 1. Sign up via Supabase Auth
      const { data, error: signupError } = await supabase.auth.signUp({ email, password });

      console.log('[Signup] Supabase response:', { data, signupError });

      if (signupError) throw signupError;

      if (data?.user) {
        // 2. Upsert profile row
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName,
          role: 'investor',
        }, { onConflict: 'id' });

        if (profileError) {
          console.warn('[Signup] Profile upsert error (non-fatal):', profileError.message);
        }

        if (data?.session) {
          navigate('/dashboard');
        } else {
          setSuccess('Account created! Check your email to confirm, then login.');
        }
      }
    } catch (err) {
      console.error('[Signup] Error:', err);
      setError(err.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

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

        /* Banners */
        .lp-error { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); color: #EF4444; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 12px; }
        .lp-success { background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.25); color: #22C55E; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 12px; }

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

        /* Primary button */
        .lp-btn-primary { width: 100%; height: 46px; background: linear-gradient(135deg, #7C5CFC 0%, #6B48F5 100%); color: #fff; font-size: 14.5px; font-weight: 600; border: none; border-radius: 12px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s, background 0.2s; letter-spacing: 0.1px; font-family: inherit; position: relative; overflow: hidden; margin-top: 10px; }
        .lp-btn-primary:hover:not(:disabled) { transform: translateY(-1.5px); box-shadow: 0 6px 16px rgba(124,92,252,0.3); background: linear-gradient(135deg, #8E73FF 0%, #7C5CFC 100%); }
        .lp-btn-primary:active:not(:disabled) { transform: translateY(0); }
        .lp-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

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
          .lp-signup-row { margin-top: 12px; }
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
            YieldX
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
              <h2 className="lp-auth-title">Create Account</h2>
              <p className="lp-auth-subtitle">Start your on-chain invoice financing journey.</p>

              {/* Alerts */}
              {error && <div className="lp-error">{error}</div>}
              {success && <div className="lp-success">{success}</div>}

              {/* ── AUTH FORM ── */}
              <form onSubmit={handleSignup}>

                {/* Full Name input */}
                <div className="lp-input-group">
                  <label htmlFor="signup-name" className="lp-label">Full Name</label>
                  <div className="lp-input-wrap">
                    <span className="lp-input-icon"><IconUser /></span>
                    <input
                      id="signup-name"
                      type="text"
                      required
                      className="lp-input"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Email input */}
                <div className="lp-input-group">
                  <label htmlFor="signup-email" className="lp-label">Email address</label>
                  <div className="lp-input-wrap">
                    <span className="lp-input-icon"><IconEmail /></span>
                    <input
                      id="signup-email"
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
                  <label htmlFor="signup-password" className="lp-label">Password</label>
                  <div className="lp-input-wrap">
                    <span className="lp-input-icon"><IconLock /></span>
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      className="lp-input"
                      placeholder="Min 6 characters"
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

                {/* Submit button */}
                <button
                  id="signup-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="lp-btn-primary"
                >
                  {loading ? 'Creating account…' : 'Create Account'}
                </button>
              </form>

              {/* Login link */}
              <div className="lp-signup-row">
                Already have an account?{' '}
                <Link to="/login" className="lp-signup-link">Login</Link>
              </div>
            </div>
          </section>
        </div>

        {/* ── FOOTER ── */}
        <footer className="lp-footer">
          <span className="lp-footer-copy">© YieldX</span>
          <div className="lp-footer-center">
            <span className="lp-footer-badge">
              <IconShield /> Secure
            </span>
            <span className="lp-footer-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.4}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              Transparent
            </span>
            <span className="lp-footer-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.4}}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
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
