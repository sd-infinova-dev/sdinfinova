import React from 'react';

export const ProcessSection: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Discovery & System Architecture',
      description: 'We unpack your commercial objectives, audience psychology, and technical requirements. We establish exact database schemas, URL structures, and content hierarchies before writing code.',
      deliverable: 'Technical Scope Document & Wireframes'
    },
    {
      num: '02',
      title: 'Precision UI/UX Design',
      description: 'We construct a cohesive design system reflecting your brand identity. Typography scales, color tokens, and responsive mobile layouts crafted for intuitive navigation and instant credibility.',
      deliverable: 'Interactive High-Fidelity Prototypes'
    },
    {
      num: '03',
      title: 'Full-Stack Web Engineering',
      description: 'Clean TypeScript implementation with React, Node.js, and PostgreSQL. Every component is optimized for sub-second responses, zero layout shifts, and semantic accessibility.',
      deliverable: 'Production Codebase & API Endpoints'
    },
    {
      num: '04',
      title: 'Rigorous QA & Core Web Vitals',
      description: 'Comprehensive cross-device validation on mobile, tablet, and desktop screens. We stress-test form submissions, audit security rules, and tune Core Web Vitals (LCP, CLS, INP).',
      deliverable: 'Lighthouse 95+ Audit Report'
    },
    {
      num: '05',
      title: 'Deployment & Continuous Evolution',
      description: 'Seamless cutover to your custom domain with SSL certification, automated database backups, sitemap submission to Google Search Console, and CMS administrative training.',
      deliverable: 'Live Production URL & Admin Handoff'
    }
  ];

  return (
    <section id="process" className="py-24 border-t border-white/[0.08] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-16">
          <div className="text-xs font-semibold tracking-[0.2em] text-[#d89f66] uppercase mb-2">
            METHODOLOGY
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#f1f2f4] tracking-tight mb-4">
            Our 5-Stage Engineering Process
          </h2>
          <p className="text-sm sm:text-base text-[#9ca3af] leading-relaxed">
            Predictable delivery, total milestone transparency, and zero unexpected surprises.
          </p>
        </div>

        {/* Process Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 sm:gap-6">
          {steps.map((step) => (
            <div
              key={step.num}
              className="bg-[#101216] border border-white/[0.07] rounded-2xl p-5 sm:p-6 flex flex-col justify-between hover:border-[#d89f66]/30 transition-colors"
            >
              <div>
                <div className="font-mono text-2xl font-bold text-[#d89f66] mb-4">
                  {step.num}.
                </div>
                <h3 className="text-base font-bold text-[#f1f2f4] mb-3 leading-snug">
                  {step.title}
                </h3>
                <p className="text-xs text-[#9ca3af] leading-relaxed">
                  {step.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.06]">
                <div className="text-[10px] uppercase tracking-wider text-[#6b7280] font-mono">
                  Milestone Deliverable
                </div>
                <div className="text-xs text-[#d1d5db] font-medium mt-1">
                  {step.deliverable}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
