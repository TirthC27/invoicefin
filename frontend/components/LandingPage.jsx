import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/* ─────────────────────────────────────────────────────────────
   InvoiceFi Landing Page — jup.ag dark theme
───────────────────────────────────────────────────────────────*/

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { font-family: 'Inter', sans-serif; background: #0c1421; color: #e2e8f0; overflow-x: hidden; }

  @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse-dot { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.6; transform:scale(1.4); } }
  @keyframes float-slow { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
  @keyframes glow { 0%,100% { box-shadow: 0 0 20px rgba(199,242,132,0.1); } 50% { box-shadow: 0 0 40px rgba(199,242,132,0.2); } }

  .fade-up   { animation: fadeUp 0.9s cubic-bezier(0.22,1,0.36,1) both; }
  .fade-up-2 { animation: fadeUp 0.9s cubic-bezier(0.22,1,0.36,1) 0.15s both; }
  .fade-up-3 { animation: fadeUp 0.9s cubic-bezier(0.22,1,0.36,1) 0.3s both; }
  .float-slow { animation: float-slow 7s ease-in-out infinite; }

  .service-row {
    display: grid; grid-template-columns: 140px 1fr 340px;
    align-items: center; padding: 36px 0; border-bottom: 1px solid rgba(255,255,255,0.06);
    gap: 32px; cursor: default; transition: background 0.2s;
  }
  .service-row:hover { background: rgba(199,242,132,0.03); }
  .service-row:first-child { border-top: 1px solid rgba(255,255,255,0.06); }

  .stat-card {
    background: #1b2336; border: 1px solid rgba(255,255,255,0.06); border-radius: 20px;
    padding: 32px 28px; transition: transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s;
  }
  .stat-card:hover { transform: translateY(-6px); box-shadow: 0 20px 48px rgba(0,0,0,0.3); }

  .feature-card {
    border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; padding: 32px;
    background: #1b2336; transition: transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s;
  }
  .feature-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 16px 48px rgba(199,242,132,0.08), 0 4px 16px rgba(0,0,0,0.2);
    border-color: rgba(199,242,132,0.15);
  }

  .pill-tag {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 14px; border: 1px solid rgba(255,255,255,0.12); border-radius: 999px;
    font-size: 12px; font-weight: 600; letter-spacing: 0.04em; color: #94a3b8;
  }

  .cta-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 13px 28px; border-radius: 999px;
    font-size: 14px; font-weight: 700; cursor: pointer;
    transition: all 0.2s; text-decoration: none; border: none;
  }
  .cta-btn-primary { background: linear-gradient(135deg, #c7f284, #9fc95e); color: #111; }
  .cta-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(199,242,132,0.3); }
  .cta-btn-outline { background: transparent; color: #94a3b8; border: 1.5px solid rgba(255,255,255,0.15); }
  .cta-btn-outline:hover { border-color: #c7f284; color: #c7f284; transform: translateY(-1px); }
  .cta-btn-dark { background: rgba(255,255,255,0.08); color: #e2e8f0; }
  .cta-btn-dark:hover { background: rgba(255,255,255,0.12); transform: translateY(-1px); }

  .marquee-track { display: flex; gap: 60px; animation: marquee 22s linear infinite; white-space: nowrap; }

  @media (max-width: 900px) {
    .hero-grid     { grid-template-columns: 1fr !important; }
    .service-row   { grid-template-columns: 80px 1fr !important; }
    .service-row .desc { display: none; }
    .stats-grid    { grid-template-columns: 1fr 1fr !important; }
    .features-grid { grid-template-columns: 1fr !important; }
    .how-grid      { grid-template-columns: 1fr !important; }
  }
`;

const PARTNERS = ['Ethereum', 'Supabase', 'Django REST', 'Vite + React', 'Hardhat', 'OpenZeppelin', 'IPFS', 'Ethers.js'];

/* ── SVG illustration ── */
function BlockchainCityIllo() {
  return (
    <svg viewBox="0 0 520 420" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto', maxWidth: 520 }}>
      <ellipse cx="260" cy="370" rx="200" ry="28" fill="#1e293b" />
      <rect x="160" y="120" width="100" height="220" rx="8" fill="#1b2336" />
      <rect x="160" y="120" width="100" height="12" rx="4" fill="#222c42" />
      {[140,160,180,200,220,240,260,280,300].map((y,i) => (
        <rect key={`a${i}`} x="170" y={y} width="14" height="10" rx="2" fill={i%3===0?'#c7f284':i%3===1?'#22c55e':'#1e293b'} opacity={0.85} />
      ))}
      {[140,160,180,200,220,240,260,280,300].map((y,i) => (
        <rect key={`b${i}`} x="196" y={y} width="14" height="10" rx="2" fill={i%2===0?'#1e293b':'#c7f284'} opacity={0.7} />
      ))}
      {[140,160,180,200,220,240,260,280,300].map((y,i) => (
        <rect key={`c${i}`} x="222" y={y} width="14" height="10" rx="2" fill={i%3===2?'#c7f284':'#1e293b'} opacity={0.8} />
      ))}
      <rect x="280" y="180" width="70" height="160" rx="6" fill="#222c42" />
      {[196,214,232,250,268,286,304].map((y,i) => (
        <rect key={`d${i}`} x="288" y={y} width="10" height="8" rx="2" fill={i%2===0?'#c7f284':'#334155'} opacity={0.8} />
      ))}
      <rect x="100" y="240" width="50" height="100" rx="6" fill="#1e293b" />
      <g style={{ animation: 'float-slow 6s ease-in-out infinite' }}>
        <rect x="70" y="100" width="36" height="36" rx="10" fill="#c7f284" opacity="0.15" transform="rotate(15 88 118)" />
        <rect x="73" y="103" width="30" height="30" rx="8" fill="none" stroke="#c7f284" strokeWidth="2" transform="rotate(15 88 118)" />
        <text x="82" y="122" fontSize="9" fill="#c7f284" fontWeight="800" fontFamily="monospace">TXN</text>
      </g>
      <g style={{ animation: 'float-slow 9s ease-in-out 1s infinite' }}>
        <rect x="360" y="220" width="90" height="60" rx="12" fill="#1b2336" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
        <rect x="372" y="232" width="40" height="4" rx="2" fill="#e2e8f0" />
        <rect x="372" y="242" width="28" height="3" rx="1.5" fill="#475569" />
        <rect x="372" y="252" width="52" height="3" rx="1.5" fill="#475569" />
        <rect x="416" y="268" width="22" height="8" rx="4" fill="#c7f284" />
        <text x="418" y="275" fontSize="6" fill="#111" fontWeight="800">FUND</text>
      </g>
      <circle cx="160" cy="115" r="6" fill="#c7f284" style={{ animation: 'pulse-dot 2s ease-in-out infinite' }} />
      <line x1="160" y1="115" x2="350" y2="175" stroke="#c7f284" strokeWidth="1" strokeDasharray="6,6" opacity="0.25" />
    </svg>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <>
      <style>{CSS}</style>

      {/* ══ NAVBAR ══ */}
      <nav style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 999, width: 'min(860px, calc(100vw - 32px))', background: navScrolled ? 'rgba(12,20,33,0.95)' : 'rgba(12,20,33,0.8)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 999, padding: '10px 20px', display: 'flex', alignItems: 'center', boxShadow: navScrolled ? '0 8px 32px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.2)', transition: 'all 0.3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => scrollTo('hero')}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#c7f284,#9fc95e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" fill="none" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#e2e8f0' }}>InvoiceFi</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {[['Problem','problem'],['Solution','solution'],['How It Works','how'],['Tech','tech']].map(([label,id]) => (
            <button key={id} onClick={() => scrollTo(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 500, color: '#94a3b8', transition: 'all 0.15s', fontFamily: 'Inter, sans-serif' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#e2e8f0'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94a3b8'; }}
            >{label}</button>
          ))}
          <button className="cta-btn cta-btn-primary" style={{ marginLeft: 8, padding: '8px 20px', fontSize: 13 }} onClick={() => navigate('/auth')}>Get Started →</button>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <section id="hero" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '120px 40px 80px', background: '#0c1421', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(199,242,132,0.06) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(199,242,132,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(199,242,132,0.02) 1px, transparent 1px)', backgroundSize: '56px 56px' }} />
        <div className="hero-grid" style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center', width: '100%', position: 'relative', zIndex: 2 }}>
          <div>
            <div className="pill-tag fade-up" style={{ marginBottom: 24 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#c7f284', display: 'inline-block', animation: 'pulse-dot 2s ease-in-out infinite' }} />
              Built on Sepolia Testnet
            </div>
            <h1 className="fade-up-2" style={{ fontSize: 'clamp(2.4rem, 5vw, 3.6rem)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.04em', color: '#f8fafc', marginBottom: 24 }}>
              Trade finance,<br />built from the<br /><span style={{ color: '#c7f284' }}>ground&#8209;up.</span>
            </h1>
            <p className="fade-up-3" style={{ fontSize: 16, color: '#94a3b8', lineHeight: 1.7, maxWidth: 420, marginBottom: 36 }}>
              African exporters wait 30–90 days for payment after shipping. InvoiceFi tokenises their invoices on Ethereum — giving exporters instant liquidity and investors transparent, on-chain yield.
            </p>
            <div className="fade-up-3" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="cta-btn cta-btn-primary" onClick={() => navigate('/auth')}>Start Investing →</button>
              <button className="cta-btn cta-btn-outline" onClick={() => scrollTo('how')}>See How It Works</button>
            </div>
            <div style={{ display: 'flex', gap: 32, marginTop: 48, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              {[{ val: '$40B+', label: 'Trade finance gap' }, { val: '<2s', label: 'Sepolia confirm time' }, { val: '12–16%', label: 'Target investor yield' }].map(s => (
                <div key={s.val}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#c7f284', letterSpacing: '-0.04em' }}>{s.val}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="float-slow" style={{ display: 'flex', justifyContent: 'center' }}><BlockchainCityIllo /></div>
        </div>
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: 0.4 }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#64748b' }}>Scroll to explore</span>
          <div style={{ width: 1, height: 32, background: 'linear-gradient(to bottom, #64748b, transparent)' }} />
        </div>
      </section>

      {/* ══ MARQUEE ══ */}
      <section style={{ background: '#0c1421', padding: '28px 0', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)', overflow: 'hidden' }}>
        <div style={{ overflow: 'hidden', width: '100%' }}>
          <div className="marquee-track">
            {[...PARTNERS, ...PARTNERS].map((p, i) => (
              <span key={i} style={{ fontSize: 13, fontWeight: 700, color: '#334155', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap', userSelect: 'none' }}>{p}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PROBLEM ══ */}
      <section id="problem" style={{ background: '#0e1726', padding: '120px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="pill-tag" style={{ marginBottom: 40 }}>The Problem</div>
          <div className="how-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }}>
            <div>
              <h2 style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.04em', color: '#f8fafc' }}>A $40B gap that<br />holds Africa back.</h2>
              <div style={{ height: 3, width: 48, background: '#c7f284', borderRadius: 99, margin: '28px 0' }} />
              <p style={{ fontSize: 32, fontWeight: 900, color: '#c7f284', letterSpacing: '-0.04em', lineHeight: 1 }}>30–90</p>
              <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>average days exporters wait for payment</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <p style={{ fontSize: 15, lineHeight: 1.75, color: '#94a3b8' }}>Across Africa, millions of exporters face a persistent liquidity constraint. Once goods are shipped, payments are delayed by 30 to 90 days — creating severe working capital pressure.</p>
              <p style={{ fontSize: 15, lineHeight: 1.75, color: '#94a3b8' }}>Existing trade finance solutions are slow, require significant collateral, and exclude many exporters. A <strong style={{ color: '#e2e8f0' }}>$40B+ trade finance gap</strong> limits economic growth across the continent.</p>
              <div style={{ background: '#1b2336', borderRadius: 14, padding: '18px 22px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: 14, color: '#c7f284', fontWeight: 700, marginBottom: 6 }}>One-line framing</p>
                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.65, fontStyle: 'italic' }}>"Exporters face delayed payments and limited capital access, while existing infrastructure has been too costly and slow to support scalable trade finance."</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ SOLUTION ══ */}
      <section id="solution" style={{ background: '#0c1421', padding: '100px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 60, flexWrap: 'wrap', gap: 20 }}>
            <h2 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.6rem)', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.04em', lineHeight: 1.1 }}>What InvoiceFi does.</h2>
            <p style={{ fontSize: 14, color: '#64748b', maxWidth: 300, lineHeight: 1.65 }}>Connecting exporters who need capital with global investors who want transparent, on-chain yield.</p>
          </div>
          {[
            { num: '01', title: 'Invoice Tokenisation', desc: 'Smart contracts on Ethereum mint tokens representing fractional ownership of each receivable — collateralised, auditable, settled on-chain.' },
            { num: '02', title: 'Liquidity Marketplace', desc: 'Investors browse tokenised invoices with risk scores, yield percentages, and tenor data. Capital flows in seconds, not weeks.' },
            { num: '03', title: 'On-Chain Settlement', desc: 'Smart contracts automatically distribute principal plus yield. Every transaction verifiable on Etherscan.' },
            { num: '04', title: 'Ethereum Infrastructure', desc: 'Battle-tested security with proven tooling — Hardhat, ethers.js, Etherscan verification. Ready for mainnet or any L2.' },
          ].map((s, i) => (
            <div key={i} className="service-row">
              <div style={{ fontSize: 'clamp(1rem,2vw,1.4rem)', fontWeight: 900, color: '#334155', fontFamily: 'monospace' }}>( {s.num} )</div>
              <div style={{ fontSize: 'clamp(1.3rem,2.5vw,2rem)', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.03em' }}>{s.title}</div>
              <div className="desc" style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section id="how" style={{ background: '#0e1726', padding: '120px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 70 }}>
            <div className="pill-tag" style={{ marginBottom: 20 }}>The Flow</div>
            <h2 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', fontWeight: 900, letterSpacing: '-0.04em', color: '#f8fafc' }}>How it works.</h2>
          </div>
          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {[
              { step: '1', icon: '📄', title: 'Exporter uploads invoice', body: 'The exporter submits a verified trade invoice. The invoice is scored for counterparty risk.' },
              { step: '2', icon: '⚡', title: 'Smart contract mints pool', body: 'Ethereum smart contracts create an investment pool. Each ETH invested represents a claim on the yield.' },
              { step: '3', icon: '💰', title: 'Investor funds the pool', body: 'Investors fund the pool via MetaMask. The exporter instantly receives capital — transparently on-chain.' },
              { step: '4', icon: '⏱️', title: 'Buyer pays at maturity', body: 'At maturity (30–90 days), the buyer settles the invoice. Funds flow into the smart contract.' },
              { step: '5', icon: '📈', title: 'Yield distributed', body: 'Smart contracts distribute principal + yield proportionally. Every TX on Sepolia\'s public ledger.' },
              { step: '6', icon: '🔄', title: 'Reinvest & grow', body: 'Reinvest returned capital across new invoices, compounding yield. Dashboard tracks all positions.' },
            ].map((c, i) => (
              <div key={i} className="feature-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <span style={{ fontSize: 28 }}>{c.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#334155', fontFamily: 'monospace' }}>0{c.step}</span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#e2e8f0', marginBottom: 10, lineHeight: 1.3 }}>{c.title}</h3>
                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7 }}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TECH ══ */}
      <section id="tech" style={{ background: '#0c1421', padding: '100px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="how-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
            <div>
              <div className="pill-tag" style={{ marginBottom: 24 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#627eea', display: 'inline-block' }} />
                Why Ethereum / Sepolia
              </div>
              <h2 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 24 }}>
                Infrastructure built<br />to scale<span style={{ color: '#c7f284' }}>.</span>
              </h2>
              <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.75, marginBottom: 28 }}>Sepolia testnet gives us battle-tested Ethereum tooling — Hardhat, ethers.js, Etherscan verification — with near-zero cost deployments.</p>
              <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.75 }}>Full EVM compatibility means InvoiceFi can migrate to mainnet or any L2 without changing a line of smart contract code.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { icon: '⚡', label: 'Confirmations', val: '~12 seconds', color: '#c7f284' },
                { icon: '🔒', label: 'Security', val: 'Battle-tested', color: '#627eea' },
                { icon: '🔗', label: 'Compatibility', val: 'Full EVM', color: '#22c55e' },
                { icon: '🔍', label: 'Verification', val: 'Etherscan', color: '#f59e0b' },
              ].map(c => (
                <div key={c.label} style={{ background: '#1b2336', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '24px 20px' }}>
                  <div style={{ fontSize: 24, marginBottom: 12 }}>{c.icon}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: c.color, marginBottom: 4 }}>{c.val}</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>{c.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ STATS ══ */}
      <section style={{ background: '#0e1726', padding: '100px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.6rem)', fontWeight: 900, letterSpacing: '-0.04em', color: '#f8fafc' }}>Built for real numbers.</h2>
          </div>
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {[
              { val: '$40B+', label: 'Trade finance gap', sub: 'Addressable market' },
              { val: '30–90d', label: 'Average payment delay', sub: 'Liquidity locked' },
              { val: '12–16%', label: 'Target yield', sub: 'Annualised return' },
              { val: '3 Pools', label: 'Live on Sepolia', sub: 'Deployed & investable' },
            ].map(s => (
              <div key={s.val} className="stat-card">
                <div style={{ fontSize: 'clamp(1.6rem,3vw,2.4rem)', fontWeight: 900, color: '#c7f284', letterSpacing: '-0.04em', lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginTop: 10 }}>{s.label}</div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section style={{ background: '#0c1421', padding: '100px 40px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <div className="pill-tag" style={{ marginBottom: 28 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#c7f284', display: 'inline-block', animation: 'pulse-dot 2s ease-in-out infinite' }} />
            Live Demo · Sepolia Testnet
          </div>
          <h2 style={{ fontSize: 'clamp(2rem,5vw,3.4rem)', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.04em', lineHeight: 1.08, marginBottom: 20 }}>
            We don't <em style={{ fontStyle: 'italic', color: '#c7f284' }}>just</em> tokenise invoices.
          </h2>
          <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.75, maxWidth: 540, margin: '0 auto 40px' }}>
            We build the financial infrastructure that African exporters have never had.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="cta-btn cta-btn-primary" style={{ fontSize: 15, padding: '14px 32px' }} onClick={() => navigate('/auth')}>Launch App →</button>
            <button className="cta-btn cta-btn-outline" style={{ fontSize: 15, padding: '14px 32px' }} onClick={() => scrollTo('problem')}>Read the Problem</button>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{ background: '#080d18', padding: '60px 40px 40px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 48, marginBottom: 60 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#c7f284,#9fc95e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="12" height="12" fill="none" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                </div>
                <span style={{ fontWeight: 800, fontSize: 14, color: '#e2e8f0' }}>InvoiceFi</span>
              </div>
              <p style={{ fontSize: 12, color: '#334155', lineHeight: 1.7, maxWidth: 200 }}>Blockchain-powered trade finance for African exporters and global investors.</p>
            </div>
            {[
              { heading: 'Platform', links: ['Dashboard', 'Invoice Marketplace', 'Portfolio'] },
              { heading: 'Technology', links: ['Sepolia Testnet', 'Smart Contracts', 'Etherscan'] },
              { heading: 'Company', links: ['Problem Statement', 'How It Works', 'Contact'] },
            ].map(col => (
              <div key={col.heading}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>{col.heading}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {col.links.map(l => (
                    <span key={l} style={{ fontSize: 13, color: '#475569', cursor: 'pointer', transition: 'color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#c7f284'}
                      onMouseLeave={e => e.currentTarget.style.color = '#475569'}
                    >{l}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ fontSize: 12, color: '#1e293b' }}>© 2026 InvoiceFi · Ethereum Sepolia · Live Demo</p>
            <div style={{ display: 'flex', gap: 16 }}>
              {['Privacy', 'Terms', 'GitHub'].map(l => (
                <span key={l} style={{ fontSize: 12, color: '#334155', cursor: 'pointer' }}>{l}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
