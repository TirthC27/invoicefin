import { useState } from 'react';
import { motion } from 'framer-motion';

const navItems = [
  { label: 'Product' },
  { label: 'How it Works' },
  { label: 'Investors' },
  { label: 'Developers' },
  { label: 'Docs' },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="flex justify-between items-center"
        style={{ marginBottom: '4rem' }}
        id="navbar"
      >
        {/* Logo */}
        <a href="#" className="flex items-center no-underline" id="navbar-logo" style={{ gap: '0.6rem' }}>
          <div
            className="flex items-center justify-center"
            style={{
              width: '2rem', height: '2rem', borderRadius: '0.5rem',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 4h10M3 8h6M3 12h8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <span style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.3px', color: '#1a1a1a' }}>
            InvoiceFi
          </span>
        </a>

        {/* Nav Links */}
        <ul className="hidden md:flex items-center list-none" style={{ gap: '1.5rem', margin: 0, padding: 0 }} id="navbar-links">
          {navItems.map((item) => (
            <li key={item.label}>
              <a
                href="#"
                className="no-underline"
                style={{
                  fontSize: '0.85rem', fontWeight: 500, color: '#666',
                  transition: 'color 0.3s',
                }}
                onMouseEnter={(e) => e.target.style.color = '#1a1a1a'}
                onMouseLeave={(e) => e.target.style.color = '#666'}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <motion.a
          href="#"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="hidden md:inline-flex items-center no-underline"
          style={{
            gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '9999px',
            fontSize: '0.85rem', fontWeight: 600,
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            color: '#fff',
            boxShadow: '0 3px 14px rgba(34, 197, 94, 0.3)',
            transition: 'all 0.3s',
          }}
          id="navbar-cta"
        >
          Get Started
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </motion.a>

        {/* Mobile toggle */}
        <button
          className="md:hidden flex flex-col bg-transparent border-none cursor-pointer"
          style={{ gap: '5px', padding: '0.375rem', zIndex: 110 }}
          id="navbar-toggle"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle navigation"
        >
          <span style={{
            display: 'block', width: '1.5rem', height: '2.5px', borderRadius: '2px', background: '#1a1a1a',
            transition: 'transform 0.3s',
            ...(mobileOpen ? { transform: 'translateY(7.5px) rotate(45deg)' } : {}),
          }} />
          <span style={{
            display: 'block', width: '1.5rem', height: '2.5px', borderRadius: '2px', background: '#1a1a1a',
            transition: 'opacity 0.3s',
            ...(mobileOpen ? { opacity: 0 } : {}),
          }} />
          <span style={{
            display: 'block', width: '1.5rem', height: '2.5px', borderRadius: '2px', background: '#1a1a1a',
            transition: 'transform 0.3s',
            ...(mobileOpen ? { transform: 'translateY(-7.5px) rotate(-45deg)' } : {}),
          }} />
        </button>
      </motion.nav>

      {/* Mobile overlay */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden fixed inset-0 flex flex-col items-center justify-center z-[105]"
          style={{ gap: '1rem', background: 'rgba(232,239,230,0.97)', backdropFilter: 'blur(24px)' }}
        >
          {navItems.map((item) => (
            <a key={item.label} href="#" className="no-underline"
              style={{ fontSize: '1.15rem', fontWeight: 500, color: '#1a1a1a', padding: '0.75rem 1.75rem', borderRadius: '9999px', transition: 'all 0.3s' }}>
              {item.label}
            </a>
          ))}
          <a href="#" className="no-underline inline-flex items-center"
            style={{ marginTop: '1rem', gap: '0.5rem', padding: '0.75rem 2rem', borderRadius: '9999px', fontSize: '0.95rem', fontWeight: 600, background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff' }}>
            Get Started
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </motion.div>
      )}
    </>
  );
};

export default Navbar;
