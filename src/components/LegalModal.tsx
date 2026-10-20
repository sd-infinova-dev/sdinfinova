import React from 'react';
import { X } from 'lucide-react';

interface LegalModalProps {
  type: 'privacy' | 'terms' | null;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
  if (!type) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#101217] border border-white/[0.12] rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 relative my-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg text-[#9ca3af] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {type === 'privacy' ? (
          <div className="space-y-4 text-xs sm:text-sm text-[#9ca3af] leading-relaxed">
            <h3 className="text-xl font-bold text-[#f1f2f4]">Privacy Notice &amp; Data Protection</h3>
            <p className="text-[11px] text-[#6b7280]">Last Updated: January 2026</p>

            <h4 className="text-sm font-semibold text-white">1. Scope and Information Collected</h4>
            <p>
              SD Infinova operates as an independent digital engineering studio headquartered in Kathmandu, Nepal. We collect only information strictly necessary to communicate with prospective clients regarding project inquiries (name, business email, optional contact number, and project scope details).
            </p>

            <h4 className="text-sm font-semibold text-white">2. First-Party, Privacy-Conscious Analytics</h4>
            <p>
              We run first-party server-side telemetry to understand aggregate page views and referral domains. We do not use third-party cross-site trackers or sell visitor information to advertising networks.
            </p>

            <h4 className="text-sm font-semibold text-white">3. Data Retention &amp; Security</h4>
            <p>
              All contact submissions are stored in our secure, encrypted PostgreSQL database with strict role-based access. Inquiries may be deleted upon request by emailing sd.infinova@gmail.com.
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-xs sm:text-sm text-[#9ca3af] leading-relaxed">
            <h3 className="text-xl font-bold text-[#f1f2f4]">Terms of Service</h3>
            <p className="text-[11px] text-[#6b7280]">Last Updated: January 2026</p>

            <h4 className="text-sm font-semibold text-white">1. Engagement &amp; Milestones</h4>
            <p>
              Engineering contracts with SD Infinova are governed by mutually agreed Statements of Work (SOW). Projects initiate with a 50% commencement milestone and conclude with 50% upon verified deployment to the client's production domain.
            </p>

            <h4 className="text-sm font-semibold text-white">2. Intellectual Property &amp; Code Ownership</h4>
            <p>
              Upon complete settlement of agreed fees, 100% of the custom source code, design assets, database structures, and configuration files are assigned directly to the client with full commercial ownership rights.
            </p>

            <h4 className="text-sm font-semibold text-white">3. Post-Deployment Warranty</h4>
            <p>
              All custom web applications include a 30-day technical warranty against functional bugs or regressions from the date of official launch.
            </p>
          </div>
        )}

        <div className="pt-4 border-t border-white/[0.08] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-[#090a0c] bg-[#d89f66] rounded-lg hover:bg-[#e5b380] transition-colors cursor-pointer"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
