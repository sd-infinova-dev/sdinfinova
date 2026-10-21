import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  monochrome?: boolean;
  variant?: 'emblem-text' | 'full' | 'emblem-only';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = false,
  monochrome = false,
  variant = 'emblem-text'
}) => {
  // Height and sizing scales
  const emblemSizes = {
    sm: 'h-6 w-auto max-w-[48px]',
    md: 'h-8 w-auto max-w-[62px]',
    lg: 'h-12 w-auto max-w-[94px]',
    xl: 'h-20 w-auto max-w-[155px]'
  };

  const fullLogoSizes = {
    sm: 'h-7 w-auto',
    md: 'h-10 w-auto',
    lg: 'h-16 w-auto',
    xl: 'h-24 w-auto'
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-3xl',
    xl: 'text-5xl'
  };

  const subtitleSizes = {
    sm: 'text-[8px]',
    md: 'text-[9.5px]',
    lg: 'text-xs',
    xl: 'text-sm'
  };

  // If user requests full official brand lockup variant
  if (variant === 'full') {
    return (
      <div className={`inline-flex items-center select-none group ${className}`}>
        <img
          src="/assets/sdinfinova-full-transparent.png"
          alt="SD Infinova"
          className={`${fullLogoSizes[size]} object-contain drop-shadow-[0_4px_12px_rgba(200,130,79,0.2)] transition-transform duration-300 group-hover:scale-[1.03]`}
          loading="eager"
        />
      </div>
    );
  }

  // If user requests emblem-only mark
  if (variant === 'emblem-only') {
    return (
      <div className={`inline-flex items-center justify-center select-none group ${className}`}>
        <img
          src="/assets/sdinfinova-emblem-transparent.png"
          alt="SD Infinova Infinity Mark"
          className={`${emblemSizes[size]} object-contain drop-shadow-[0_4px_14px_rgba(200,130,79,0.25)] transition-transform duration-300 group-hover:scale-105`}
          loading="eager"
        />
      </div>
    );
  }

  // Default: emblem + signature script typography lockup
  return (
    <div className={`inline-flex items-center gap-2.5 sm:gap-3 select-none group ${className}`}>
      {/* Official 3D Metallic Infinity Emblem (Human Crest, Ocean Blue Loop, Bronze Copper Loop, Ascending Arrow, Sparkle Stars) */}
      <div className="relative shrink-0 flex items-center justify-center">
        {/* Subtle aura behind emblem */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#c8824f]/20 to-[#244b78]/20 blur-md rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <img
          src="/assets/sdinfinova-emblem-transparent.png"
          alt="SD Infinova Emblem"
          className={`${emblemSizes[size]} object-contain drop-shadow-[0_2px_8px_rgba(200,130,79,0.28)] transition-transform duration-300 group-hover:scale-105`}
          loading="eager"
        />
      </div>

      <div className="flex flex-col justify-center">
        {/* Typographic Script Wordmark matching the official brand signature */}
        <div className={`font-display font-bold tracking-tight leading-none flex items-baseline ${textSizes[size]}`}>
          {/* SD */}
          <span className="text-[#f3f4f6] font-display tracking-tight mr-1">
            SD
          </span>
          
          {/* Infin in Metallic Copper / Bronze Script */}
          <span
            className="font-serif italic font-bold tracking-normal bg-gradient-to-r from-[#f5caa6] via-[#c8824f] to-[#ad6839] bg-clip-text text-transparent drop-shadow-[0_1px_3px_rgba(200,130,79,0.35)]"
            style={{ textShadow: '0 2px 8px rgba(200, 130, 79, 0.15)' }}
          >
            Infin
          </span>

          {/* nova in Metallic Steel Navy Script */}
          <span
            className="font-serif italic font-bold tracking-normal bg-gradient-to-r from-[#4d86c4] via-[#2d5b91] to-[#1c3c66] bg-clip-text text-transparent drop-shadow-[0_1px_3px_rgba(45,91,145,0.3)] ml-[1px]"
            style={{ textShadow: '0 2px 8px rgba(45, 91, 145, 0.2)' }}
          >
            ova
          </span>
        </div>

        {/* Optional Tagline */}
        {showSubtitle && (
          <span className={`${subtitleSizes[size]} uppercase tracking-[0.22em] text-[#a4aab5] font-semibold mt-1 flex items-center gap-1.5`}>
            <span className="w-1 h-1 rounded-full bg-[#c8824f]" />
            Engineering Infinite Possibilities
          </span>
        )}
      </div>
    </div>
  );
};
