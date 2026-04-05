import { motion } from 'framer-motion';

/* ── Animation variants ──────────────────────────────── */
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.4,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
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
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 1, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ── Center Pillar Visual (SVG) ──────────────────────── */
const CenterVisual = () => {
  return (
    <motion.div
      variants={scaleIn}
      className="relative w-full flex items-end justify-center"
      style={{ height: '420px' }}
    >
      {/* Glow behind pillars */}
      <motion.div
        animate={{
          opacity: [0.4, 0.7, 0.4],
          scale: [1, 1.08, 1],
        }}
        transition={{
          duration: 4,
          ease: 'easeInOut',
          repeat: Infinity,
        }}
        className="absolute bottom-[25%] left-1/2 -translate-x-1/2 w-[350px] h-[350px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(74, 222, 128, 0.35) 0%, rgba(74, 222, 128, 0.08) 50%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Floating animation wrapper */}
      <motion.div
        animate={{
          y: [0, -12, 0],
        }}
        transition={{
          duration: 5,
          ease: 'easeInOut',
          repeat: Infinity,
        }}
        className="relative flex items-end justify-center gap-[6px]"
        style={{ height: '320px' }}
      >
        {/* Breathing scale */}
        <motion.div
          animate={{
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: 6,
            ease: 'easeInOut',
            repeat: Infinity,
          }}
          className="flex items-end justify-center gap-[6px]"
        >
          {/* Pillars - 5 rounded bars of varying heights */}
          {[
            { height: 140, delay: 0 },
            { height: 200, delay: 0.15 },
            { height: 280, delay: 0.3 },
            { height: 220, delay: 0.45 },
            { height: 160, delay: 0.6 },
          ].map((pillar, i) => (
            <motion.div
              key={i}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: pillar.height, opacity: 1 }}
              transition={{
                duration: 1.2,
                delay: 0.8 + pillar.delay,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative overflow-hidden"
              style={{
                width: i === 2 ? '58px' : '48px',
                borderRadius: '28px 28px 8px 8px',
                background: `linear-gradient(180deg, 
                  rgba(74, 222, 128, ${0.3 + i * 0.08}) 0%, 
                  rgba(34, 197, 94, ${0.5 + i * 0.06}) 40%,
                  rgba(22, 163, 74, ${0.65 + i * 0.05}) 100%)`,
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
              }}
            >
              {/* Inner light band */}
              <div
                className="absolute inset-x-0 top-0 h-full opacity-40"
                style={{
                  background: `linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 60%)`,
                }}
              />
              {/* Inner glow line */}
              <motion.div
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{
                  duration: 3,
                  delay: i * 0.5,
                  ease: 'easeInOut',
                  repeat: Infinity,
                }}
                className="absolute left-1/2 -translate-x-1/2 top-[15%] w-[2px] h-[40%] rounded-full"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, transparent 100%)',
                }}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Tiny person silhouette at base */}
        <div className="absolute bottom-[2px] left-1/2 -translate-x-1/2">
          <svg width="14" height="22" viewBox="0 0 14 22" fill="none" opacity="0.5">
            <circle cx="7" cy="4" r="3" fill="#2d5a27" />
            <path d="M7 8C4.5 8 2 10 2 13L5 22H9L12 13C12 10 9.5 8 7 8Z" fill="#2d5a27" />
          </svg>
        </div>
      </motion.div>

      {/* Ground / platform - perspective grid */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[550px]" style={{ height: '120px' }}>
        {/* Elliptical green ground */}
        <div
          className="absolute bottom-[10px] left-1/2 -translate-x-1/2 w-full"
          style={{
            height: '80px',
            background: 'radial-gradient(ellipse 100% 100% at 50% 50%, rgba(74, 222, 128, 0.35) 0%, rgba(34, 197, 94, 0.15) 40%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(2px)',
          }}
        />
        {/* Grid pattern overlay */}
        <svg
          className="absolute bottom-0 left-1/2 -translate-x-1/2"
          width="550"
          height="120"
          viewBox="0 0 550 120"
          fill="none"
          style={{ opacity: 0.4 }}
        >
          {/* Perspective grid lines - horizontal */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <ellipse
              key={`h-${i}`}
              cx="275"
              cy={85 - i * 8}
              rx={275 - i * 25}
              ry={20 - i * 1.5}
              stroke="rgba(34, 197, 94, 0.5)"
              strokeWidth="0.5"
              fill="none"
            />
          ))}
          {/* Vertical radial lines */}
          {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((i) => (
            <line
              key={`v-${i}`}
              x1={275 + i * 30}
              y1="25"
              x2={275 + i * 55}
              y2="105"
              stroke="rgba(34, 197, 94, 0.35)"
              strokeWidth="0.5"
            />
          ))}
        </svg>
      </div>

      {/* Green mist at base */}
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{
          duration: 5,
          ease: 'easeInOut',
          repeat: Infinity,
        }}
        className="absolute bottom-[40px] left-1/2 -translate-x-1/2 w-[400px] h-[80px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 100% 100% at 50% 80%, rgba(74, 222, 128, 0.3) 0%, transparent 70%)',
          filter: 'blur(20px)',
        }}
      />
    </motion.div>
  );
};

/* ── Hero Component ──────────────────────────────────── */
const Hero = () => {
  return (
    <section
      className="relative min-h-screen overflow-hidden"
      id="hero-section"
      style={{
        background: 'linear-gradient(180deg, #e8efe6 0%, #dfe9dc 50%, #e4ece1 100%)',
      }}
    >
      {/* Background grid pattern - full page */}
      <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.25 }}>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(34, 197, 94, 0.3)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Thin horizontal accent lines */}
      <div className="absolute top-[18%] left-0 w-full h-[1px] pointer-events-none" style={{ background: 'rgba(34, 197, 94, 0.12)' }} />
      <div className="absolute top-[82%] left-0 w-full h-[1px] pointer-events-none" style={{ background: 'rgba(34, 197, 94, 0.12)' }} />

      {/* Rounded container (the main content card) */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 mt-[96px] mb-6"
        style={{ margin: '96px 24px 24px 24px' }}
      >
        <div
          className="relative overflow-hidden rounded-[28px] px-10 sm:px-14 md:px-16 lg:px-20 pt-10 pb-14"
          style={{
            background: 'rgba(232, 239, 230, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
          }}
        >
          {/* Center Visual */}
          <div className="flex justify-center mb-6">
            <CenterVisual />
          </div>

          {/* Bottom content area - text + CTA */}
          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 lg:gap-20">
            {/* Left side - Label + Heading */}
            <div className="flex-1 max-w-[680px]">
              <motion.span
                variants={fadeIn}
                className="inline-block text-[0.68rem] font-bold tracking-[3px] uppercase text-[#1a1a1a] mb-5"
              >
                INVESTMENT FUND
              </motion.span>

              <motion.h1
                variants={fadeUp}
                className="text-[#1a1a1a] leading-[1.02] tracking-[-2.5px]"
                style={{
                  fontFamily: "'Instrument Serif', 'Georgia', serif",
                  fontSize: 'clamp(2.6rem, 5.5vw, 4.6rem)',
                  fontWeight: 400,
                }}
              >
                Build your future,
                <br />
                one step at a time
              </motion.h1>
            </div>

            {/* Right side - Description + CTA */}
            <div className="flex flex-col gap-6 max-w-[340px] lg:pb-1">
              <motion.div variants={fadeIn}>
                <p
                  className="font-medium text-[#1a1a1a] leading-[1.55] mb-2"
                  style={{ fontSize: '0.92rem' }}
                >
                  With NestGrowth Fund,
                  <br />
                  you'll see your savings grow steadily
                  <br />
                  over long years
                </p>
                <p className="text-[0.8rem] leading-[1.6]" style={{ color: '#7a7a7a' }}>
                  Giving you the confidence and stability you deserve for
                  <br />
                  your retirement years.
                </p>
              </motion.div>

              <motion.div variants={fadeUp}>
                <motion.a
                  href="#"
                  whileHover={{
                    scale: 1.05,
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)',
                  }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full text-[0.88rem] font-semibold no-underline"
                  style={{
                    background: '#1a1a1a',
                    color: '#ffffff',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
                  }}
                  id="hero-cta-primary"
                >
                  Get Started
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </motion.a>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;
