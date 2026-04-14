import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';

/* ── Animation variants ──────────────────────────────── */
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.25 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
  },
};

const fadeIn = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.88, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 1.1, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ── 3D Pillar Visual ────────────────────────────────── */
const CenterVisual = () => {
  const pillars = [
    { h: 65, w: 28, delay: 0 },
    { h: 100, w: 28, delay: 0.08 },
    { h: 148, w: 34, delay: 0.16 },
    { h: 110, w: 28, delay: 0.24 },
    { h: 75, w: 28, delay: 0.32 },
  ];

  const pillarGradients = [
    'linear-gradient(180deg, rgba(134,239,172,0.45) 0%, rgba(74,222,128,0.55) 35%, rgba(34,197,94,0.7) 70%, rgba(22,163,74,0.85) 100%)',
    'linear-gradient(180deg, rgba(134,239,172,0.5) 0%, rgba(74,222,128,0.6) 35%, rgba(34,197,94,0.75) 70%, rgba(22,163,74,0.88) 100%)',
    'linear-gradient(180deg, rgba(110,231,183,0.5) 0%, rgba(52,211,153,0.6) 30%, rgba(34,197,94,0.8) 65%, rgba(21,128,61,0.92) 100%)',
    'linear-gradient(180deg, rgba(134,239,172,0.5) 0%, rgba(74,222,128,0.6) 35%, rgba(34,197,94,0.75) 70%, rgba(22,163,74,0.88) 100%)',
    'linear-gradient(180deg, rgba(134,239,172,0.45) 0%, rgba(74,222,128,0.55) 35%, rgba(34,197,94,0.7) 70%, rgba(22,163,74,0.85) 100%)',
  ];

  return (
    <div
      className="relative flex items-end justify-center"
      style={{ height: '240px', width: '100%', maxWidth: '300px', margin: '0 auto' }}
    >
      {/* Background glow */}
      <motion.div
        animate={{ opacity: [0.25, 0.5, 0.25], scale: [1, 1.08, 1] }}
        transition={{ duration: 4.5, ease: 'easeInOut', repeat: Infinity }}
        className="absolute pointer-events-none"
        style={{
          bottom: '22%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,197,94,0.2) 0%, rgba(34,197,94,0.05) 50%, transparent 70%)',
          filter: 'blur(28px)',
        }}
      />

      {/* Secondary glow ring */}
      <motion.div
        animate={{ opacity: [0.1, 0.25, 0.1], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 6, ease: 'easeInOut', repeat: Infinity, delay: 1 }}
        className="absolute pointer-events-none"
        style={{
          bottom: '30%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '260px',
          height: '260px',
          borderRadius: '50%',
          border: '1px solid rgba(34,197,94,0.08)',
          background: 'transparent',
        }}
      />

      {/* Floating + breathing pillars */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, ease: 'easeInOut', repeat: Infinity }}
        className="relative flex items-end justify-center"
        style={{ height: '180px', gap: '4px' }}
      >
        <motion.div
          animate={{ scale: [1, 1.012, 1] }}
          transition={{ duration: 6, ease: 'easeInOut', repeat: Infinity }}
          className="flex items-end justify-center"
          style={{ gap: '4px' }}
        >
          {pillars.map((p, i) => (
            <motion.div
              key={i}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: p.h, opacity: 1 }}
              transition={{
                duration: 1.1,
                delay: 0.5 + p.delay,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative overflow-hidden"
              style={{
                width: `${p.w}px`,
                borderRadius: '16px 16px 6px 6px',
                background: pillarGradients[i],
                border: '1px solid rgba(255,255,255,0.25)',
                boxShadow: i === 2
                  ? '0 4px 20px rgba(34,197,94,0.2), inset 0 1px 0 rgba(255,255,255,0.3)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.25)',
              }}
            >
              {/* Glass highlight */}
              <div
                className="absolute inset-x-0 top-0"
                style={{
                  height: '50%',
                  opacity: 0.35,
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 60%, transparent 100%)',
                }}
              />

              {/* Glow line */}
              <motion.div
                animate={{ opacity: [0.12, 0.45, 0.12] }}
                transition={{
                  duration: 3,
                  delay: i * 0.35,
                  ease: 'easeInOut',
                  repeat: Infinity,
                }}
                className="absolute"
                style={{
                  left: '50%',
                  transform: 'translateX(-50%)',
                  top: '10%',
                  width: '2px',
                  height: '40%',
                  borderRadius: '1px',
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.2) 60%, transparent 100%)',
                }}
              />

              {/* Shimmer sweep */}
              <motion.div
                animate={{ top: ['-30%', '120%'] }}
                transition={{
                  duration: 3.5,
                  delay: 1.5 + i * 0.5,
                  ease: 'easeInOut',
                  repeat: Infinity,
                  repeatDelay: 4,
                }}
                className="absolute pointer-events-none"
                style={{
                  left: 0,
                  right: 0,
                  height: '30%',
                  background:
                    'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
                }}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Person silhouette */}
        <div
          className="absolute"
          style={{ bottom: '2px', left: '50%', transform: 'translateX(-50%)' }}
        >
          <svg width="10" height="15" viewBox="0 0 14 22" fill="none" opacity="0.3">
            <circle cx="7" cy="4" r="3" fill="#2d5a27" />
            <path d="M7 8C4.5 8 2 10 2 13L5 22H9L12 13C12 10 9.5 8 7 8Z" fill="#2d5a27" />
          </svg>
        </div>
      </motion.div>

      {/* Platform base */}
      <div
        className="absolute"
        style={{
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '250px',
          height: '55px',
        }}
      >
        <div
          className="absolute"
          style={{
            bottom: '4px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            height: '36px',
            borderRadius: '50%',
            filter: 'blur(3px)',
            background:
              'radial-gradient(ellipse 100% 100% at 50% 50%, rgba(74,222,128,0.2) 0%, transparent 60%)',
          }}
        />
        <svg
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            opacity: 0.25,
          }}
          width="250"
          height="55"
          viewBox="0 0 250 55"
          fill="none"
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <ellipse
              key={`h-${i}`}
              cx="125"
              cy={42 - i * 4}
              rx={125 - i * 16}
              ry={10 - i * 0.7}
              stroke="rgba(34,197,94,0.35)"
              strokeWidth="0.5"
              fill="none"
            />
          ))}
          {[-3, -2, -1, 0, 1, 2, 3].map((i) => (
            <line
              key={`v-${i}`}
              x1={125 + i * 14}
              y1="12"
              x2={125 + i * 27}
              y2="50"
              stroke="rgba(34,197,94,0.2)"
              strokeWidth="0.5"
            />
          ))}
        </svg>
      </div>

      {/* Base mist */}
      <motion.div
        animate={{ opacity: [0.15, 0.35, 0.15] }}
        transition={{ duration: 5, ease: 'easeInOut', repeat: Infinity }}
        className="absolute pointer-events-none"
        style={{
          bottom: '14px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '200px',
          height: '24px',
          background:
            'radial-gradient(ellipse 100% 100% at 50% 80%, rgba(74,222,128,0.15) 0%, transparent 70%)',
          filter: 'blur(12px)',
        }}
      />
    </div>
  );
};

/* ── Hero Section ────────────────────────────────────── */
const Hero = () => {
  const navigate = useNavigate();

  return (
    <section
      className="w-full h-full flex items-center justify-center relative pointer-events-none"
      id="hero-section"
    >
      {/* Grid background overlay */}
      <div className="absolute inset-0 pointer-events-none grid-overlay" style={{ opacity: 0.6 }} />

      {/* Ambient blobs */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-10%',
          right: '-5%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 60%)',
          filter: 'blur(80px)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-10%',
          left: '-5%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(34,197,94,0.05) 0%, transparent 60%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Accent lines */}
      <div
        className="absolute pointer-events-none"
        style={{ top: '20%', left: 0, width: '100%', height: '1px', background: 'rgba(34,197,94,0.06)' }}
      />
      <div
        className="absolute pointer-events-none"
        style={{ top: '80%', left: 0, width: '100%', height: '1px', background: 'rgba(34,197,94,0.06)' }}
      />

      {/* ═══ GLOBAL CONTAINER ═══ */}
      <div
        className="w-full px-6 md:px-12 pointer-events-auto"
        style={{ maxWidth: '80rem', margin: '0 auto' }}
      >
        {/* ═══ UNIFIED OPEN LAYOUT (Navbar + Hero) ═══ */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 animate-hero-entrance"
        >
          {/* ── NAVBAR (open) ── */}
          <Navbar />

          <div style={{ height: '2rem' }} />

          {/* ── HERO CONTENT ── */}
          <div
            className="grid grid-cols-1 md:grid-cols-3 items-center"
            style={{ gap: '3rem', padding: '0 0.5rem' }}
          >
            {/* LEFT: Heading + Buttons */}
            <motion.div variants={fadeUp} style={{ minWidth: 0 }}>
              {/* Label */}
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="inline-flex items-center"
                style={{
                  gap: '0.5rem',
                  padding: '0.375rem 0.875rem',
                  borderRadius: '9999px',
                  background: 'rgba(34,197,94,0.08)',
                  border: '1px solid rgba(34,197,94,0.12)',
                  marginBottom: '1.25rem',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#22c55e',
                    boxShadow: '0 0 6px rgba(34,197,94,0.4)',
                  }}
                />
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: '#16a34a',
                  }}
                >
                  On-Chain Invoice Financing
                </span>
              </motion.div>

              {/* Heading */}
              <h1
                className="hero-heading"
                style={{
                  fontFamily: "'Instrument Serif', 'Georgia', serif",
                  fontSize: 'clamp(2rem, 3.8vw, 3rem)',
                  fontWeight: 600,
                  lineHeight: 1.08,
                  letterSpacing: '-0.6px',
                  color: '#111827',
                }}
              >
                Turn invoices
                <br />
                into{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 60%, #15803d 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  instant
                </span>
                <br />
                liquidity
              </h1>

              {/* Subtext */}
              <p
                style={{
                  marginTop: '1.25rem',
                  fontSize: '0.9rem',
                  color: '#6b7280',
                  lineHeight: 1.7,
                  maxWidth: '320px',
                }}
              >
                Tokenize export invoices into secure on-chain assets and access
                global capital without waiting 30–90 days.
              </p>

              {/* Buttons */}
              <div
                className="flex flex-wrap"
                style={{ gap: '0.875rem', marginTop: '2rem' }}
              >
                <motion.button
                  onClick={() => navigate('/auth')}
                  whileHover={{
                    scale: 1.05,
                    boxShadow: '0 8px 32px rgba(34,197,94,0.35)',
                  }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center no-underline btn-glow border-none cursor-pointer"
                  style={{
                    gap: '0.5rem',
                    padding: '0.875rem 1.875rem',
                    borderRadius: '9999px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    background:
                      'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    color: '#fff',
                    boxShadow: '0 4px 18px rgba(34,197,94,0.28)',
                    transition: 'all 0.3s',
                  }}
                >
                  Start Funding
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </motion.button>

                <motion.button
                  onClick={() => navigate('/auth')}
                  whileHover={{
                    scale: 1.05,
                    backgroundColor: 'rgba(34,197,94,0.07)',
                  }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center no-underline border-none cursor-pointer bg-white"
                  style={{
                    padding: '0.875rem 1.875rem',
                    borderRadius: '9999px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#16a34a',
                    border: '1.5px solid rgba(34,197,94,0.25)',
                    transition: 'all 0.3s',
                  }}
                >
                  Explore Marketplace
                </motion.button>
              </div>
            </motion.div>

            {/* CENTER: Illustration */}
            <motion.div
              variants={scaleIn}
              className="flex justify-center"
              style={{ minWidth: 0 }}
            >
              <CenterVisual />
            </motion.div>

            {/* RIGHT: Supporting Text + Stats */}
            <motion.div
              variants={fadeIn}
              style={{ minWidth: 0, maxWidth: '24rem' }}
            >
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
              >
                <p
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    color: '#1f2937',
                    lineHeight: 1.7,
                  }}
                >
                  With InvoiceFi, exporters unlock working capital instantly
                  while investors earn yield from real-world trade assets.
                </p>
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: '#9ca3af',
                    lineHeight: 1.7,
                  }}
                >
                  Powered by Chainlink verification and blockchain transparency,
                  every invoice is secure, verifiable, and trustless.
                </p>
              </div>

              {/* Stats */}
              <div
                className="flex"
                style={{
                  gap: '2.5rem',
                  marginTop: '1.75rem',
                  paddingTop: '1.75rem',
                  borderTop: '1px solid rgba(34,197,94,0.1)',
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2, duration: 0.5 }}
                >
                  <p
                    style={{
                      fontSize: '1.625rem',
                      fontWeight: 700,
                      color: '#111827',
                      letterSpacing: '-0.5px',
                    }}
                  >
                    <span
                      style={{
                        background:
                          'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      $40B
                    </span>
                  </p>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: '#9ca3af',
                      marginTop: '0.25rem',
                      fontWeight: 500,
                    }}
                  >
                    Trade finance gap
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.35, duration: 0.5 }}
                >
                  <p
                    style={{
                      fontSize: '1.625rem',
                      fontWeight: 700,
                      color: '#111827',
                      letterSpacing: '-0.5px',
                    }}
                  >
                    <span
                      style={{
                        background:
                          'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      30–90d
                    </span>
                  </p>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: '#9ca3af',
                      marginTop: '0.25rem',
                      fontWeight: 500,
                    }}
                  >
                    Payment delays
                  </p>
                </motion.div>
              </div>

              {/* Trust badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.6, duration: 0.6 }}
                className="flex items-center"
                style={{
                  gap: '0.75rem',
                  marginTop: '1.5rem',
                  paddingTop: '1rem',
                }}
              >
                <div className="flex" style={{ marginLeft: '0' }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        border: '2px solid rgba(255,255,255,0.8)',
                        background: `linear-gradient(135deg, hsl(${140 + i * 15}, 60%, ${65 - i * 8}%), hsl(${150 + i * 15}, 50%, ${55 - i * 8}%))`,
                        marginLeft: i > 0 ? '-8px' : 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.55rem',
                        fontWeight: 700,
                        color: '#fff',
                      }}
                    >
                      {['E', 'I', 'V'][i]}
                    </div>
                  ))}
                </div>
                <p
                  style={{
                    fontSize: '0.7rem',
                    color: '#9ca3af',
                    fontWeight: 500,
                  }}
                >
                  Trusted by <span style={{ color: '#6b7280', fontWeight: 600 }}>2,400+</span> exporters
                </p>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
