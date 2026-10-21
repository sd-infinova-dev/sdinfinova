import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How much does a custom website or web app cost with SD Infinova?',
      a: 'We provide clear, honest pricing with introductory packages tailored for businesses in Nepal: Landing Page is NPR 4,999 (single-page, 3–5 working days), Business Website is NPR 7,500 (up to 4 pages, recommended for local clinics, salons, cafes & services), Professional Website is NPR 12,500 (up to 6 pages, gallery & on-page SEO), and E-commerce & Custom Systems starts from NPR 15,000 with a confirmed written quotation prior to kickoff. Domain, hosting, and paid third-party APIs are billed separately at cost.'
    },
    {
      q: 'Do I own the full source code and database upon project completion?',
      a: 'Yes, 100%. We do not lock you into proprietary site builders or closed agency ecosystems. Upon project handover and final settlement, you receive the full Git repository, database schemas, credentials, and full legal intellectual property rights.'
    },
    {
      q: 'What is the typical timeline for project delivery?',
      a: 'A focused landing page or business website typically deploys in 2 to 3 weeks. Comprehensive multi-page corporate sites and custom portals take 4 to 6 weeks. We work with strict weekly milestone reviews so you are never left guessing about progress.'
    },
    {
      q: 'How does payment work for clients in Nepal and internationally?',
      a: 'We work on a standard 50% commencement deposit and 50% final deployment milestone after your verified approval. For Nepal-based clients, we accept direct bank transfers (Fonepay/ConnectIPS), eSewa, and Khalti. For international clients, we support international wire (SWIFT) or Stripe.'
    },
    {
      q: 'Do you provide ongoing website maintenance and security support?',
      a: 'Yes. Every project includes 30 days of post-launch warranty and bug-fix support. Afterwards, clients can subscribe to our monthly maintenance plan (NPR 3,000 – 10,000/mo) covering automated backups, server monitoring, security package updates, and priority content changes.'
    },
    {
      q: 'Why should I choose SD Infinova instead of a cheap template freelancer?',
      a: 'A NPR 5,000 template site is usually assembled with bloated plugins that break during WordPress updates, load slowly on Nepal mobile networks, and fail Core Web Vitals. We engineer clean, hand-crafted TypeScript code that loads in under 1 second, ranks prominently on Google, and converts visitors into paying customers.'
    }
  ];

  return (
    <section id="faq" className="py-24 border-t border-white/[0.08] relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="text-xs font-semibold tracking-[0.2em] text-[#d89f66] uppercase mb-2">
            TRANSPARENCY &amp; DETAILS
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#f1f2f4] tracking-tight mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-[#9ca3af]">
            Everything you need to know about working with our digital engineering studio.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-[#101216] border border-white/[0.07] rounded-2xl overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-6 text-left flex items-center justify-between gap-3 sm:gap-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d89f66]"
                >
                  <span className="font-bold text-[#f1f2f4] text-sm sm:text-lg leading-snug">
                    {faq.q}
                  </span>
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#181b22] border border-white/[0.06] flex items-center justify-center shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#d89f66]' : 'text-[#9ca3af]'}`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0 text-xs sm:text-sm leading-relaxed text-[#9ca3af] border-t border-white/[0.04]">
                    <div className="pt-3 sm:pt-4">{faq.a}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
