import { motion } from 'framer-motion';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const StepCard = ({ num, title, desc, icon }) => (
  <motion.div
    variants={fadeUp}
    whileHover="hover"
    initial="initial"
    className="relative group cursor-pointer"
    style={{
      background: '#ffffff',
      borderRadius: '1.25rem',
      padding: '1.75rem',
      border: '1px solid #f3f4f6',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1,
      overflow: 'hidden',
    }}
    variants={{
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
      hover: { 
        scale: 1.03, 
        boxShadow: '0 20px 40px -10px rgba(34,197,94,0.12)',
        transition: { duration: 0.3, ease: 'easeInOut' }
      }
    }}
  >
    {/* Inner Green Overlay */}
    <motion.div
      className="absolute inset-0 z-[-1]"
      style={{
        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        opacity: 0,
        borderRadius: '1.25rem',
      }}
      variants={{
        hover: { opacity: 1 }
      }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    />

    {/* Content */}
    <div className="relative z-10 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <motion.div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: '#f0fdf4',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          variants={{
            hover: { backgroundColor: 'rgba(255,255,255,0.2)', color: '#ffffff' }
          }}
          transition={{ duration: 0.3 }}
        >
          {icon}
        </motion.div>
        
        <motion.span
          style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(34,197,94,0.3)', letterSpacing: '0.1em' }}
          variants={{
            hover: { color: 'rgba(255,255,255,0.4)', transition: { duration: 0.3 } }
          }}
        >
          STEP {num}
        </motion.span>
      </div>

      <motion.h3
        style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', marginBottom: '0.75rem' }}
        variants={{ hover: { color: '#ffffff' } }}
        transition={{ duration: 0.3 }}
      >
        {title}
      </motion.h3>

      <motion.p
        style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.6 }}
        variants={{ hover: { color: 'rgba(255,255,255,0.9)' } }}
        transition={{ duration: 0.3 }}
      >
        {desc}
      </motion.p>
      
      <div className="mt-auto pt-6 flex items-center justify-end">
         <motion.div 
           className="w-8 h-8 rounded-full flex items-center justify-center"
           style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}
           variants={{ hover: { backgroundColor: 'rgba(255,255,255,0.2)', color: '#ffffff' } }}
         >
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
             <path d="M5 12h14M12 5l7 7-7 7" />
           </svg>
         </motion.div>
      </div>
    </div>
  </motion.div>
);

const HowItWorks = () => {
  return (
    <section
      id="how-it-works"
      className="w-full h-full flex items-center justify-center relative bg-transparent"
    >
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="w-full px-6 md:px-12 pointer-events-auto"
        style={{ maxWidth: '80rem', margin: '0 auto' }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center"
            style={{
              gap: '0.5rem', padding: '0.4rem 1rem',
              borderRadius: '9999px', background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.1)', marginBottom: '1rem',
            }}
          >
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: '#22c55e',
            }} />
            <span style={{
              fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.1em', color: '#16a34a',
            }}>
              Four Step Flow
            </span>
          </motion.div>

          <motion.h2
            variants={fadeUp}
            style={{
              fontFamily: "'Instrument Serif', 'Georgia', serif",
              fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
              fontWeight: 600, color: '#111827', letterSpacing: '-1px', lineHeight: 1,
            }}
          >
            Invoice to Liquid Asset
          </motion.h2>
          
          <motion.p
            variants={fadeUp}
            style={{
              marginTop: '1.25rem', fontSize: '1rem', color: '#6b7280',
              lineHeight: 1.6, maxWidth: '540px', margin: '1.25rem auto 0',
            }}
          >
            Our streamlined process bridges the divide between real-world trade finance and decentralized liquid markets.
          </motion.p>
        </div>

        {/* Regular 4-column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StepCard 
            num="01"
            title="Upload"
            desc="Exporters submit verified export invoices for secure protocol processing."
            icon={(
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            )}
          />

          <StepCard 
            num="02"
            title="Verify"
            desc="Chainlink Oracle's verify every data point to ensure total asset security."
            icon={(
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            )}
          />

          <StepCard 
            num="03"
            title="Mint"
            desc="Receivables are tokenized into yield-bearing ERC-20 protocol tokens."
            icon={(
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v12M8 10h8M8 14h8" />
              </svg>
            )}
          />

          <StepCard 
            num="04"
            title="Finance"
            desc="Access instant capital from global markets. No more 90-day waiting."
            icon={(
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            )}
          />
        </div>
      </motion.div>
    </section>
  );
};

export default HowItWorks;
