import React, { useState } from 'react';
import { PRICING_PACKAGES, formatNPR, PricingPackage } from '../data/pricing';
import { Calculator, ArrowRight, AlertCircle, Check, Info } from 'lucide-react';

interface ProjectEstimatorProps {
  onApplyEstimate: (packageTitle: string, budgetRange: string, estimatedScopeText: string) => void;
  selectedPackageId?: string;
}

export const ProjectEstimator: React.FC<ProjectEstimatorProps> = ({
  onApplyEstimate,
  selectedPackageId = 'business-website'
}) => {
  const [activePackageId, setActivePackageId] = useState<string>(selectedPackageId);
  const [extraPages, setExtraPages] = useState<number>(0);
  const [includeBilingual, setIncludeBilingual] = useState<boolean>(false);
  const [includeExpressDelivery, setIncludeExpressDelivery] = useState<boolean>(false);

  // Out-of-scope custom feature toggles that require custom quotation
  const [requirePaymentGateway, setRequirePaymentGateway] = useState<boolean>(false);
  const [requireCustomAuth, setRequireCustomAuth] = useState<boolean>(false);
  const [requireBookingSystem, setRequireBookingSystem] = useState<boolean>(false);

  const selectedPkg: PricingPackage =
    PRICING_PACKAGES.find((p) => p.id === activePackageId) || PRICING_PACKAGES[1];

  // Price calculations for standard in-scope add-ons
  const extraPageRate = 1200;
  const bilingualRate = 2500;
  const expressRate = 2000;

  const basePrice = selectedPkg.price;
  const extraPagesCost = extraPages * extraPageRate;
  const bilingualCost = includeBilingual ? bilingualRate : 0;
  const expressCost = includeExpressDelivery ? expressRate : 0;

  const totalCalculated = basePrice + extraPagesCost + bilingualCost + expressCost;

  // Check if custom quotation is triggered
  const hasCustomQuoteFeatures =
    selectedPkg.isStartingFrom ||
    requirePaymentGateway ||
    requireCustomAuth ||
    requireBookingSystem;

  const handleProceed = () => {
    let summary = `Project Scope Breakdown for ${selectedPkg.title}:\n`;
    summary += `• Base Package: ${selectedPkg.priceDisplay}\n`;

    if (extraPages > 0) {
      summary += `• Extra Standard Pages: +${extraPages} page(s) (${formatNPR(extraPagesCost)})\n`;
    }
    if (includeBilingual) {
      summary += `• Bilingual Architecture (Nepali + English): (${formatNPR(bilingualCost)})\n`;
    }
    if (includeExpressDelivery) {
      summary += `• Priority Express Delivery: (${formatNPR(expressCost)})\n`;
    }

    if (hasCustomQuoteFeatures) {
      summary += `\nSpecial Requirements Requiring Custom Architecture:\n`;
      if (selectedPkg.isStartingFrom) {
        summary += `• E-commerce / Custom Systems base scope\n`;
      }
      if (requirePaymentGateway) {
        summary += `• Payment Gateway Integration (eSewa / Khalti / Fonepay / ConnectIPS)\n`;
      }
      if (requireCustomAuth) {
        summary += `• Custom User Portal / Admin Dashboard / Database Authentication\n`;
      }
      if (requireBookingSystem) {
        summary += `• Automated Booking / Appointment System\n`;
      }
      summary += `(Subject to confirmed written quotation before kickoff)\n`;
    }

    const estimatedBudgetStr = hasCustomQuoteFeatures
      ? selectedPkg.budgetRangeValue
      : `${formatNPR(totalCalculated)} (${selectedPkg.title} Estimate)`;

    onApplyEstimate(selectedPkg.projectTypeValue, estimatedBudgetStr, summary);
  };

  return (
    <div className="bg-[#101217] border border-white/[0.08] rounded-3xl p-4 sm:p-8 lg:p-10 shadow-2xl relative overflow-hidden">
      {/* Subtle top reflection accent */}
      <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-[#d89f66]/40 to-transparent" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-[#d89f66] uppercase mb-1">
            <Calculator className="w-3.5 h-3.5" />
            <span>INTERACTIVE SCOPE ESTIMATOR</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-[#f1f2f4] tracking-tight">
            Configure Your Project Scope
          </h3>
        </div>
        <p className="text-xs text-[#9ca3af] max-w-sm">
          Select a base package and tailor standard additions. All figures are indicative and confirmed after discussing your exact assets.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8">
        {/* Left Column: Scope & Package Selectors */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1: Package Selector Tabs */}
          <div>
            <label className="block text-xs font-semibold text-[#f1f2f4] uppercase tracking-wider mb-2.5">
              1. Choose Base Package
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRICING_PACKAGES.map((pkg) => {
                const isSelected = activePackageId === pkg.id;
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setActivePackageId(pkg.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#181b22] border-[#d89f66] text-white shadow-md'
                        : 'bg-[#14161c] border-white/[0.06] text-[#9ca3af] hover:text-white hover:border-white/[0.15]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{pkg.title}</span>
                      <span className="font-mono text-xs font-bold text-[#d89f66] tabular-nums">
                        {pkg.priceDisplay}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#6b7280] line-clamp-1 mt-1">
                      {pkg.targetCustomers}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Standard In-Scope Add-ons */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-[#f1f2f4] uppercase tracking-wider mb-2.5">
              2. Optional Standard Additions (Within Standard Scope)
            </label>
            <div className="space-y-3">
              {/* Extra pages */}
              <div className="p-3.5 rounded-xl bg-[#14161c] border border-white/[0.06] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Extra Content Pages</div>
                  <div className="text-[11px] text-[#6b7280]">
                    +{formatNPR(extraPageRate)} per additional standard page
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExtraPages(Math.max(0, extraPages - 1))}
                    className="w-7 h-7 rounded-lg bg-[#1e222a] text-white flex items-center justify-center text-sm font-bold hover:bg-[#282d38] cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-mono font-bold text-sm text-[#d89f66]">
                    {extraPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setExtraPages(Math.min(10, extraPages + 1))}
                    className="w-7 h-7 rounded-lg bg-[#1e222a] text-white flex items-center justify-center text-sm font-bold hover:bg-[#282d38] cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Bilingual option */}
              <label className="p-3.5 rounded-xl bg-[#14161c] border border-white/[0.06] flex items-center justify-between cursor-pointer hover:border-white/[0.12] transition-colors">
                <div>
                  <div className="text-xs font-semibold text-white">Bilingual Nepali &amp; English Layout</div>
                  <div className="text-[11px] text-[#6b7280]">
                    Structured dual-language routing and typography (+{formatNPR(bilingualRate)})
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includeBilingual}
                  onChange={(e) => setIncludeBilingual(e.target.checked)}
                  className="w-4 h-4 rounded text-[#d89f66] accent-[#d89f66]"
                />
              </label>

              {/* Express delivery option */}
              <label className="p-3.5 rounded-xl bg-[#14161c] border border-white/[0.06] flex items-center justify-between cursor-pointer hover:border-white/[0.12] transition-colors">
                <div>
                  <div className="text-xs font-semibold text-white">Priority Express Delivery Sprint</div>
                  <div className="text-[11px] text-[#6b7280]">
                    Accelerated review and delivery queue (+{formatNPR(expressRate)})
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includeExpressDelivery}
                  onChange={(e) => setIncludeExpressDelivery(e.target.checked)}
                  className="w-4 h-4 rounded text-[#d89f66] accent-[#d89f66]"
                />
              </label>
            </div>
          </div>

          {/* Step 3: Complex Custom Features (Transparent Custom Quote Flow) */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2.5">
              <label className="block text-xs font-semibold text-[#f1f2f4] uppercase tracking-wider">
                3. Advanced Custom Requirements (Requires Custom Quote)
              </label>
              <span className="text-[10px] font-mono text-[#d89f66]">No Made-Up Prices</span>
            </div>

            <div className="space-y-2.5">
              <label className="p-3 rounded-xl bg-[#14161c] border border-white/[0.06] flex items-start sm:items-center justify-between gap-3 cursor-pointer hover:border-white/[0.1] transition-colors">
                <div>
                  <div className="text-xs font-medium text-white">Automated Payment Gateway Integration</div>
                  <div className="text-[11px] text-[#6b7280]">
                    eSewa, Khalti, Fonepay, or ConnectIPS API integration
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={requirePaymentGateway}
                  onChange={(e) => setRequirePaymentGateway(e.target.checked)}
                  className="w-4 h-4 rounded text-[#d89f66] accent-[#d89f66] shrink-0 mt-0.5 sm:mt-0"
                />
              </label>

              <label className="p-3 rounded-xl bg-[#14161c] border border-white/[0.06] flex items-start sm:items-center justify-between gap-3 cursor-pointer hover:border-white/[0.1] transition-colors">
                <div>
                  <div className="text-xs font-medium text-white">Custom Portal &amp; Database Authentication</div>
                  <div className="text-[11px] text-[#6b7280]">
                    Customer logins, member directories, or custom internal dashboards
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={requireCustomAuth}
                  onChange={(e) => setRequireCustomAuth(e.target.checked)}
                  className="w-4 h-4 rounded text-[#d89f66] accent-[#d89f66] shrink-0 mt-0.5 sm:mt-0"
                />
              </label>

              <label className="p-3 rounded-xl bg-[#14161c] border border-white/[0.06] flex items-start sm:items-center justify-between gap-3 cursor-pointer hover:border-white/[0.1] transition-colors">
                <div>
                  <div className="text-xs font-medium text-white">Automated Booking &amp; Scheduling Engine</div>
                  <div className="text-[11px] text-[#6b7280]">
                    Interactive doctor/salon appointment slot bookings
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={requireBookingSystem}
                  onChange={(e) => setRequireBookingSystem(e.target.checked)}
                  className="w-4 h-4 rounded text-[#d89f66] accent-[#d89f66] shrink-0 mt-0.5 sm:mt-0"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Live Estimate Breakdown & Form Pre-fill CTA */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div className="bg-[#14161d] border border-white/[0.08] rounded-2xl p-4 sm:p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <span className="text-xs font-mono uppercase tracking-wider text-[#9ca3af]">
                Estimated Scope Summary
              </span>
              <span className="text-xs font-bold text-[#d89f66]">{selectedPkg.title}</span>
            </div>

            {/* Price Display */}
            <div>
              <div className="text-xs text-[#6b7280]">Estimated Development Fee</div>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-white mt-1 tabular-nums">
                {selectedPkg.isStartingFrom ? (
                  <span>From {formatNPR(totalCalculated)}</span>
                ) : (
                  <span>{formatNPR(totalCalculated)}</span>
                )}
              </div>
              <div className="text-[11px] text-[#9ca3af] mt-1">
                Estimated Delivery: <strong className="text-white">{selectedPkg.deliveryTime}</strong>
              </div>
            </div>

            {/* Scope inclusions list */}
            <div className="space-y-2 pt-2 border-t border-white/[0.06] text-xs">
              <div className="text-[11px] font-semibold text-[#f1f2f4] uppercase tracking-wider">
                Configured Inclusions:
              </div>
              <div className="flex items-start gap-2 text-[#9ca3af]">
                <Check className="w-3.5 h-3.5 text-[#d89f66] shrink-0 mt-0.5" />
                <span>Base: {selectedPkg.title} ({selectedPkg.priceDisplay})</span>
              </div>
              {extraPages > 0 && (
                <div className="flex items-start gap-2 text-[#9ca3af]">
                  <Check className="w-3.5 h-3.5 text-[#d89f66] shrink-0 mt-0.5" />
                  <span>+{extraPages} additional standard page(s)</span>
                </div>
              )}
              {includeBilingual && (
                <div className="flex items-start gap-2 text-[#9ca3af]">
                  <Check className="w-3.5 h-3.5 text-[#d89f66] shrink-0 mt-0.5" />
                  <span>Bilingual Nepali &amp; English configuration</span>
                </div>
              )}
              {includeExpressDelivery && (
                <div className="flex items-start gap-2 text-[#9ca3af]">
                  <Check className="w-3.5 h-3.5 text-[#d89f66] shrink-0 mt-0.5" />
                  <span>Priority express delivery sprint</span>
                </div>
              )}
            </div>

            {/* Custom Quote Notice if triggered */}
            {hasCustomQuoteFeatures && (
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Custom Written Quote Required</span>
                </div>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  Your selection includes custom engineering (payment gateways, backend databases, or e-commerce features). Final pricing is confirmed in a written proposal prior to development.
                </p>
              </div>
            )}

            {/* Transparency Note */}
            <div className="p-3 rounded-xl bg-[#0e1014] border border-white/[0.05] text-[11px] text-[#6b7280] leading-relaxed flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-[#9ca3af] shrink-0 mt-0.5" />
              <span>
                <strong>Indicative Estimate:</strong> Excludes domain registration (free .np / ~NPR 1,800 .com), hosting, and third-party fees. Final price confirmed upon review of your assets.
              </span>
            </div>

            {/* Action Button: Prefills Contact Form */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleProceed}
                className="w-full py-3.5 px-6 rounded-xl bg-[#d89f66] hover:bg-[#eec397] text-[#090a0c] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-md hover:shadow-[0_0_20px_rgba(216,159,102,0.3)] cursor-pointer"
              >
                <span>Proceed to Inquiry with this Estimate</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
