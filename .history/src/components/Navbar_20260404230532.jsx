import { useState } from 'react';

const navItems = [
  { label: 'Services', hasDropdown: true },
  { label: 'How it Works', hasDropdown: true },
  { label: 'About', hasDropdown: true },
  { label: 'Contact', hasDropdown: true },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 w-full z-[100]" id="navbar">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 lg:px-14">
        <div
          className="flex items-center justify-between h-[64px] mt-4 px-7 rounded-full"
          style={{
            background: 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 2px 16px rgba(0, 0, 0, 0.03)',
          }}
        >
          {/* Logo */}
          <a href="#" className="flex items-center gap-2 no-underline" id="navbar-logo">
            <span className="text-[1.2rem] font-semibold tracking-[-0.5px] text-[#1a1a1a]">
              InvoiceFi
            </span>
          </a>

          {/* Center Nav Links */}
          <ul className="hidden md:flex items-center gap-1 list-none m-0 p-0" id="navbar-links">
            {navItems.map((item) => (
              <li key={item.label}>
                <a
                  href="#"
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-[0.85rem] font-medium text-[#4a4a4a] no-underline hover:text-[#1a1a1a] hover:bg-white/50"
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
          <a
            href="#"
            className="hidden md:inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-[0.85rem] font-semibold no-underline"
            style={{
              background: '#1a1a1a',
              color: '#ffffff',
              boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
            }}
            id="navbar-cta"
          >
            Get Started
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>

          {/* Mobile toggle */}
          <button
            className="md:hidden flex flex-col gap-[5px] bg-transparent border-none cursor-pointer p-1.5 z-[110]"
            id="navbar-toggle"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            <span
              className="block w-6 h-[2.5px] rounded bg-[#1a1a1a]"
              style={mobileOpen ? { transform: 'translateY(7.5px) rotate(45deg)', transition: 'transform 0.3s' } : { transition: 'transform 0.3s' }}
            />
            <span
              className="block w-6 h-[2.5px] rounded bg-[#1a1a1a]"
              style={mobileOpen ? { opacity: 0, transition: 'opacity 0.3s' } : { transition: 'opacity 0.3s' }}
            />
            <span
              className="block w-6 h-[2.5px] rounded bg-[#1a1a1a]"
              style={mobileOpen ? { transform: 'translateY(-7.5px) rotate(-45deg)', transition: 'transform 0.3s' } : { transition: 'transform 0.3s' }}
            />
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div
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
              className="text-[1.15rem] font-medium text-[#1a1a1a] px-7 py-3.5 rounded-full no-underline hover:bg-white/60"
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
        </div>
      )}
    </nav>
  );
};

export default Navbar;
