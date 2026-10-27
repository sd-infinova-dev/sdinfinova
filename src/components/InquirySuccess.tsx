// src/components/InquirySuccess.tsx
import React, { useEffect, useState } from 'react';
import { CheckCircle2, Copy, Mail, Check, Loader2, AlertCircle } from 'lucide-react';

interface SubmissionResult {
  inquiryId: string;
  preferredContact: 'whatsapp' | 'email' | 'phone';
  whatsappUrl: string;
  mailtoUrl: string;
  summaryText: string;
}

export const InquirySuccess: React.FC = () => {

  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Set page title and noindex meta tag for SEO
    document.title = 'Inquiry Received | SD Infinova';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);

    const stored = sessionStorage.getItem('inquiryResult');
    if (stored) {
      try {
        setResult(JSON.parse(stored) as SubmissionResult);
        // Optionally clear after loading to avoid persisting on refresh
        // sessionStorage.removeItem('inquiryResult');
      } catch { }
    }
  }, []);

  const handleCopy = () => {
    if (result?.summaryText) {
      navigator.clipboard.writeText(result.summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    sessionStorage.removeItem('inquiryResult');
    // Return to the main page (contact form section will be visible)
    window.location.assign('/');
  };

  if (!result) {
    return (
      <section className="py-24 border-t border-white/[0.08] text-center">
        <h2 className="text-2xl font-bold mb-4 text-[#f1f2f4]">No Inquiry Data Available</h2>
        <p className="text-[#9ca3af] mb-6">
          It looks like you arrived here without submitting an inquiry.
        </p>
        <a
          href="/"
          className="inline-block py-3 px-6 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl transition-colors"
        >
          Return to Inquiry Form
        </a>
      </section>
    );
  }

  return (
    <section className="py-24 border-t border-white/[0.08] relative">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Status Banner */}
        <div
          className={`p-6 rounded-2xl border ${{
            whatsapp: 'bg-[#0b2416] border-[#25D366]/40',
            email: 'bg-[#1b170e] border-[#d89f66]/40',
            phone: 'bg-[#1b170e] border-[#d89f66]/40',
          }[result.preferredContact]}`}
        >
          <div className="flex items-center gap-3.5 mb-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${{
                whatsapp: 'bg-[#25D366] text-white',
                email: 'bg-[#d89f66] text-[#090a0c]',
                phone: 'bg-[#d89f66] text-[#090a0c]'
              }[result.preferredContact]}`}
            >
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {result.preferredContact === 'whatsapp'
                  ? 'Inquiry Prepared for WhatsApp Chat!'
                  : 'Inquiry Details Ready for Email'}
              </h3>
              <p className="text-xs text-[#d1d5db]">
                {result.preferredContact === 'whatsapp'
                  ? 'Your message is ready to send directly to SD Infinova on WhatsApp.'
                  : 'Your inquiry has been recorded. Open the email draft below to review and send your message.'}
              </p>
            </div>
          </div>
          <p className="text-xs text-[#9ca3af] leading-relaxed pt-2 border-t border-white/[0.08]">
            {result.preferredContact === 'whatsapp'
              ? 'If WhatsApp did not open automatically, click the primary button below to launch the chat with all your project details prefilled.'
              : 'Click below to open a prefilled email draft and send it from your mail client, or connect on WhatsApp for instant confirmation.'}
          </p>
        </div>
        {/* Primary & Secondary Actions */}
        <div className="space-y-3 mt-6">
          {result.preferredContact === 'whatsapp' ? (
            <>
              <a
                href={result.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 px-6 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-sm flex items-center justify-center gap-3 shadow-xl hover:shadow-[0_0_25px_rgba(37,211,102,0.4)] transition-all"
              >
                Open WhatsApp & Send Inquiry Message Now
              </a>
              <a
                href={result.mailtoUrl}
                target="_blank" rel="noopener noreferrer" className="w-full py-3 px-5 rounded-xl bg-[#161922] hover:bg-[#1d212c] text-[#d1d5db] hover:text-white border border-white/[0.08] text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Mail className="w-4 h-4 text-[#d89f66]" />
                Also Send Copy to Email
              </a>
            </>
          ) : (
            <>
              <a
                href={result.mailtoUrl}
                target="_blank" rel="noopener noreferrer" className="w-full py-4 px-6 rounded-xl bg-[#d89f66] hover:bg-[#eec397] text-[#090a0c] font-bold text-sm flex items-center justify-center gap-3 shadow-xl hover:shadow-[0_0_25px_rgba(216,159,102,0.35)] transition-all"
              >
                <Mail className="w-5 h-5" />
                Open in Email App (Gmail / Outlook / Apple Mail)
              </a>
              <a
                href={result.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-5 rounded-xl bg-[#0f2418] hover:bg-[#153423] text-[#4ade80] border border-[#25D366]/40 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                Also Notify on WhatsApp
              </a>
            </>
          )}
        </div>
        {/* Summary Card */}
        <div className="p-4 rounded-xl bg-[#141720] border border-white/[0.06] space-y-3 mt-6">
          <div className="flex items-center justify-between text-xs text-[#9ca3af]">
            <span className="font-semibold text-white">Inquiry Summary</span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 text-[#d89f66] hover:text-[#eec397] transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy details'}</span>
            </button>
          </div>
          <pre className="text-[11px] text-[#cbd5e1] font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto p-3 rounded-lg bg-[#0e1015]">
            {result.summaryText}
          </pre>
          <div className="text-[11px] text-[#6b7280]">
            Reference ID: <span className="font-mono text-[#9ca3af]">{result.inquiryId}</span> · Stored securely in SD Infinova database.
          </div>
        </div>
        {/* Reset Button */}
        <div className="pt-4 text-center">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-[#9ca3af] hover:text-white underline underline-offset-4 cursor-pointer"
          >
            Submit Another Project Inquiry
          </button>
        </div>
      </div>
    </section>
  );
};
export default InquirySuccess;
