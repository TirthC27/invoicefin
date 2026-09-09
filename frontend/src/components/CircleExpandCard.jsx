import React from 'react';

/**
 * CircleExpandCard — Card component with a smooth expanding dark circle hover background.
 *
 * - Originates from a fixed top-right point.
 * - Circle expands smoothly on hover.
 * - Text color transitions from black (#111111) to white (#ffffff) synchronized as the circle sweeps over the content.
 */
export default function CircleExpandCard({
  children,
  className = '',
  style = {},
  onClick,
  circleColor = '#1c1e1c',
  ...props
}) {
  return (
    <div
      className={`circle-expand-card ${className}`}
      onClick={onClick}
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
      {...props}
    >
      <div
        className="circle-expand-bg"
        style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: circleColor,
          transformOrigin: 'center center',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <div className="circle-expand-content" style={{ position: 'relative', zIndex: 2, height: '100%' }}>
        {children}
      </div>
    </div>
  );
}
