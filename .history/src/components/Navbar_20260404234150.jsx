import { useState } from 'react';
import { motion } from 'framer-motion';

const navItems = [
  { label: 'Service', hasDropdown: true },
  { label: 'Contact', hasDropdown: true },
  { label: 'Components', hasDropdown: true },
  { label: 'About', hasDropdown: true },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 w-full z-[100]"
      id="navbar"
    >
      <div className="max-w-[1400px] mx-auto px-8 md:px-12 lg:px-16">
        <div
          className="flex items-center justify-between h-[72px] mt-4 px-6 rounded-full"
          style={{
            background: 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 2px 20px rgba(0, 0, 0, 0.04)',
          }}
        >
          {/* Logo */}
          <a href="#" className="flex items-center gap-2 no-underline" id="navbar-logo">
            <span className="text-[1.25rem] font-semibold tracking-[-0.5px] text-[#1a1a1a]">
              NestGrowth
            </span>
          </a>

          {/* Center Nav Links */}
          <ul className="hidden md:flex items-center gap-1 list-none m-0 p-0" id="navbar-links">
            {navItems.map((item) => (
              <li key={item.label}>
                <a
                  href="#"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[0.88rem] font-medium text-[#4a4a4a] no-underline transition-all duration-200 hover:text-[#1a1a1a] hover:bg-white/60"
                >
                  {item.label}
                  {item.hasDropdown && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2.5 3.75L5 6.25L7.5 3.75" />
                    </svg>
                  )}
                </a>
              </li>
            ))}
          </ul>

          {/* CTA Button */}
          <motion.a
            href="#"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="hidden md:inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-[0.88rem] font-semibold no-underline transition-all duration-200"
            style={{
              background: '#1a1a1a',
              color: '#ffffff',
              boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
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
            className={`md:hidden flex flex-col gap-[5px] bg-transparent border-none cursor-pointer p-1.5 z-[110]`}
            id="navbar-toggle"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            <span
              className="block w-6 h-[2.5px] rounded bg-[#1a1a1a] transition-transform duration-300"
              style={mobileOpen ? { transform: 'translateY(7.5px) rotate(45deg)' } : {}}
            />
            <span
              className="block w-6 h-[2.5px] rounded bg-[#1a1a1a] transition-opacity duration-300"
              style={mobileOpen ? { opacity: 0 } : {}}
            />
            <span
              className="block w-6 h-[2.5px] rounded bg-[#1a1a1a] transition-transform duration-300"
              style={mobileOpen ? { transform: 'translateY(-7.5px) rotate(-45deg)' } : {}}
            />
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="md:hidden fixed inset-0 flex flex-col items-center justify-center gap-3 z-[105]"
          style={{
            background: 'rgba(232, 239, 230, 0.97)',
            backdropFilter: 'blur(24px)',
          }}
        >
          {navItems.map((item) => (
            <a
              key={item.label}
              href="#"
              className="text-[1.15rem] font-medium text-[#1a1a1a] px-7 py-3.5 rounded-full no-underline transition-all duration-200 hover:bg-white/60"
            >
              {item.label}
            </a>
          ))}
          <a
            href="#"
            className="mt-4 inline-flex items-center gap-2 px-8 py-3 rounded-full text-[0.95rem] font-semibold no-underline"
            style={{ background: '#1a1a1a', color: '#ffffff' }}
          >
            Get Started
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
