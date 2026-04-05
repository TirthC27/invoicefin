import { motion } from 'framer-motion';
import Navbar from './Navbar';

/* ── Animation variants ──────────────────────────────── */
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15, delayChildren: 0.3 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.8, ease: 'easeInOut' },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1, scale: 1,
    transition: { duration: 1, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ── Pillar Visual ───────────────────────────────────── */
const CenterVisual = () => {
  const pillars = [
    { h: 70, w: 30 },
    { h: 105, w: 30 },
    { h: 145, w: 36 },
    { h: 115, w: 30 },
    { h: 80, w: 30 },
  ];

  return (
    <div className="relative flex items-end justify-center" style={{ height: '220px', width: '100%', maxWidth: '280px', margin: '0 auto' }}>
      {/* Glow */}
      <motion.div
        animate={{ opacity: [0.3, 0.55, 0.3], scale: [1, 1.05, 1] }}
        transition={{ duration: 4, ease: 'easeInOut', repeat: Infinity }}
        className="absolute pointer-events-none"
        style={{
          bottom: '20%', left: '50%', transform: 'translateX(-50%)',
          width: '180px', height: '180px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,197,94,0.22) 0%, transparent 60%)',
          filter: 'blur(25px)',
        }}
      />

      {/* Floating + breathing pillars */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 5, ease: 'easeInOut', repeat: Infinity }}
        className="relative flex items-end justify-center"
        style={{ height: '170px', gap: '3px' }}
      >
        <motion.div
          animate={{ scale: [1, 1.01, 1] }}
          transition={{ duration: 6, ease: 'easeInOut', repeat: Infinity }}
          className="flex items-end justify-center"
          style={{ gap: '3px' }}
        >
          {pillars.map((p, i) => (
            <motion.div
              key={i}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: p.h, opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden"
              style={{
                width: `${p.w}px`,
                borderRadius: '18px 18px 5px 5px',
                background: `linear-gradient(180deg, 
                  rgba(134,239,172,${0.4 + i * 0.06}) 0%, 
                  rgba(74,222,128,${0.5 + i * 0.05}) 35%,
                  rgba(34,197,94,${0.65 + i * 0.04}) 70%,
                  rgba(22,163,74,${0.8 + i * 0.03}) 100%)`,
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <div className="absolute inset-x-0 top-0 h-full"
                style={{ opacity: 0.3, background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 50%)' }} />
              <motion.div
                animate={{ opacity: [0.15, 0.4, 0.15] }}
                transition={{ duration: 3, delay: i * 0.3, ease: 'easeInOut', repeat: Infinity }}
                className="absolute rounded-full"
                style={{
                  left: '50%', transform: 'translateX(-50%)',
                  top: '12%', width: '2px', height: '35%',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, transparent 100%)',
                }}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Person */}
        <div className="absolute" style={{ bottom: '1px', left: '50%', transform: 'translateX(-50%)' }}>
          <svg width="9" height="14" viewBox="0 0 14 22" fill="none" opacity="0.35">
            <circle cx="7" cy="4" r="3" fill="#2d5a27" />
            <path d="M7 8C4.5 8 2 10 2 13L5 22H9L12 13C12 10 9.5 8 7 8Z" fill="#2d5a27" />
          </svg>
        </div>
      </motion.div>

      {/* Platform */}
      <div className="absolute" style={{ bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '240px', height: '55px' }}>
        <div className="absolute" style={{
          bottom: '4px', left: '50%', transform: 'translateX(-50%)', width: '100%',
          height: '36px', borderRadius: '50%', filter: 'blur(2px)',
          background: 'radial-gradient(ellipse 100% 100% at 50% 50%, rgba(74,222,128,0.2) 0%, transparent 60%)',
        }} />
        <svg style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', opacity: 0.3 }}
          width="240" height="55" viewBox="0 0 240 55" fill="none">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <ellipse key={`h-${i}`} cx="120" cy={42 - i * 4} rx={120 - i * 15} ry={10 - i * 0.7}
              stroke="rgba(34,197,94,0.4)" strokeWidth="0.5" fill="none" />
          ))}
          {[-3, -2, -1, 0, 1, 2, 3].map(i => (
            <line key={`v-${i}`} x1={120 + i * 14} y1="12" x2={120 + i * 26} y2="50"
              stroke="rgba(34,197,94,0.25)" strokeWidth="0.5" />
          ))}
        </svg>
      </div>

      {/* Mist */}
      <motion.div
        animate={{ opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 5, ease: 'easeInOut', repeat: Infinity }}
        className="absolute pointer-events-none"
        style={{
          bottom: '16px', left: '50%', transform: 'translateX(-50%)',
          width: '180px', height: '28px',
          background: 'radial-gradient(ellipse 100% 100% at 50% 80%, rgba(74,222,128,0.18) 0%, transparent 70%)',
          filter: 'blur(10px)',
        }}
      />
    </div>
  );
};

/* ── Hero (Unified Card with Navbar) ─────────────────── */
const Hero = () => {
  return (
    <section
      className="relative overflow-hidden"
      id="hero-section"
      style={{
        paddingTop: '1.25rem',
        paddingBottom: '1.25rem',
        background: 'linear-gradient(180deg, #eaf7f0 0%, #dff3e8 50%, #e4ece1 100%)',
      }}
    >
      {/* Grid background */}
      <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.18 }}>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(34,197,94,0.25)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Accent lines */}
      <div className="absolute pointer-events-none" style={{ top: '18%', left: 0, width: '100%', height: '1px', background: 'rgba(34,197,94,0.08)' }} />
      <div className="absolute pointer-events-none" style={{ top: '82%', left: 0, width: '100%', height: '1px', background: 'rgba(34,197,94,0.08)' }} />

      {/* ═══ GLOBAL CONTAINER ═══ */}
      <div className="px-6 md:px-12" style={{ maxWidth: '80rem', margin: '0 auto' }}>

        {/* ═══ UNIFIED CARD (Navbar + Hero) ═══ */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10"
          style={{
            borderRadius: '1.5rem',
            padding: '1.5rem 2.5rem 2.5rem 2.5rem',
            background: 'linear-gradient(135deg, rgba(234,247,240,0.7) 0%, rgba(255,255,255,0.4) 50%, rgba(223,243,232,0.55) 100%)',
            border: '1px solid rgba(255,255,255,0.5)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          {/* Blurred green glow behind illustration */}
          <div className="absolute pointer-events-none" style={{
            top: '55%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '24rem', height: '24rem', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }} />

          {/* ── NAVBAR (inside card) ── */}
          <Navbar />

          {/* ── HERO CONTENT ── */}
          {/* 3-COLUMN GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 items-center" style={{ gap: '3rem' }}>

            {/* LEFT: Heading + Buttons */}
            <motion.div variants={fadeUp} style={{ minWidth: 0 }}>
              {/* Label */}
              <p style={{
                fontSize: '0.75rem', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.15em',
                color: '#16a34a', marginBottom: '0.75rem',
              }}>
                On-Chain Invoice Financing
              </p>

              {/* Heading */}
              <h1 style={{
                fontFamily: "'Instrument Serif', 'Georgia', serif",
                fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
                fontWeight: 600,
                lineHeight: 1.1,
                letterSpacing: '-0.5px',
                color: '#1a1a1a',
              }}>
                Turn invoices
                <br />
                into instant
                <br />
                liquidity
              </h1>

              {/* Subtext */}
              <p style={{
                marginTop: '1rem', fontSize: '0.875rem',
                color: '#666', lineHeight: 1.65,
              }}>
                Tokenize export invoices into secure on-chain assets and access global capital without waiting 30–90 days.
              </p>

              {/* Buttons */}
              <div className="flex flex-wrap" style={{ gap: '1rem', marginTop: '2rem', padding: '0.25rem' }}>
                <motion.a
                  href="#"
                  whileHover={{ scale: 1.04, boxShadow: '0 8px 28px rgba(34,197,94,0.35)' }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center no-underline"
                  style={{
                    gap: '0.5rem', padding: '0.875rem 1.875rem',
                    borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600,
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    color: '#fff',
                    boxShadow: '0 4px 16px rgba(34,197,94,0.25)',
                    transition: 'all 0.3s',
                  }}
                  id="hero-cta-primary"
                >
                  Start Funding
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </motion.a>

                <motion.a
                  href="#"
                  whileHover={{ scale: 1.04, backgroundColor: 'rgba(34,197,94,0.08)' }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center no-underline"
                  style={{
                    padding: '0.875rem 1.875rem',
                    borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600,
                    color: '#16a34a',
                    border: '1.5px solid rgba(34,197,94,0.3)',
                    transition: 'all 0.3s',
                  }}
                  id="hero-cta-secondary"
                >
                  Explore Marketplace
                </motion.a>
              </div>
            </motion.div>

            {/* CENTER: Illustration */}
            <motion.div variants={scaleIn} className="flex justify-center" style={{ minWidth: 0 }}>
              <CenterVisual />
            </motion.div>

            {/* RIGHT: Supporting Text */}
            <motion.div variants={fadeIn} style={{ minWidth: 0, maxWidth: '24rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#2a2a2a', lineHeight: 1.65 }}>
                  With InvoiceFi, exporters unlock working capital instantly while investors earn yield from real-world trade assets.
                </p>
                <p style={{ fontSize: '0.875rem', color: '#888', lineHeight: 1.65 }}>
                  Powered by Chainlink verification and blockchain transparency, every invoice is secure, verifiable, and trustless.
                </p>
              </div>

              {/* Stats */}
              <div className="flex" style={{ gap: '2.5rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(34,197,94,0.12)' }}>
                <div>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a1a1a' }}>$40B</p>
                  <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.25rem' }}>Trade finance gap</p>
                </div>
                <div>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a1a1a' }}>30-90d</p>
                  <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.25rem' }}>Payment delays</p>
                </div>
              </div>
            </motion.div>

          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
