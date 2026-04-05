import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Hero from '../src/components/Hero';
import Features from './Features';
import HowItWorks from './HowItWorks';
// import CTASection from './CTASection';
import Footer from '../src/components/Footer';

/* ── Section definitions ────────────────────────────────── */
const sections = [
  { id: 'hero', Component: Hero, label: 'Home' },
  { id: 'features', Component: Features, label: 'Features' },
  { id: 'how-it-works', Component: HowItWorks, label: 'How It Works' },
  { id: 'cta', Component: CTASection, label: 'Get Started' },
  { id: 'footer', Component: Footer, label: 'Footer' },
];

/* ── Background gradients per section ───────────────────── */
const backgrounds = [
  'linear-gradient(160deg, #eaf7f0 0%, #e2f2e8 35%, #dff3e8 65%, #e4ece1 100%)',
  'linear-gradient(160deg, #dff0e4 0%, #d4e8d6 35%, #cbe0cd 65%, #c6dbc5 100%)',
  'linear-gradient(160deg, #d0e5d2 0%, #c2d9c0 35%, #b6ceb4 65%, #aec6ab 100%)',
  'linear-gradient(160deg, #c0d8bd 0%, #aecbaa 35%, #9fc09c 65%, #8fb690 100%)',
  'linear-gradient(160deg, #b0cba9 0%, #a0be9a 35%, #90af8b 65%, #82a37c 100%)',
];

/* ── Framer Motion variants ─────────────────────────────── */
const sectionVariants = {
  enter: (direction) => ({
    opacity: 0,
    y: direction > 0 ? 40 : -40,
    scale: 0.97,
  }),
  center: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  exit: (direction) => ({
    opacity: 0,
    y: direction > 0 ? -40 : 40,
    scale: 0.97,
  }),
};

const transitionConfig = {
  duration: 0.7,
  ease: [0.22, 1, 0.36, 1],
};

/* ── Navigation dots ────────────────────────────────────── */
const NavDots = ({ active, total, onDotClick }) => (
  <div
    style={{
      position: 'fixed',
      right: '2rem',
      top: '50%',
      transform: 'translateY(-50%)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      zIndex: 100,
    }}
  >
    {Array.from({ length: Math.max(0, total - 1) }).map((_, i) => (
      <button
        key={i}
        onClick={() => onDotClick(i)}
        aria-label={`Go to section ${i + 1}`}
        style={{
          width: active === i ? '10px' : '8px',
          height: active === i ? '10px' : '8px',
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
          background: active === i
            ? 'linear-gradient(135deg, #22c55e, #16a34a)'
            : 'rgba(34,197,94,0.2)',
          boxShadow: active === i
            ? '0 0 10px rgba(34,197,94,0.4)'
            : 'none',
        }}
      />
    ))}
  </div>
);

/* ── Main Landing Page ──────────────────────────────────── */
const LandingPage = () => {
  const [activeSection, setActiveSection] = useState(0);
  const [direction, setDirection] = useState(1);
  const isTransitioning = useRef(false);
  const lastWheelTime = useRef(0);
  const touchStartY = useRef(0);

  const totalSections = sections.length;

  /* ── Navigate to a section ─────────────────────────────── */
  const goToSection = useCallback(
    (index) => {
      if (isTransitioning.current) return;
      if (index < 0 || index >= totalSections) return;
      if (index === activeSection) return;

      isTransitioning.current = true;
      setDirection(index > activeSection ? 1 : -1);
      setActiveSection(index);

      // Lock transitions for the duration
      setTimeout(() => {
        isTransitioning.current = false;
      }, 800);
    },
    [activeSection, totalSections]
  );

  /* ── Wheel handler (debounced) ─────────────────────────── */
  useEffect(() => {
    const handleWheel = (e) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheelTime.current < 900) return;
      lastWheelTime.current = now;

      if (e.deltaY > 30) {
        goToSection(activeSection + 1);
      } else if (e.deltaY < -30) {
        goToSection(activeSection - 1);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [activeSection, goToSection]);

  /* ── Keyboard handler ──────────────────────────────────── */
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        goToSection(activeSection + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        goToSection(activeSection - 1);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeSection, goToSection]);

  /* ── Touch handler ─────────────────────────────────────── */
  useEffect(() => {
    const handleTouchStart = (e) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
      const deltaY = touchStartY.current - e.changedTouches[0].clientY;
      if (Math.abs(deltaY) > 50) {
        if (deltaY > 0) {
          goToSection(activeSection + 1);
        } else {
          goToSection(activeSection - 1);
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [activeSection, goToSection]);

  const ActiveComponent = sections[activeSection].Component;

  return (
    <div
      className="w-full h-screen overflow-hidden"
      style={{
        position: 'fixed',
        inset: 0,
      }}
    >
      {/* ── Animated background gradient ── */}
      <motion.div
        animate={{
          background: backgrounds[activeSection],
        }}
        transition={{ duration: 1.0, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
        }}
      />

      {/* ── Grid overlay ── */}
      <div
        className="grid-overlay"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      />

      {/* ── Section content with AnimatePresence ── */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={activeSection}
          custom={direction}
          variants={sectionVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={transitionConfig}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            willChange: 'transform, opacity',
          }}
        >
          <div className="w-full h-full flex items-center justify-center">
            <ActiveComponent />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── Navigation dots (hide on footer) ── */}
      {activeSection < totalSections - 1 && (
        <NavDots
          active={activeSection}
          total={totalSections}
          onDotClick={goToSection}
        />
      )}

      {/* ── Scroll hint (first section only) ── */}
      <AnimatePresence>
        {activeSection === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 2, duration: 0.6 }}
            style={{
              position: 'fixed',
              bottom: '2rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: 'rgba(34,197,94,0.5)',
              }}
            >
              Scroll to explore
            </span>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.8, ease: 'easeInOut', repeat: Infinity }}
            >
              <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
                <rect x="1" y="1" width="14" height="18" rx="7" stroke="rgba(34,197,94,0.35)" strokeWidth="1.5" />
                <motion.circle
                  cx="8"
                  cy="7"
                  r="2"
                  fill="rgba(34,197,94,0.5)"
                  animate={{ cy: [7, 12, 7] }}
                  transition={{ duration: 1.8, ease: 'easeInOut', repeat: Infinity }}
                />
              </svg>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingPage;
