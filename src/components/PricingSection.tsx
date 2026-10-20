import React, { useState } from 'react';
import { PRICING_PACKAGES, PRICING_DISCLAIMER, DELIVERY_TIMELINE_NOTE, PricingPackage } from '../data/pricing';
import { ProjectEstimator } from './ProjectEstimator';
import { Check, X, ArrowRight, Sparkles, Clock, RefreshCw } from 'lucide-react';

interface PricingSectionProps {
  onSelectPackage: (pkg: PricingPackage) => void;
  onApplyEstimate: (projectType: string, budgetRange: string, estimatedScopeText: string) => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({
  onSelectPackage,
  onApplyEstimate
}) => {
  const [selectedEstimatorPkgId, setSelectedEstimatorPkgId] = useState<string>('business-website');
  const [showEstimator, setShowEstimator] = useState<boolean>(true);

  const handlePackageClick = (pkg: PricingPackage) => {
    setSelectedEstimatorPkgId(pkg.id);
    onSelectPackage(pkg);
  };

  return (
    <section id="pricing" className="py-24 border-t border-white/[0.08] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="text-xs font-semibold tracking-[0.2em] text-[#d89f66] uppercase mb-2">
            TRANSPARENT PRICING &amp; PACKAGES
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#f1f2f4] tracking-tight mb-4">
            Clear, Predictable Web Engineering Packages for Nepal &amp; Beyond.
          </h2>
          <p className="text-sm sm:text-base text-[#9ca3af] leading-relaxed">
            No hidden markups or surprise agency invoices. Choose a calibrated package tailored for local businesses in Nepal, or request a custom architectural estimate.
          </p>
        </div>

        {/* 4 Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {PRICING_PACKAGES.map((pkg) => {
            const isRec = pkg.isRecommended;
            return (
              <div
                key={pkg.id}
                className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 relative ${
                  isRec
                    ? 'bg-[#13161e] border-2 border-[#d89f66] shadow-[0_0_35px_-8px_rgba(216,159,102,0.3)] lg:-translate-y-2'
                    : 'surface-card'
                }`}
              >
                {/* Recommended Badge (Unboxed text with subtle accent) */}
                {isRec && (
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#d89f66] mb-3">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>RECOMMENDED FOR NEPAL SMBs</span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Title & Target Audience */}
                  <div>
                    <h3 className="text-xl font-bold text-[#f1f2f4] tracking-tight">
                      {pkg.title}
                    </h3>
                    <p className="text-xs text-[#9ca3af] mt-1 line-clamp-2 leading-relaxed">
                      {pkg.targetCustomers}
                    </p>
                  </div>

                  {/* Price Display */}
                  <div className="pt-2 pb-1 border-b border-white/[0.06]">
                    <div className="text-xs text-[#6b7280]">Fixed Starting Price</div>
                    <div className="text-3xl font-extrabold font-mono text-white mt-1 tabular-nums">
                      {pkg.priceDisplay}
                    </div>
                  </div>

                  {/* Delivery & Revision Metas */}
                  <div className="space-y-1.5 text-xs text-[#d1d5db]">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#d89f66] shrink-0" />
                      <span>{pkg.deliveryTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-[#d89f66] shrink-0" />
                      <span>{pkg.revisions}</span>
                    </div>
                  </div>

                  {/* Inclusions */}
                  <div className="pt-3 border-t border-white/[0.06] space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#f1f2f4]">
                      What's Included:
                    </div>
                    <ul className="space-y-2 text-xs text-[#9ca3af]">
                      {pkg.inclusions.map((inc, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-[#d89f66] shrink-0 mt-0.5" />
                          <span className="leading-snug">{inc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Exclusions */}
                  <div className="pt-3 border-t border-white/[0.06] space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">
                      Scope Exclusions:
                    </div>
                    <ul className="space-y-1.5 text-[11px] text-[#6b7280]">
                      {pkg.excludes.map((exc, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <X className="w-3 h-3 text-[#6b7280] shrink-0 mt-0.5" />
                          <span className="leading-snug">{exc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card CTA Button */}
                <div className="pt-6 mt-6 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => handlePackageClick(pkg)}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                      isRec
                        ? 'bg-[#d89f66] hover:bg-[#eec397] text-[#090a0c] shadow-md hover:shadow-[0_0_20px_rgba(216,159,102,0.35)]'
                        : 'bg-[#181b22] hover:bg-[#222631] text-white border border-white/[0.08]'
                    }`}
                  >
                    <span>{pkg.ctaText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pricing Transparency Callout Box (Section 5 requirement) */}
        <div className="p-6 sm:p-7 rounded-2xl bg-[#111317] border border-white/[0.08] space-y-2 text-xs leading-relaxed text-[#9ca3af]">
          <div className="font-semibold text-white uppercase tracking-wider text-[11px]">
            Pricing Transparency &amp; Delivery Terms:
          </div>
          <p>{PRICING_DISCLAIMER}</p>
          <p className="text-[#d89f66] font-medium">{DELIVERY_TIMELINE_NOTE}</p>
        </div>

        {/* Project Estimator Section */}
        {showEstimator && (
          <div className="pt-4">
            <ProjectEstimator
              selectedPackageId={selectedEstimatorPkgId}
              onApplyEstimate={onApplyEstimate}
            />
          </div>
        )}
      </div>
    </section>
  );
};
