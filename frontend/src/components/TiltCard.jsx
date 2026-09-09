import React, { useRef, useState } from 'react';

/**
 * TiltCard — Reusable mouse-tracking 3D tilt & soft glare card wrapper component.
 *
 * Features:
 * - Wrap card in perspective: 900px container.
 * - Dynamic mouse tracking relative to card center with subtle rotateX/rotateY (max ~10-14deg).
 * - Radial glare overlay following cursor position.
 * - Dynamic box-shadow shift opposite tilt direction.
 * - Smooth reset on mouse leave.
 */
export default function TiltCard({
  children,
  className = '',
  style = {},
  maxTilt = 12,
  glare = true,
  onClick,
  ...props
}) {
  const cardRef = useRef(null);
  const [tiltStyle, setTiltStyle] = useState({
    transform: 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
    boxShadow: '0 18px 34px rgba(0, 0, 0, 0.16), 0 4px 10px rgba(0, 0, 0, 0.08)',
    transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.4s ease',
  });
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const percentX = (x - centerX) / centerX;
    const percentY = (y - centerY) / centerY;

    const rotateX = (-percentY * maxTilt).toFixed(2);
    const rotateY = (percentX * maxTilt).toFixed(2);

    const shadowX = (-percentX * 14).toFixed(1);
    const shadowY = (18 - percentY * 14).toFixed(1);

    setTiltStyle({
      transform: `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.015, 1.015, 1.015)`,
      boxShadow: `${shadowX}px ${shadowY}px 38px rgba(0, 0, 0, 0.22), 0 6px 14px rgba(0, 0, 0, 0.12)`,
      transition: 'transform 0.08s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.08s ease',
    });

    if (glare) {
      setGlarePos({
        x: Math.round(x),
        y: Math.round(y),
        opacity: 1,
      });
    }
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      boxShadow: '0 18px 34px rgba(0, 0, 0, 0.16), 0 4px 10px rgba(0, 0, 0, 0.08)',
      transition: 'transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.45s ease',
    });
    setGlarePos((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      style={{ perspective: '900px', width: '100%', height: '100%' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={cardRef}
        className={className}
        onClick={onClick}
        style={{
          transformStyle: 'preserve-3d',
          position: 'relative',
          ...style,
          ...tiltStyle,
        }}
        {...props}
      >
        {children}
        {glare && (
          <div
            className="tilt-glare-overlay"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 'inherit',
              pointerEvents: 'none',
              zIndex: 25,
              opacity: glarePos.opacity,
              background: `radial-gradient(circle at ${glarePos.x}px ${glarePos.y}px, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0) 65%)`,
              transition: 'opacity 0.25s ease',
            }}
          />
        )}
      </div>
    </div>
  );
}
