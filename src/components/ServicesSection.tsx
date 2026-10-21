import React, { useState } from 'react';
import { Layout, TrendingUp, Sparkles, Cpu, Database, Zap, Workflow, ShieldCheck, ChevronDown, Check, ArrowRight } from 'lucide-react';

export interface ServiceItem {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  deliverables: string[];
  workflow: string[];
  problems_solved: string[];
  icon_name: string;
  sort_order: number;
}

interface ServicesSectionProps {
  services: ServiceItem[];
  onSelectService: (service: ServiceItem) => void;
  onStartInquiryWithService?: (serviceName: string) => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  services,
  onStartInquiryWithService
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getServiceIcon = (iconName: string) => {
    switch (iconName) {
      case 'Layout': return <Layout className="w-5 h-5 text-[#d89f66]" />;
      case 'TrendingUp': return <TrendingUp className="w-5 h-5 text-[#d89f66]" />;
      case 'Sparkles': return <Sparkles className="w-5 h-5 text-[#d89f66]" />;
      case 'Cpu': return <Cpu className="w-5 h-5 text-[#d89f66]" />;
      case 'Database': return <Database className="w-5 h-5 text-[#d89f66]" />;
      case 'Zap': return <Zap className="w-5 h-5 text-[#d89f66]" />;
      case 'Workflow': return <Workflow className="w-5 h-5 text-[#d89f66]" />;
      case 'ShieldCheck': return <ShieldCheck className="w-5 h-5 text-[#d89f66]" />;
      default: return <Layout className="w-5 h-5 text-[#d89f66]" />;
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <section id="services" className="py-24 border-t border-white/[0.08] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-2xl mb-16">
          <div className="text-xs font-semibold tracking-[0.2em] text-[#d89f66] uppercase mb-2">
            CORE CAPABILITIES
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#f1f2f4] tracking-tight mb-4">
            Specialized Digital Studio &amp; Web Engineering Services
          </h2>
          <p className="text-sm sm:text-base text-[#9ca3af] leading-relaxed">
            We don't sell bloated agency retainers or fragile website builders. We engineer purpose-built web solutions designed to generate real business momentum.
          </p>
        </div>

        {/* Services Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((service, index) => {
            const isExpanded = expandedId === service.id;
            return (
              <div
                key={service.id}
                className="surface-card rounded-2xl p-5 sm:p-8 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Clean Number + Icon */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-xs font-mono text-[#6b7280]">
                      {(index + 1).toString().padStart(2, '0')}.
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-[#181b22] border border-white/[0.08] flex items-center justify-center">
                      {getServiceIcon(service.icon_name)}
                    </div>
                  </div>

                  {/* Title & Tagline */}
                  <h3 className="text-xl font-bold text-[#f1f2f4] mb-2 tracking-tight">
                    {service.title}
                  </h3>
                  <p className="text-xs font-medium text-[#d89f66] mb-4">
                    {service.tagline}
                  </p>
                  <p className="text-sm text-[#9ca3af] leading-relaxed mb-6">
                    {service.description}
                  </p>

                  {/* Expandable Deliverables & Problem Solving */}
                  {isExpanded && (
                    <div className="space-y-5 pt-4 border-t border-white/[0.08] text-xs">
                      <div>
                        <div className="font-semibold text-[#f1f2f4] mb-2 uppercase tracking-wider text-[11px]">
                          Key Deliverables:
                        </div>
                        <ul className="space-y-1.5 text-[#9ca3af]">
                          {service.deliverables.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <Check className="w-3.5 h-3.5 text-[#d89f66] shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <div className="font-semibold text-[#f1f2f4] mb-2 uppercase tracking-wider text-[11px]">
                          Challenges Resolved:
                        </div>
                        <ul className="space-y-1.5 text-[#9ca3af]">
                          {service.problems_solved.map((prob, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-[#d89f66]">•</span>
                              <span>{prob}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-6 mt-6 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => toggleExpand(service.id)}
                    className="text-xs text-[#9ca3af] hover:text-[#f1f2f4] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {isExpanded ? 'Hide Details' : 'View Deliverables & Scope'}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  <button
                    onClick={() => onStartInquiryWithService && onStartInquiryWithService(service.title)}
                    className="text-xs font-semibold text-[#d89f66] hover:text-[#eec397] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    Inquire <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
