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
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-semibold tracking-[0.16em] sm:tracking-[0.2em] text-[#d89f66] uppercase">
              <span>SD INFINOVA</span>
              <span className="text-white/20">/</span>
              <span className="text-[#9ca3af]">DIGITAL STUDIO &amp; WEB ENGINEERING</span>
            </div>

            {/* Headline with balanced wrapping */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#f1f2f4] tracking-tight leading-[1.12] sm:leading-[1.08] [text-wrap:balance]">
              Engineering Digital Experiences{' '}
              <span className="gold-gradient-text block sm:inline">
                Without Limits.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-xl text-[#9ca3af] leading-relaxed max-w-2xl font-normal">
              We design and develop modern websites and digital solutions that help
              businesses build their online presence and move forward with
              confidence.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 pt-2">
              <button
                onClick={onStartProject}
                className="px-7 py-3.5 text-sm font-semibold text-[#090a0c] bg-[#d89f66] hover:bg-[#eec397] transition-all duration-200 rounded-lg shadow-lg hover:shadow-[0_0_25px_rgba(216,159,102,0.35)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Start a Project</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onExploreWork}
                className="px-6 py-3.5 text-sm font-semibold text-[#d1d5db] hover:text-white bg-[#121418] hover:bg-[#181b22] border border-white/[0.1] hover:border-white/[0.2] transition-all duration-200 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Explore Our Work</span>
                <ArrowUpRight className="w-4 h-4 text-[#9ca3af]" />
              </button>

              <a
                href={`https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent('Hello SD Infinova! I would like to chat about a website project.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3.5 text-sm font-semibold text-[#4ade80] hover:text-white bg-[#0f2418] hover:bg-[#153423] border border-[#25D366]/40 hover:border-[#25D366] transition-all duration-200 rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-[0_0_20px_rgba(37,211,102,0.25)]"
                title="Chat with SD Infinova on WhatsApp"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                <span>WhatsApp Us</span>
              </a>
            </div>

            {/* Honest Trust Metrics */}
            <div className="pt-6 border-t border-white/[0.08] grid grid-cols-3 gap-2.5 sm:gap-6 max-w-lg">
              <div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-[#f1f2f4] tabular-nums">100%</div>
                <div className="text-[10px] sm:text-xs text-[#9ca3af] mt-0.5 leading-snug">Bespoke Engineering</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-[#f1f2f4] tabular-nums">&lt;1.0s</div>
                <div className="text-[10px] sm:text-xs text-[#9ca3af] mt-0.5 leading-snug">Mobile LCP Target</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-[#f1f2f4] tabular-nums">Kathmandu</div>
                <div className="text-[10px] sm:text-xs text-[#9ca3af] mt-0.5 leading-snug">Studio HQ</div>
              </div>
            </div>
          </div>

          {/* Right Column: Signature Official Master Brand Card */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-md">
              {/* Outer decorative ambient ring with bronze & steel blue glow */}
              <div className="absolute -inset-1 bg-gradient-to-br from-[#c8824f]/30 via-transparent to-[#244b78]/30 rounded-3xl blur-2xl -z-10 opacity-75 animate-pulse" />

              {/* Main Brand Card on Luxury Textured Leather */}
              <div className="leather-card relative rounded-3xl p-4 sm:p-5 shadow-2xl border border-white/[0.12] overflow-hidden group transition-all duration-500 hover:border-[#c8824f]/40 hover:shadow-[0_20px_50px_rgba(200,130,79,0.25)]">
                {/* Subtle top reflection line */}
                <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-[#c8824f]/60 to-transparent" />

                {/* Corner accent stars */}
                <div className="absolute top-3 right-4 text-[#c8824f]/60 text-xs select-none">✦</div>
                <div className="absolute bottom-3 left-4 text-[#244b78]/60 text-xs select-none">✦</div>

                {/* Master Official Logo Image with Leather Texture & 3D Metallic Bevel */}
                <div className="relative rounded-2xl overflow-hidden shadow-inner border border-white/[0.08] bg-[#0c0e12]">
                  <img
                    src="/assets/sdinfinova-logo.jpg"
                    alt="SD Infinova Official Brand Mark"
                    className="w-full aspect-square object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                    loading="eager"
                  />
                  {/* Subtle specular sheen sweep on hover */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.06] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                </div>

                {/* Card Footer Caption */}
                <div className="pt-4 pb-2 px-3 text-center flex flex-col items-center">
                  <div className="flex items-center gap-2 text-[10px] tracking-[0.24em] uppercase text-[#a4aab5] font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c8824f] shadow-[0_0_8px_#c8824f]" />
                    <span>OFFICIAL BRAND MARK</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#244b78] shadow-[0_0_8px_#244b78]" />
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#c8824f] font-semibold mt-1">
                    ENGINEERING INFINITE POSSIBILITIES
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
