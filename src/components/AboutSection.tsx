import React from 'react';
import { MapPin, Globe, Code2, ShieldAlert } from 'lucide-react';

export const AboutSection: React.FC = () => {
  return (
    <section id="about" className="py-24 border-t border-white/[0.08] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Studio Narrative */}
          <div className="lg:col-span-7 space-y-6">
            <div className="text-xs font-semibold tracking-[0.2em] text-[#d89f66] uppercase">
              STUDIO PHILOSOPHY
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#f1f2f4] tracking-tight leading-tight">
              A Founder-Led Engineering Studio Dedicated to Practical Digital Impact.
            </h2>

            <div className="space-y-4 text-sm sm:text-base text-[#9ca3af] leading-relaxed">
              <p>
                Headquartered in <strong className="text-white">Kathmandu, Nepal</strong>, SD Infinova was founded on a singular conviction: businesses deserve digital tools that actively drive revenue, not decorative templates that sit abandoned after launch.
              </p>
              <p>
                Too many businesses in Nepal have been burnt by low-quality, template-stuffed websites that break on mobile devices, take 10 seconds to load, and fail to generate a single paying customer. We take an engineering-first approach. Every pixel, database schema, and server route is intentionally built for speed, durability, and commercial conversion.
              </p>
              <p>
                Whether partnering with a local Kathmandu clinic to streamline patient bookings or delivering robust custom web applications for overseas clients, we maintain the exact same standard: strict type safety, zero layout shifts, verified SEO indexing, and clean, maintainable code.
              </p>
            </div>

            {/* Core Values / Commitments */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="p-4 rounded-xl bg-[#121418] border border-white/[0.06]">
                <div className="flex items-center gap-2 text-[#d89f66] text-xs font-bold uppercase tracking-wider mb-1">
                  <Code2 className="w-4 h-4" /> Real Code, No Locked Builders
                </div>
                <p className="text-xs text-[#9ca3af]">
                  You own 100% of your source code, database, and assets. No proprietary vendor lock-in or subscription traps.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#121418] border border-white/[0.06]">
                <div className="flex items-center gap-2 text-[#d89f66] text-xs font-bold uppercase tracking-wider mb-1">
                  <ShieldAlert className="w-4 h-4" /> Zero-Slop Standard
                </div>
                <p className="text-xs text-[#9ca3af]">
                  No fake reviews, no bloated dependencies, and no artificial hype. Just dependable digital engineering that works.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Studio Profile & Location Card */}
          <div className="lg:col-span-5">
            <div className="bg-[#111317] border border-white/[0.1] rounded-3xl p-5 sm:p-8 space-y-6">
              <div className="border-b border-white/[0.08] pb-6">
                <div className="text-xs font-mono text-[#d89f66] mb-1">LOCATION &amp; PRESENCE</div>
                <h3 className="text-xl font-bold text-[#f1f2f4]">Kathmandu Valley, Nepal</h3>
                <p className="text-xs text-[#9ca3af] mt-1">
                  Serving ambitious businesses across Bagmati Province and international clients worldwide.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#d89f66] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white">Registered Studio Base</div>
                    <div className="text-[#9ca3af]">Kathmandu, Nepal (UTC +5:45)</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Globe className="w-4 h-4 text-[#d89f66] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white">Markets Served</div>
                    <div className="text-[#9ca3af]">Nepal (SMEs &amp; Enterprises) + International remote contracts</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-4 h-4 rounded-full border border-[#d89f66] flex items-center justify-center text-[10px] text-[#d89f66] shrink-0 font-bold">
                    ₨
                  </div>
                  <div>
                    <div className="font-semibold text-white">Direct Local Settlement</div>
                    <div className="text-[#9ca3af]">NPR bank transfers, eSewa, Khalti, ConnectIPS &amp; USD wire</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-[#6b7280]">
                <span>Status: Available for Q2/Q3 Projects</span>
                <span className="font-mono text-[#d89f66]">Est. 2024</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
