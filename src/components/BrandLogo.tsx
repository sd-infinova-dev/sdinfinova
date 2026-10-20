import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  monochrome?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = false,
  monochrome = false
}) => {
  const iconSizes = {
    sm: 'w-7 h-5',
    md: 'w-9 h-6',
    lg: 'w-14 h-9',
    xl: 'w-24 h-16'
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-4xl'
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Precision Dual-Loop Infinity Vector matching the official brand mark */}
      <svg
        viewBox="0 0 100 60"
        className={`${iconSizes[size]} shrink-0 transition-transform duration-300 group-hover:scale-105`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          {/* Metallic Gold / Bronze Gradient */}
          <linearGradient id="goldRibbon" x1="50" y1="10" x2="95" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f7d8ba" />
            <stop offset="40%" stopColor="#d89f66" />
            <stop offset="100%" stopColor="#b3783a" />
          </linearGradient>

          {/* Sapphire / Cyan Metallic Gradient */}
          <linearGradient id="blueRibbon" x1="5" y1="15" x2="50" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#70b4e8" />
            <stop offset="50%" stopColor="#2c72b8" />
            <stop offset="100%" stopColor="#1a4980" />
          </linearGradient>

          {/* Shadow Filter */}
          <filter id="ribbonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#d89f66" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Left Ribbon Loop (Deep Sapphire / Cyan) */}
        <path
          d="M 50 30 C 35 12, 10 12, 10 30 C 10 46, 32 46, 50 30"
          stroke={monochrome ? '#ffffff' : 'url(#blueRibbon)'}
          strokeWidth="8.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Right Ribbon Loop (Metallic Champagne Bronze/Gold) */}
        <path
          d="M 50 30 C 65 48, 90 48, 90 30 C 90 14, 68 14, 50 30"
          stroke={monochrome ? '#ffffff' : 'url(#goldRibbon)'}
          strokeWidth="8.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Arrow Tip on top-right pointing upwards-right */}
        <path
          d="M 75 14 L 88 12 L 86 24"
          stroke={monochrome ? '#ffffff' : '#70b4e8'}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Subtle sparkle accents */}
        <polygon points="78,8 80,11 83,11 81,13 82,16 79,14 76,16 77,13 75,11 78,11" fill="#f7e1b5" />
      </svg>

      <div className="flex flex-col">
        {/* Wordmark */}
        <div className={`font-display font-bold tracking-tight leading-none ${textSizes[size]}`}>
          <span className="text-[#f1f2f4]">SD </span>
          <span className="italic font-serif font-medium text-[#d89f66]">Infin</span>
          <span className="text-[#4b9be6] font-display">ova</span>
        </div>

        {/* Optional Tagline */}
        {showSubtitle && (
          <span className="text-[9px] uppercase tracking-[0.22em] text-[#9ca3af] font-medium mt-1">
            Engineering Infinite Possibilities
          </span>
        )}
      </div>
    </div>
  );
};
