import React from 'react';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface HeroSectionProps {
  onStartProject: () => void;
  onExploreWork: () => void;
  whatsappNumber?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onStartProject,
  onExploreWork,
  whatsappNumber = '9779800000000'
}) => {
  const cleanWhatsApp = whatsappNumber.replace(/[^0-9]/g, '');
  return (
    <section className="relative pt-12 pb-24 md:pt-20 md:pb-32 overflow-hidden">
      {/* Subtle radial ambient background glow behind hero */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-[#d89f66]/10 via-[#3a86c8]/5 to-transparent blur-[140px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Value Proposition & CTAs */}
          <div className="lg:col-span-7 space-y-8">
            {/* Kicker */}
            <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-[#d89f66] uppercase">
              <span>SD INFINOVA</span>
              <span className="text-white/20">/</span>
              <span className="text-[#9ca3af]">DIGITAL STUDIO &amp; WEB ENGINEERING</span>
            </div>

            {/* Headline with balanced wrapping */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#f1f2f4] tracking-tight leading-[1.08] [text-wrap:balance]">
              Engineering Digital Experiences{' '}
              <span className="gold-gradient-text block sm:inline">
                Without Limits.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-[#9ca3af] leading-relaxed max-w-2xl font-normal">
              We design and develop modern websites and digital solutions that help
              businesses build their online presence and move forward with
              confidence.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onStartProject}
                className="px-7 py-3.5 text-sm font-semibold text-[#090a0c] bg-[#d89f66] hover:bg-[#eec397] transition-all duration-200 rounded-lg shadow-lg hover:shadow-[0_0_25px_rgba(216,159,102,0.35)] flex items-center gap-2 cursor-pointer"
              >
                Start a Project
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onExploreWork}
                className="px-6 py-3.5 text-sm font-semibold text-[#d1d5db] hover:text-white bg-[#121418] hover:bg-[#181b22] border border-white/[0.1] hover:border-white/[0.2] transition-all duration-200 rounded-lg flex items-center gap-2 cursor-pointer"
              >
                Explore Our Work
                <ArrowUpRight className="w-4 h-4 text-[#9ca3af]" />
              </button>

              <a
                href={`https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent('Hello SD Infinova! I would like to chat about a website project.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3.5 text-sm font-semibold text-[#4ade80] hover:text-white bg-[#0f2418] hover:bg-[#153423] border border-[#25D366]/40 hover:border-[#25D366] transition-all duration-200 rounded-lg flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-[0_0_20px_rgba(37,211,102,0.25)]"
                title="Chat with SD Infinova on WhatsApp"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                <span>WhatsApp Us</span>
              </a>
            </div>

            {/* Honest Trust Metrics */}
            <div className="pt-6 border-t border-white/[0.08] grid grid-cols-3 gap-6 max-w-lg">
              <div>
                <div className="text-2xl font-bold font-mono text-[#f1f2f4] tabular-nums">100%</div>
                <div className="text-xs text-[#9ca3af] mt-0.5">Bespoke Engineering</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-[#f1f2f4] tabular-nums">&lt;1.0s</div>
                <div className="text-xs text-[#9ca3af] mt-0.5">Mobile LCP Target</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-[#f1f2f4] tabular-nums">Kathmandu</div>
                <div className="text-xs text-[#9ca3af] mt-0.5">Studio Headquarters</div>
              </div>
            </div>
          </div>

          {/* Right Column: Signature Official Brand Card (Directly reflecting Screenshot) */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-md">
              {/* Outer decorative ambient ring */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#d89f66]/20 to-[#3a86c8]/10 rounded-3xl blur-xl -z-10 opacity-70" />

              {/* Main Brand Card */}
              <div className="bg-[#101217] border border-white/[0.12] rounded-3xl p-8 sm:p-12 shadow-2xl flex flex-col items-center text-center relative overflow-hidden group">
                {/* Subtle top reflection line */}
                <div className="absolute top-0 inset-x-12 h-[1px] bg-gradient-to-r from-transparent via-[#d89f66]/50 to-transparent" />

                {/* Circular ambient aura behind logo */}
                <div className="w-48 h-48 absolute top-8 rounded-full bg-gradient-to-br from-[#d89f66]/15 via-transparent to-[#3a86c8]/10 blur-2xl pointer-events-none" />

                {/* Large 3D-styled Infinity Logo Mark */}
                <div className="py-6 my-2 relative z-10 transition-transform duration-500 group-hover:scale-105">
                  <svg
                    viewBox="0 0 100 60"
                    className="w-44 h-28"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient id="heroGold" x1="45" y1="10" x2="95" y2="50" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#faecd8" />
                        <stop offset="35%" stopColor="#d89f66" />
                        <stop offset="100%" stopColor="#a36b30" />
                      </linearGradient>

                      <linearGradient id="heroBlue" x1="5" y1="15" x2="55" y2="50" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#7ec0f3" />
                        <stop offset="45%" stopColor="#2c72b8" />
                        <stop offset="100%" stopColor="#153b67" />
                      </linearGradient>

                      <filter id="cardGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#d89f66" floodOpacity="0.3" />
                      </filter>
                    </defs>

                    {/* Left Loop (Sapphire Blue) */}
                    <path
                      d="M 50 30 C 35 12, 10 12, 10 30 C 10 46, 32 46, 50 30"
                      stroke="url(#heroBlue)"
                      strokeWidth="9.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Right Loop (Metallic Bronze Gold) */}
                    <path
                      d="M 50 30 C 65 48, 90 48, 90 30 C 90 14, 68 14, 50 30"
                      stroke="url(#heroGold)"
                      strokeWidth="9.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#cardGlow)"
                    />

                    {/* Arrow Pointer */}
                    <path
                      d="M 74 13 L 88 11 L 86 24"
                      stroke="#7ec0f3"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Sparkle Stars */}
                    <polygon points="78,7 80,10 83,10 81,12 82,15 79,13 76,15 77,12 75,10 78,10" fill="#fdf0d8" />
                    <circle cx="85" cy="8" r="1" fill="#ffffff" />
                  </svg>
                </div>

                {/* Typography Brand Lockup */}
                <div className="font-display font-extrabold tracking-tight text-2xl sm:text-3xl text-white mt-2">
                  <span>SD </span>
                  <span className="italic font-serif font-medium text-[#d89f66]">Infin</span>
                  <span className="text-[#4b9be6]">ova</span>
                </div>

                <div className="text-[10px] sm:text-xs uppercase tracking-[0.26em] text-[#d89f66]/90 font-semibold mt-2.5">
                  ENGINEERING INFINITE POSSIBILITIES
                </div>

                {/* Trust Seal text */}
                <div className="flex items-center gap-2 mt-6 text-[10px] tracking-[0.18em] uppercase text-[#6b7280] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d89f66]/80" />
                  <span>OFFICIAL BRAND MARK</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
