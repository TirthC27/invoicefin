import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const navItems = [
  { label: 'Product', href: '#features' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'Investors', href: '#investors' },
  { label: 'Developers', href: '#developers' },
  { label: 'Docs', href: '#docs' },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleGetStarted = (e) => {
    e.preventDefault();
    setMobileOpen(false);
    navigate('/auth');
  };

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="navbar-pill flex justify-between items-center"
        style={{
          marginBottom: '3rem',
          padding: '0.625rem 0.625rem 0.625rem 1.25rem',
          borderRadius: '9999px',
        }}
        id="navbar"
      >
        {/* Logo */}
        <a
          href="#"
          className="flex items-center no-underline gap-2 group"
          id="navbar-logo"
          onClick={(e) => { e.preventDefault(); navigate('/'); }}
        >
          <div
            className="flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
            style={{
              width: '2.25rem',
              height: '2.25rem',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
              color: '#ffffff'
            }}
          >
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
             </svg>
          </div>
          <span
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              letterSpacing: '-0.8px',
              color: '#111827',
            }}
          >
            InvoiceFi
          </span>
        </a>

        {/* Nav Links — centered */}
        <ul
          className="hidden md:flex items-center list-none"
          style={{ gap: '2rem', margin: 0, padding: 0 }}
          id="navbar-links"
        >
          {navItems.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                className="nav-link no-underline"
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  color: '#6b7280',
                  transition: 'color 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
                onMouseEnter={(e) => (e.target.style.color = '#111827')}
                onMouseLeave={(e) => (e.target.style.color = '#6b7280')}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <motion.button
          onClick={handleGetStarted}
          whileHover={{ scale: 1.05, boxShadow: '0 6px 24px rgba(34,197,94,0.35)' }}
          whileTap={{ scale: 0.96 }}
          className="hidden md:inline-flex items-center border-none cursor-pointer no-underline btn-glow"
          style={{
            gap: '0.5rem',
            padding: '0.625rem 1.375rem',
            borderRadius: '9999px',
            fontSize: '0.85rem',
            fontWeight: 600,
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            color: '#fff',
            boxShadow: '0 3px 14px rgba(34, 197, 94, 0.3)',
            transition: 'box-shadow 0.3s',
          }}
          id="navbar-cta"
        >
          Get Started
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

        {/* Mobile toggle */}
        <button
          className="md:hidden flex flex-col bg-transparent border-none cursor-pointer"
          style={{ gap: '5px', padding: '0.375rem', zIndex: 110 }}
          id="navbar-toggle"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle navigation"
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                display: 'block',
                width: '1.5rem',
                height: '2.5px',
                borderRadius: '2px',
                background: '#1a1a1a',
                transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1), opacity 0.25s',
                ...(mobileOpen && i === 0 ? { transform: 'translateY(7.5px) rotate(45deg)' } : {}),
                ...(mobileOpen && i === 1 ? { opacity: 0 } : {}),
                ...(mobileOpen && i === 2 ? { transform: 'translateY(-7.5px) rotate(-45deg)' } : {}),
              }}
            />
          ))}
        </button>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden fixed inset-0 flex flex-col items-center justify-center z-[105]"
            style={{
              gap: '0.75rem',
              background: 'rgba(234,247,240,0.97)',
              backdropFilter: 'blur(24px)',
            }}
          >
            {navItems.map((item, i) => (
              <motion.a
                key={item.label}
                href={item.href}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i, duration: 0.4 }}
                className="no-underline"
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 500,
                  color: '#111827',
                  padding: '0.75rem 1.75rem',
                  borderRadius: '9999px',
                  transition: 'background 0.3s',
                }}
                onClick={() => setMobileOpen(false)}
                onMouseEnter={(e) => (e.target.style.background = 'rgba(34,197,94,0.06)')}
                onMouseLeave={(e) => (e.target.style.background = 'transparent')}
              >
                {item.label}
              </motion.a>
            ))}
            <motion.button
              onClick={handleGetStarted}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="no-underline inline-flex items-center border-none cursor-pointer"
              style={{
                marginTop: '1rem',
                gap: '0.5rem',
                padding: '0.75rem 2rem',
                borderRadius: '9999px',
                fontSize: '0.95rem',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(34,197,94,0.3)',
              }}
            >
              Get Started
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
