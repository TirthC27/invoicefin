import { motion } from 'framer-motion';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

/* ── Refined Dashboard Card ───────────────────────── */
const DashboardCard = ({ children, className = '', isDark = false, style = {} }) => (
  <motion.div
    variants={fadeUp}
    whileHover={{
      scale: isDark ? 1.05 : 1.02,
      boxShadow: isDark ? '0 20px 40px -10px rgba(34,197,94,0.3)' : '0 10px 25px -5px rgba(0,0,0,0.05)'
    }}
    className={`relative rounded-2xl h-full flex flex-col justify-between p-5 overflow-hidden transition-all duration-300 border ${isDark ? 'border-none' : 'border-gray-100'} ${className}`}
    style={{
      background: isDark
        ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
        : '#ffffff',
      color: isDark ? '#ffffff' : '#111827',
      boxShadow: isDark ? '0 10px 15px -3px rgba(34,197,94,0.2)' : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      ...style,
    }}
  >
    {children}
  </motion.div>
);

const Features = () => {
  return (
    <section
      id="features"
      className="w-full h-full flex items-center justify-center relative bg-transparent"
    >
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="w-full max-w-7xl mx-auto px-6 pointer-events-auto"
      >
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center px-4 py-1.5 rounded-full border border-green-100 bg-green-50/50 mb-4"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2" />
            <span className="text-xs font-bold text-green-700 uppercase tracking-widest">
              Digital Infrastructure
            </span>
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="text-gray-900"
            style={{
              fontFamily: "'Instrument Serif', 'Georgia', serif",
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 600,
              letterSpacing: '-1.5px',
              lineHeight: 1,
            }}
          >
            Digital Trade Ecosystem
          </motion.h2>
        </div>

        {/* REFINED MOSAIC GRID (4 cols, 2 rows) */}
        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-6 max-w-6xl mx-auto h-auto md:h-[540px] items-stretch">

          {/* Card 1: Smart Minting (1x1) */}
          <div className="md:col-span-1 md:row-span-1">
            <DashboardCard>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600 mb-1">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div className="text-xs font-bold text-green-600 uppercase tracking-wider opacity-90">Auto Mint</div>
                  <h3 className="text-lg font-semibold text-gray-900 leading-tight">Smart Minting</h3>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">Verified invoice tokenization with instant liquidity minting.</p>
              </div>
            </DashboardCard>
          </div>

          {/* Card 2: Liquidity Depth (1x1) */}
          <div className="md:col-span-1 md:row-span-1">
            <DashboardCard>
              <div className="flex flex-col gap-1">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600 mb-1">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v8M8 12h8" />
                  </svg>
                </div>
                <div className="text-xs font-bold text-green-600 uppercase tracking-wider opacity-90">Global pool</div>
                <h3 className="text-lg font-semibold text-gray-900 leading-tight">Liquidity Depth</h3>
              </div>
              <div className="mt-auto pt-2">
                <div className="text-4xl font-bold tracking-tight text-gray-900">$174.5M</div>
                <div className="text-sm text-gray-500 mt-1">Active Protocol Capital</div>
              </div>
            </DashboardCard>
          </div>

          {/* Card 3: Chainlink Verifier (2x1) */}
          <div className="md:col-span-2 md:row-span-1">
            <DashboardCard className="flex-row items-center justify-between gap-6">
              <div className="flex flex-col gap-3 flex-1 py-1">
                <div className="flex flex-col gap-1">
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600 mb-1">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
                    </svg>
                  </div>
                  <div className="text-xs font-bold text-green-600 uppercase tracking-wider opacity-90">Security</div>
                  <h3 className="text-lg font-semibold text-gray-900">Chainlink Verifier</h3>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed max-w-[280px]">Decentralized oracle consensus verifying trade receivables against ERP documentation at the edge.</p>
              </div>
              <div className="hidden lg:block w-36 h-36 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                <img src="/assets/verification.png" className="w-full h-full object-cover" />
              </div>
            </DashboardCard>
          </div>

          {/* Card 4: Instant Liquidity Engine (2x1) */}
          <div className="md:col-span-2 md:row-span-1">
            <DashboardCard className="flex-row items-center justify-between gap-6">
              <div className="flex flex-col gap-3 flex-1 py-1 text-left">
                <div className="flex flex-col gap-1">
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600 mb-1">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </div>
                  <div className="text-xs font-bold text-green-600 uppercase tracking-wider opacity-90">Settlement</div>
                  <h3 className="text-lg font-semibold text-gray-900">Instant Liquidity</h3>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed max-w-[280px]">Proprietary engine settling invoice tokens into USDC via deep AMM pools across chains.</p>
              </div>
              <div className="hidden lg:block w-36 h-36 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                <img src="/assets/dashboard.png" className="w-full h-full object-cover" />
              </div>
            </DashboardCard>
          </div>

          {/* Card 5: Oracle Confidence (1x1) */}
          <div className="md:col-span-1 md:row-span-1">
            <DashboardCard>
              <div className="flex flex-col gap-1">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600 mb-1">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div className="text-xs font-bold text-green-600 uppercase tracking-wider opacity-90">Protocol Trust</div>
                <h3 className="text-lg font-semibold text-gray-900 leading-tight">Oracle Confidence</h3>
              </div>
              <div className="mt-auto pt-2">
                <div className="text-4xl font-bold tracking-tight text-gray-900">99.9%</div>
                <div className="text-sm text-gray-500 mt-1">Verified Proof of Reserve</div>
              </div>
            </DashboardCard>
          </div>

          {/* Card 6: Expected Yield (1x1) */}
          <div className="md:col-span-1 md:row-span-1">
            <DashboardCard isDark={true}>
              <div className="flex flex-col gap-1">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white mb-1">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <div className="text-xs font-bold text-white uppercase tracking-wider opacity-80">Key Metric</div>
                <h3 className="text-lg font-semibold text-white leading-tight">Expected Yield</h3>
              </div>
              <div className="mt-auto pt-2">
                <div className="text-5xl font-bold tracking-tight text-white">14.2%</div>
                <div className="text-xs text-white/70 mt-1 font-medium border-t border-white/20 pt-2 flex items-center justify-between">
                  REAL-WORLD ASSET APY
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </DashboardCard>
          </div>

        </div>
      </motion.div>
    </section>
  );
};

export default Features;
