import React from 'react';
import { Layers, Terminal, Database, Shield, Zap, Search } from 'lucide-react';

export const TechStackSection: React.FC = () => {
  const stacks = [
    {
      category: 'Frontend & UI Engineering',
      icon: <Layers className="w-4 h-4 text-[#d89f66]" />,
      items: ['React 19', 'TypeScript', 'Tailwind CSS', 'Vite', 'Motion', 'Responsive Layouts']
    },
    {
      category: 'Backend & Server Runtime',
      icon: <Terminal className="w-4 h-4 text-[#d89f66]" />,
      items: ['Node.js', 'Express', 'REST API v1', 'Zod Validation', 'Argon2/Bcrypt Security']
    },
    {
      category: 'Relational Database',
      icon: <Database className="w-4 h-4 text-[#d89f66]" />,
      items: ['PostgreSQL 16', 'ACID Transactions', 'Relational Schemas', 'Database Indexing', 'Automated Backups']
    },
    {
      category: 'Security & Hardening',
      icon: <Shield className="w-4 h-4 text-[#d89f66]" />,
      items: ['HTTP-Only Cookies', 'CSRF Protection', 'Strict Input Sanitization', 'Rate Limiting', 'Audit Logging']
    },
    {
      category: 'Performance & Edge',
      icon: <Zap className="w-4 h-4 text-[#d89f66]" />,
      items: ['Sub-Second LCP', 'Core Web Vitals', 'Asset Compression', 'Zero Layout Shifts', 'Clean Bundles']
    },
    {
      category: 'Technical SEO & Discovery',
      icon: <Search className="w-4 h-4 text-[#d89f66]" />,
      items: ['JSON-LD Schema.org', 'Dynamic XML Sitemaps', 'Robots.txt', 'Canonical Links', 'Local Kathmandu Intent']
    }
  ];

  return (
    <section className="py-24 border-t border-white/[0.08] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-16">
          <div className="text-xs font-semibold tracking-[0.2em] text-[#d89f66] uppercase mb-2">
            ENGINEERING STACK
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#f1f2f4] tracking-tight mb-4">
            Production-Grade Technologies &amp; Standards
          </h2>
          <p className="text-sm text-[#9ca3af] leading-relaxed">
            We avoid fragile dependencies and trendy shortcuts. Every technology chosen has proven commercial stability, high execution speed, and long-term security.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stacks.map((s, idx) => (
            <div
              key={idx}
              className="bg-[#101216] border border-white/[0.06] rounded-2xl p-6 space-y-4 hover:border-white/[0.12] transition-colors"
            >
              <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.06]">
                <div className="w-8 h-8 rounded-lg bg-[#181b22] flex items-center justify-center">
                  {s.icon}
                </div>
                <h3 className="text-sm font-bold text-[#f1f2f4]">{s.category}</h3>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {s.items.map((item, i) => (
                  <span
                    key={i}
                    className="text-xs font-mono px-2.5 py-1 rounded bg-[#16181f] border border-white/[0.05] text-[#9ca3af]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
