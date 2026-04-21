export default function Logo({ size = 'md' }) {
  const sizes = {
    sm: { icon: 28, font: '1rem', gap: '0.5rem' },
    md: { icon: 36, font: '1.25rem', gap: '0.65rem' },
    lg: { icon: 48, font: '1.6rem', gap: '0.8rem' },
  };

  const s = sizes[size];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: s.gap }}>
      {/* Icon Mark */}
      <svg width={s.icon} height={s.icon} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="pluginGrad1" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6b2737" />
            <stop offset="100%" stopColor="#c4717e" />
          </linearGradient>
          <linearGradient id="pluginGrad2" x1="36" y1="0" x2="0" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#c4717e" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6b2737" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Background rounded square */}
        <rect width="36" height="36" rx="10" fill="url(#pluginGrad1)" />

        {/* Subtle inner glow */}
        <rect width="36" height="36" rx="10" fill="url(#pluginGrad2)" />

        {/* Plug icon — two prongs + body */}
        <rect x="15" y="7" width="3" height="7" rx="1.5" fill="white" opacity="0.95" />
        <rect x="21" y="7" width="3" height="7" rx="1.5" fill="white" opacity="0.95" />

        {/* Plug body */}
        <path
          d="M12 14h12v4a6 6 0 01-12 0v-4z"
          fill="white"
          opacity="0.95"
        />

        {/* Cord */}
        <path
          d="M18 24v2M16 26h4M18 28v1"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.9"
        />
      </svg>

      {/* Wordmark */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: s.font,
          fontWeight: 700,
          letterSpacing: '-0.04em',
          background: 'linear-gradient(135deg, #6b2737 0%, #c4717e 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          Plugin
        </span>
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.55rem',
          fontWeight: 500,
          letterSpacing: '0.15em',
          color: '#a08080',
          textTransform: 'uppercase',
          marginTop: '1px',
        }}>
          Booking
        </span>
      </div>
    </div>
  );
}
