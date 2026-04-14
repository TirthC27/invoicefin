import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

/**
 * ScrollSection — Cinematic crossfade wrapper.
 *
 * Each section is placed inside a tall container (height = scrollHeight).
 * The section itself is `position: sticky` so it sticks while the tall
 * container scrolls past.  Framer Motion's scroll-linked values drive
 * opacity, translateY, scale, and blur so that:
 *
 *   • The section fades IN  (opacity 0→1, y +40→0, scale 0.98→1)
 *     during the first scrollFraction of the container.
 *   • It stays fully visible in the middle.
 *   • It fades OUT (opacity 1→0, y 0→-40, scale 1→0.98, blur 0→4px)
 *     during the last scrollFraction.
 *
 * When two successive ScrollSections overlap, the outgoing one is fading
 * out at the same time the incoming one is fading in → crossfade effect.
 *
 * Props
 * ─────
 * @param {React.ReactNode} children        Section content
 * @param {string}          id              Section id
 * @param {string}          scrollHeight    CSS height of the outer scroll
 *                                          container (default '200vh')
 * @param {boolean}         isFirst         If true, skip fade-in (hero
 *                                          uses its own entrance animation)
 * @param {boolean}         isLast          If true, skip fade-out (footer
 *                                          stays visible at the end)
 * @param {string}          background      Background for the sticky layer
 */
const ScrollSection = ({
  children,
  id,
  scrollHeight = '200vh',
  isFirst = false,
  isLast = false,
  background = 'transparent',
}) => {
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  /* ── Combined enter + exit keyframes ────────────────── */
  // Single set of scroll-linked MotionValues that handle both
  // the fade-in (first 25%) and fade-out (last 30%) phases.
  // The middle portion stays fully visible.
  const opacity = useTransform(
    scrollYProgress,
    isFirst && isLast
      ? [0, 1]                         // only section
      : isFirst
        ? [0, 0.7, 1]                  // hero — no enter anim, exit anim
        : isLast
          ? [0, 0.25, 1]               // footer — enter anim, no exit
          : [0, 0.25, 0.7, 1],         // middle sections — both
    isFirst && isLast
      ? [1, 1]
      : isFirst
        ? [1, 1, 0]
        : isLast
          ? [0, 1, 1]
          : [0, 1, 1, 0]
  );

  const y = useTransform(
    scrollYProgress,
    isFirst && isLast
      ? [0, 1]
      : isFirst
        ? [0, 0.7, 1]
        : isLast
          ? [0, 0.25, 1]
          : [0, 0.25, 0.7, 1],
    isFirst && isLast
      ? [0, 0]
      : isFirst
        ? [0, 0, -40]
        : isLast
          ? [40, 0, 0]
          : [40, 0, 0, -40]
  );

  const scale = useTransform(
    scrollYProgress,
    isFirst && isLast
      ? [0, 1]
      : isFirst
        ? [0, 0.7, 1]
        : isLast
          ? [0, 0.25, 1]
          : [0, 0.25, 0.7, 1],
    isFirst && isLast
      ? [1, 1]
      : isFirst
        ? [1, 1, 0.98]
        : isLast
          ? [0.98, 1, 1]
          : [0.98, 1, 1, 0.98]
  );

  const blur = useTransform(
    scrollYProgress,
    isFirst && isLast
      ? [0, 1]
      : isFirst
        ? [0, 0.7, 1]
        : isLast
          ? [0, 0.25, 1]
          : [0, 0.25, 0.7, 1],
    isFirst && isLast
      ? [0, 0]
      : isFirst
        ? [0, 0, 6]
        : isLast
          ? [4, 0, 0]
          : [4, 0, 0, 6]
  );

  const filterBlur = useTransform(blur, (v) => `blur(${v}px)`);

  return (
    <div
      ref={containerRef}
      id={id}
      style={{
        height: scrollHeight,
        position: 'relative',
      }}
    >
      <motion.div
        style={{
          position: 'sticky',
          top: 0,
          width: '100%',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity,
          y,
          scale,
          filter: filterBlur,
          background,
          willChange: 'transform, opacity, filter',
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default ScrollSection;
