import React from 'react';
import { BrandLogo } from './BrandLogo';
import { Shield, ArrowUpRight } from 'lucide-react';

interface FooterProps {
  onNavigate: (sectionId: string) => void;
  onOpenAdmin: () => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
  whatsappNumber?: string;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigate,
  onOpenAdmin,
  onOpenPrivacy,
  onOpenTerms,
  whatsappNumber = '9779800000000'
}) => {
  const cleanWhatsApp = whatsappNumber.replace(/[^0-9]/g, '');

  return (
    <footer className="bg-[#07080a] border-t border-white/[0.08] pt-16 pb-12 text-sm text-[#9ca3af]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-12 border-b border-white/[0.06]">
          {/* Col 1: Brand & Identity */}
          <div className="md:col-span-5 space-y-4">
            <BrandLogo size="md" showSubtitle />
            <p className="text-xs text-[#9ca3af] leading-relaxed max-w-sm mt-3">
              SD Infinova is an independent digital studio and web engineering practice based in Kathmandu, Nepal. We craft high-speed web presences and scalable software architectures for ambitious businesses.
            </p>
            <div className="text-xs text-[#6b7280] space-y-1">
              <div>Kathmandu, Nepal · <a href="mailto:sd.infinova@gmail.com" className="text-[#d89f66] hover:underline">sd.infinova@gmail.com</a></div>
              <div>
                <a
                  href={`https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent('Hello SD Infinova! I would like to chat about a website project.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#4ade80] hover:underline inline-flex items-center gap-1.5"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                  <span>Chat on WhatsApp Directly</span>
                </a>
              </div>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="md:col-span-3 space-y-3">
            <div className="text-xs font-semibold text-[#f1f2f4] uppercase tracking-wider">
              Studio Navigation
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigate('work')} className="hover:text-white transition-colors cursor-pointer">
                  Selected Work
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('services')} className="hover:text-white transition-colors cursor-pointer">
                  Core Services
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('pricing')} className="hover:text-white transition-colors cursor-pointer text-[#d89f66]">
                  Pricing &amp; Packages (From NPR 4,999)
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('process')} className="hover:text-white transition-colors cursor-pointer">
                  Our 5-Stage Process
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('about')} className="hover:text-white transition-colors cursor-pointer">
                  Studio Philosophy
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('insights')} className="hover:text-white transition-colors cursor-pointer">
                  Insights &amp; Engineering Blog
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('faq')} className="hover:text-white transition-colors cursor-pointer">
                  Frequently Asked Questions
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Services Summary */}
          <div className="md:col-span-4 space-y-3">
            <div className="text-xs font-semibold text-[#f1f2f4] uppercase tracking-wider">
              Specialties
            </div>
            <ul className="space-y-1.5 text-xs text-[#9ca3af]">
              <li>Bespoke Business Websites &amp; Landing Pages</li>
              <li>Custom Web Applications (React + PostgreSQL)</li>
              <li>Website Redesigns &amp; Core Web Vitals Optimization</li>
              <li>Technical SEO &amp; Local Kathmandu Google Rankings</li>
              <li>eSewa, Khalti &amp; Global Payment API Integrations</li>
            </ul>

            <div className="pt-2">
              <a
                href="https://github.com/sdinfinova"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#d89f66] hover:text-[#eec397] inline-flex items-center gap-1 font-medium"
              >
                GitHub Open Source <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright, Legal & Admin Access */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6b7280]">
          <div>
            &copy; {new Date().getFullYear()} SD Infinova. All rights reserved. Registered Digital Studio, Nepal.
          </div>

          <div className="flex items-center gap-6">
            <button onClick={onOpenPrivacy} className="hover:text-[#9ca3af] transition-colors cursor-pointer">
              Privacy Policy
            </button>
            <button onClick={onOpenTerms} className="hover:text-[#9ca3af] transition-colors cursor-pointer">
              Terms of Service
            </button>
            <button
              onClick={onOpenAdmin}
              className="text-[#9ca3af] hover:text-[#d89f66] flex items-center gap-1 transition-colors cursor-pointer"
              title="Admin CMS Portal"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
