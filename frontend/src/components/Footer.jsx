import { motion } from 'framer-motion';

/* ── Stagger container ──────────────────────────────────── */
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const footerLinks = [
  {
    title: 'Product',
    links: ['Overview', 'Marketplace', 'Tokenomics', 'Documentation', 'Security'],
  },
  {
    title: 'Company',
    links: ['About Us', 'Careers', 'Blog', 'Contact', 'Partners'],
  },
  {
    title: 'Legal',
    links: ['Terms of Service', 'Privacy Policy', 'Cookie Policy', 'Disclaimer'],
  },
];

const Footer = () => {
  return (
    <footer
      id="footer"
      className="w-full h-full flex items-center justify-center relative pointer-events-none"
    >
      <div className="absolute inset-0 pointer-events-none grid-overlay" style={{ opacity: 0.25 }} />

      <motion.div 
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="w-full px-6 md:px-12 pointer-events-auto" 
        style={{ maxWidth: '80rem', margin: '0 auto' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-12" style={{ gap: '3rem' }}>
          {/* Brand Col */}
          <motion.div variants={fadeUp} className="md:col-span-4">
            <div className="flex items-center" style={{ gap: '0.625rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(34,197,94,0.3)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', letterSpacing: '-0.3px' }}>
                InvoiceFi
              </span>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.7, maxWidth: '280px' }}>
              Bridging traditional export finance with decentralized liquidity. The premium on-chain factoring protocol.
            </p>
            <div className="flex items-center mt-6" style={{ gap: '1rem' }}>
              {/* Social icons */}
              {['twitter', 'discord', 'github'].map((social) => (
                <a
                  key={social}
                  href="#"
                  style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#4b5563', transition: 'all 0.3s',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.color = '#16a34a'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.color = '#4b5563'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <span style={{ fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase' }}>{social.slice(0, 2)}</span>
                </a>
              ))}
            </div>
          </motion.div>

          {/* Links Cols */}
          <div className="md:col-span-8 grid grid-cols-2 md:grid-cols-3" style={{ gap: '2rem' }}>
            {footerLinks.map((group) => (
              <motion.div key={group.title} variants={fadeUp}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827', marginBottom: '1.25rem' }}>
                  {group.title}
                </h4>
                <ul className="flex flex-col gap-3">
                  {group.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        style={{ fontSize: '0.85rem', color: '#6b7280', transition: 'color 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.color = '#16a34a'}
                        onMouseOut={(e) => e.currentTarget.style.color = '#6b7280'}
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <motion.div
          variants={fadeUp}
          style={{
            marginTop: '4rem', paddingTop: '1.5rem',
            borderTop: '1px solid rgba(34,197,94,0.1)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
          }}
        >
          <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
            © {new Date().getFullYear()} InvoiceFi Protocol. All rights reserved.
          </p>
          <div className="flex items-center" style={{ gap: '0.375rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.4)' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#16a34a' }}>All systems operational</span>
          </div>
        </motion.div>
      </motion.div>
    </footer>
  );
};

export default Footer;
