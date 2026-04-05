/* ── Center Pillar Visual ──────────────────────────────── */
const CenterVisual = () => {
  const pillars = [
    { height: 120, width: 44 },
    { height: 175, width: 44 },
    { height: 240, width: 52 },
    { height: 190, width: 44 },
    { height: 140, width: 44 },
  ];

  return (
    <div
      className="relative w-full flex items-end justify-center"
      style={{ height: '360px' }}
    >
      {/* Subtle glow behind pillars */}
      <div
        className="absolute bottom-[22%] left-1/2 -translate-x-1/2 w-[280px] h-[280px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(74, 222, 128, 0.18) 0%, rgba(74, 222, 128, 0.05) 50%, transparent 70%)',
          filter: 'blur(30px)',
        }}
      />

      {/* Pillars container */}
      <div
        className="relative flex items-end justify-center gap-[5px]"
        style={{ height: '280px' }}
      >
        {pillars.map((pillar, i) => (
          <div
            key={i}
            className="relative overflow-hidden"
            style={{
              width: `${pillar.width}px`,
              height: `${pillar.height}px`,
              borderRadius: '24px 24px 6px 6px',
              background: `linear-gradient(180deg, 
                rgba(134, 239, 172, ${0.45 + i * 0.06}) 0%, 
                rgba(74, 222, 128, ${0.55 + i * 0.05}) 35%,
                rgba(34, 197, 94, ${0.7 + i * 0.04}) 70%,
                rgba(22, 163, 74, ${0.8 + i * 0.03}) 100%)`,
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            {/* Inner highlight */}
            <div
              className="absolute inset-x-0 top-0 h-full opacity-35"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, transparent 55%)',
              }}
            />
            {/* Center light line */}
            <div
              className="absolute left-1/2 -translate-x-1/2 top-[12%] w-[2px] h-[35%] rounded-full opacity-25"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, transparent 100%)',
              }}
            />
          </div>
        ))}

        {/* Tiny person silhouette */}
        <div className="absolute bottom-[2px] left-1/2 -translate-x-1/2">
          <svg width="12" height="20" viewBox="0 0 14 22" fill="none" opacity="0.45">
            <circle cx="7" cy="4" r="3" fill="#2d5a27" />
            <path d="M7 8C4.5 8 2 10 2 13L5 22H9L12 13C12 10 9.5 8 7 8Z" fill="#2d5a27" />
          </svg>
        </div>
      </div>

      {/* Ground platform */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[480px]" style={{ height: '100px' }}>
        {/* Elliptical green ground */}
        <div
          className="absolute bottom-[8px] left-1/2 -translate-x-1/2 w-full"
          style={{
            height: '70px',
            background: 'radial-gradient(ellipse 100% 100% at 50% 50%, rgba(74, 222, 128, 0.25) 0%, rgba(34, 197, 94, 0.1) 40%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(2px)',
          }}
        />
        {/* Grid pattern */}
        <svg
          className="absolute bottom-0 left-1/2 -translate-x-1/2"
          width="480"
          height="100"
          viewBox="0 0 480 100"
          fill="none"
          style={{ opacity: 0.35 }}
        >
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <ellipse
              key={`h-${i}`}
              cx="240"
              cy={72 - i * 7}
              rx={240 - i * 22}
              ry={18 - i * 1.3}
              stroke="rgba(34, 197, 94, 0.45)"
              strokeWidth="0.5"
              fill="none"
            />
          ))}
          {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((i) => (
            <line
              key={`v-${i}`}
              x1={240 + i * 26}
              y1="20"
              x2={240 + i * 48}
              y2="90"
              stroke="rgba(34, 197, 94, 0.3)"
              strokeWidth="0.5"
            />
          ))}
        </svg>
      </div>

      {/* Subtle mist */}
      <div
        className="absolute bottom-[35px] left-1/2 -translate-x-1/2 w-[350px] h-[60px] pointer-events-none opacity-40"
        style={{
          background: 'radial-gradient(ellipse 100% 100% at 50% 80%, rgba(74, 222, 128, 0.2) 0%, transparent 70%)',
          filter: 'blur(15px)',
        }}
      />
    </div>
  );
};

/* ── Hero Component ──────────────────────────────────── */
const Hero = () => {
  return (
    <section
      className="relative min-h-screen overflow-hidden"
      id="hero-section"
      style={{
        background: 'linear-gradient(180deg, #e8efe6 0%, #dfe9dc 50%, #e4ece1 100%)',
      }}
    >
      {/* Background grid pattern */}
      <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.2 }}>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(34, 197, 94, 0.25)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Thin horizontal accent lines */}
      <div className="absolute top-[18%] left-0 w-full h-[1px] pointer-events-none" style={{ background: 'rgba(34, 197, 94, 0.1)' }} />
      <div className="absolute top-[82%] left-0 w-full h-[1px] pointer-events-none" style={{ background: 'rgba(34, 197, 94, 0.1)' }} />

      {/* Rounded container */}
      <div
        className="relative z-10"
        style={{ margin: '92px 20px 20px 20px' }}
      >
        <div
          className="relative overflow-hidden rounded-[28px] px-8 sm:px-12 md:px-16 lg:px-20 pt-8 pb-12"
          style={{
            background: 'rgba(232, 239, 230, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.35)',
          }}
        >
          {/* Center Visual */}
          <div className="flex justify-center mb-4">
            <CenterVisual />
          </div>

          {/* Bottom content: left heading + right description */}
          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6 lg:gap-16">
            {/* Left: label + heading */}
            <div className="flex-1 min-w-0">
              <span
                className="inline-block text-[0.65rem] font-bold tracking-[2.5px] uppercase text-[#1a1a1a] mb-4"
              >
                INVOICE FINANCE
              </span>

              <h1
                className="text-[#1a1a1a] leading-[1.05] tracking-[-2px]"
                style={{
                  fontFamily: "'Instrument Serif', 'Georgia', serif",
                  fontSize: 'clamp(2.2rem, 4.8vw, 4.2rem)',
                  fontWeight: 400,
                }}
              >
                Unlock liquidity,
                <br />
                one invoice at a time
              </h1>
            </div>

            {/* Right: description + CTA */}
            <div className="flex flex-col gap-5 w-full lg:w-auto lg:max-w-[360px] lg:flex-shrink-0 lg:pb-1">
              <div>
                <p
                  className="font-medium text-[#1a1a1a] leading-[1.6] mb-2"
                  style={{ fontSize: '0.88rem' }}
                >
                  InvoiceFi enables exporters to access
                  <br className="hidden lg:block" />
                  {' '}instant capital by converting unpaid
                  <br className="hidden lg:block" />
                  {' '}invoices into liquid financial assets.
                </p>
              </div>

              <div>
                <a
                  href="#"
                  className="inline-flex items-center gap-2.5 px-7 py-3 rounded-full text-[0.85rem] font-semibold no-underline"
                  style={{
                    background: '#1a1a1a',
                    color: '#ffffff',
                    boxShadow: '0 3px 14px rgba(0, 0, 0, 0.12)',
                  }}
                  id="hero-cta-primary"
                >
                  Get Started
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
