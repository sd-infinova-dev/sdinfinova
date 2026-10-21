import React, { useState } from 'react';

import { X, Send, Clock, ShieldCheck, MessageCircle, ExternalLink } from 'lucide-react';

interface FloatingWhatsAppProps {
  whatsappNumber?: string;
  studioName?: string;
}

export const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({
  whatsappNumber = '9779800000000',
  studioName = 'SD Infinova'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '');

  const defaultGreeting = 'Hello SD Infinova! I would like to discuss a web engineering project.';

  const directChatUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(defaultGreeting)}`;

  const quickStarters = [
    { label: 'Business Website (NPR 7,500)', msg: 'Hi SD Infinova! I would like to build a Business Website (NPR 7,500 package).' },
    { label: 'Landing Page (NPR 4,999)', msg: 'Hello SD Infinova! I need a fast, responsive Landing Page for my business.' },
    { label: 'E-commerce / Custom System', msg: 'Hi, can you give me a custom quotation for an E-commerce / web app?' },
    { label: 'Website Redesign / SEO', msg: 'Hello! I need to redesign my existing website and optimize for Google search.' }
  ];

  const handleOpenWhatsApp = (message: string) => {
    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  return (
    <aside aria-label="WhatsApp quick chat" className="fixed bottom-6 right-6 z-40 select-none">
      {/* Quick-Chat Drawer */}
      {isOpen && (
        <div
          className="mb-4 w-[320px] sm:w-[360px] bg-[#101217] border border-white/[0.12] rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200"
          role="dialog"
          aria-label="Direct WhatsApp Chat Drawer"
        >
          {/* Header */}
          <div className="bg-[#0f2e1b] border-b border-[#25D366]/30 p-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              {/* WhatsApp Icon */}
              <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center text-white shadow-md">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-sm flex items-center gap-1.5">
                  <span>{studioName} WhatsApp</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#25D366]" />
                </div>
                <div className="text-[11px] text-[#4ade80] flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
                  <span>Online · Engineering Lead</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close WhatsApp Drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4 text-xs">
            {/* Friendly Studio Message */}
            <div className="p-3.5 rounded-2xl bg-[#171a22] border border-white/[0.06] text-[#d1d5db] leading-relaxed">
              <p>
                Namaste! 🙏 Welcome to <strong>SD Infinova</strong>.
              </p>
              <p className="mt-1 text-[#9ca3af]">
                Chat directly with our engineering lead on WhatsApp for quick inquiries, custom project scopes, and pricing estimates.
              </p>
              <div className="mt-2 text-[10px] text-[#4ade80] flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" />
                <span>Typically replies in 15–30 mins</span>
              </div>
            </div>

            {/* Quick-starter Questions */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">
                Select a topic to chat:
              </div>
              {quickStarters.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleOpenWhatsApp(item.msg)}
                  className="w-full text-left p-2.5 rounded-xl bg-[#14161d] border border-white/[0.06] hover:border-[#25D366]/40 hover:bg-[#181c24] text-[#d1d5db] text-xs transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <span className="truncate pr-2 font-medium">{item.label}</span>
                  <Send className="w-3 h-3 text-[#25D366] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              ))}
            </div>

            {/* Primary Action Button */}
            <div className="pt-1">
              <a
                href={directChatUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="w-full py-3.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:shadow-[0_0_20px_rgba(37,211,102,0.4)] transition-all cursor-pointer"
              >
                <span>Open Direct WhatsApp Chat</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Floating Trigger Actions */}
      <div className="flex items-center gap-2">
        {/* Quick prompt badge next to logo button */}
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#111317]/95 backdrop-blur-md border border-white/[0.12] hover:border-[#25D366]/50 text-xs font-semibold text-white shadow-xl hover:bg-[#181c24] transition-all cursor-pointer group"
          >
            <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
            <span className="text-[#e5e7eb] group-hover:text-white">Chat on WhatsApp</span>
          </button>
        )}

        {/* Main Floating WhatsApp Logo Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 relative group cursor-pointer"
          aria-label="Chat directly with SD Infinova on WhatsApp"
          title="Click to chat directly on WhatsApp"
        >
          {/* Subtle pulse aura */}
          <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-35 animate-ping pointer-events-none" />

          {/* WhatsApp Vector Icon */}
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current relative z-10">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
          </svg>
        </button>
      </div>
    </aside>
  );
};
