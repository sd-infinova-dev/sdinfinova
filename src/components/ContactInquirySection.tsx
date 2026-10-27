import React, { useState, useEffect } from 'react';

import {
  Send,
  CheckCircle2,
  MessageSquare,
  Mail,
  Phone,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ContactInquirySectionProps {
  initialProjectType?: string;
  initialBudget?: string;
  initialDescription?: string;
  whatsappNumber?: string;
  studioEmail?: string;
}

export const ContactInquirySection: React.FC<ContactInquirySectionProps> = ({
  initialProjectType = '',
  initialBudget = '',
  initialDescription = '',
  whatsappNumber = '9779800000000',
  studioEmail = 'sd.infinova@gmail.com'
}) => {
  const cleanWhatsApp = whatsappNumber.replace(/[^0-9]/g, '');

  const [formData, setFormData] = useState({
    name: '',
    business_name: '',
    email: '',
    phone: '',
    location: 'Nepal',
    project_type: initialProjectType || 'Business Website (NPR 7,500)',
    budget_range: initialBudget || 'NPR 7,500 (Business Website - Recommended)',
    expected_timeline: '5 to 8 working days',
    description: initialDescription || '',
    preferred_contact: 'whatsapp' as 'whatsapp' | 'email' | 'phone'
  });

  // Synchronize when prefilled from pricing package or estimator
  useEffect(() => {
    if (initialProjectType || initialBudget || initialDescription) {
      setFormData((prev) => ({
        ...prev,
        project_type: initialProjectType || prev.project_type,
        budget_range: initialBudget || prev.budget_range,
        description: initialDescription || prev.description
      }));
    }
  }, [initialProjectType, initialBudget, initialDescription]);

  const [loading, setLoading] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    inquiryId: string;
    preferredContact: 'whatsapp' | 'email' | 'phone';
    whatsappUrl: string;
    mailtoUrl: string;
    summaryText: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const projectTypes = [
    'Landing Page Website (NPR 4,999)',
    'Business Website (NPR 7,500)',
    'Professional Website (NPR 12,500)',
    'E-commerce & Custom Systems (From NPR 15,000)',
    'Website Design & Development',
    'Website Redesign & UI/UX Improvements',
    'Custom Web Applications & Dashboards',
    'Backend API & Database Integration',
    'Technical SEO & Performance Optimization',
    'Ongoing Maintenance & Support'
  ];

  const budgetOptions = [
    'NPR 4,999 (Landing Page Package)',
    'NPR 7,500 (Business Website - Recommended)',
    'NPR 12,500 (Professional Website Package)',
    'From NPR 15,000 (E-commerce / Custom Systems)',
    'Custom / Undecided Scope',
    'International / USD Budget ($500 - $3,500+)'
  ];

  const timelines = [
    '3 to 5 working days (Landing Page)',
    '5 to 8 working days (Business Website)',
    '7 to 12 working days (Professional)',
    'Flexible / Milestone-based (Custom Systems)'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.name.trim() || !formData.email.trim() || !formData.description.trim()) {
      setErrorMessage('Please fill in your name, email, and a brief description of your project.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/v1/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit inquiry.');
      }

      // Generate structured summary
      const summary =
        `*SD INFINOVA — PROJECT INQUIRY*\n` +
        `👤 Client: ${formData.name}\n` +
        `🏢 Business: ${formData.business_name || 'Individual'}\n` +
        `📧 Email: ${formData.email}\n` +
        `📱 Phone/WhatsApp: ${formData.phone || 'N/A'}\n` +
        `🎯 Preferred Contact: ${formData.preferred_contact.toUpperCase()}\n` +
        `📦 Scope: ${formData.project_type}\n` +
        `💰 Budget: ${formData.budget_range}\n` +
        `⏱️ Timeline: ${formData.expected_timeline}\n\n` +
        `📝 Description:\n${formData.description}\n` +
        `Reference ID: ${data.inquiry_id}`;

      const whatsappLink = data.whatsapp_url || `https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent(summary)}`;
      const mailtoLink = data.mailto_url || `mailto:${studioEmail}?subject=${encodeURIComponent(`New Project Inquiry from ${formData.name}`)}&body=${encodeURIComponent(summary.replace(/\*/g, ''))}`;

      setSubmissionResult({
        inquiryId: data.inquiry_id,
        preferredContact: formData.preferred_contact,
        whatsappUrl: whatsappLink,
        mailtoUrl: mailtoLink,
        summaryText: summary
      });

      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#25D366', '#d89f66', '#ffffff']
      });

      // Store submission result in sessionStorage for the success page
      const storedResult = {
        inquiryId: data.inquiry_id,
        preferredContact: formData.preferred_contact,
        whatsappUrl: whatsappLink,
        mailtoUrl: mailtoLink,
        summaryText: summary
      };
      sessionStorage.setItem('inquiryResult', JSON.stringify(storedResult));
      // Navigate to the dedicated success route
      window.location.assign('/inquiry-success');
      // Do NOT automatically open WhatsApp or Email; user will click the buttons on the success page.
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error submitting inquiry. Please contact us on WhatsApp directly.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySummary = () => {
    if (submissionResult?.summaryText) {
      navigator.clipboard.writeText(submissionResult.summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleResetForm = () => {
    setSubmissionResult(null);
    setFormData({
      name: '',
      business_name: '',
      email: '',
      phone: '',
      location: 'Nepal',
      project_type: 'Business Website (NPR 7,500)',
      budget_range: 'NPR 7,500 (Business Website - Recommended)',
      expected_timeline: '5 to 8 working days',
      description: '',
      preferred_contact: 'whatsapp'
    });
  };

  return (
    <section id="contact" className="py-24 border-t border-white/[0.08] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Context & Direct Contact Channels */}
          <div className="lg:col-span-5 space-y-8">
            <div>
              <div className="text-xs font-semibold tracking-[0.2em] text-[#d89f66] uppercase mb-2">
                PROJECT INQUIRY &amp; INSTANT CHAT
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#f1f2f4] tracking-tight mb-4">
                Let's Build Something Exceptional Together.
              </h2>
              <p className="text-sm text-[#9ca3af] leading-relaxed">
                Tell us about your organization and project vision. We evaluate technical feasibility, provide honest budget recommendations, and respond promptly via WhatsApp or Email.
              </p>
            </div>

            {/* Direct Contact Cards */}
            <div className="space-y-4">
              {/* WhatsApp Direct Chat Card */}
              <a
                href={`https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent('Hello SD Infinova! I would like to chat with you about a website project.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 sm:p-5 rounded-2xl bg-[#0f2418] border border-[#25D366]/40 hover:border-[#25D366] transition-all duration-200 group shadow-lg hover:shadow-[0_0_25px_rgba(37,211,102,0.2)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#25D366] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform shrink-0">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 fill-current">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span>Chat on WhatsApp Directly</span>
                        <span className="text-[10px] bg-[#25D366]/20 text-[#4ade80] px-2 py-0.5 rounded-full font-mono shrink-0">
                          Instant Reply
                        </span>
                      </div>
                      <div className="text-xs text-[#9ca3af] mt-0.5 truncate">
                        Click to chat directly with our engineering lead on WhatsApp
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-[#25D366] group-hover:translate-x-1 transition-transform shrink-0" />
                </div>
              </a>

              {/* Direct Email Card */}
              <a
                href={`mailto:${studioEmail}?subject=Project%20Inquiry%20for%20SD%20Infinova`}
                className="block p-4 sm:p-5 rounded-2xl bg-[#111317] border border-white/[0.08] hover:border-[#d89f66]/50 transition-all duration-200 group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#1d2028] border border-white/[0.1] flex items-center justify-center text-[#d89f66] group-hover:scale-105 transition-transform shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white">Direct Email</div>
                      <div className="text-xs text-[#d89f66] mt-0.5 font-mono truncate">{studioEmail}</div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#9ca3af] group-hover:text-white group-hover:translate-x-0.5 transition-transform shrink-0" />
                </div>
              </a>

              {/* Working Hours */}
              <div className="p-4 rounded-xl bg-[#121419] border border-white/[0.05] text-xs text-[#9ca3af] space-y-1">
                <div className="text-white font-semibold">Studio Response Times:</div>
                <div>WhatsApp: Typically within 15–30 minutes</div>
                <div>Email Inquiries: Within 24 business hours</div>
                <div className="text-[11px] text-[#6b7280] pt-1">
                  Sunday – Friday: 9:00 AM – 6:00 PM NPT (UTC+5:45)
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Inquiry Form & Post-Submission Screen */}
          <div className="lg:col-span-7">
            <div className="bg-[#101217] border border-white/[0.1] rounded-3xl p-4 sm:p-8 lg:p-10 shadow-xl">
              {submissionResult ? (
                /* Post-Submission Dispatch State */
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* Status Banner */}
                  <div className={`p-6 rounded-2xl border ${submissionResult.preferredContact === 'whatsapp'
                      ? 'bg-[#0b2416] border-[#25D366]/40'
                      : 'bg-[#1b170e] border-[#d89f66]/40'
                    }`}>
                    <div className="flex items-center gap-3.5 mb-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${submissionResult.preferredContact === 'whatsapp'
                          ? 'bg-[#25D366] text-white'
                          : 'bg-[#d89f66] text-[#090a0c]'
                        }`}>
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          {submissionResult.preferredContact === 'whatsapp'
                            ? 'Inquiry Prepared for WhatsApp Chat!'
                            : 'Inquiry Dispatched to Email!'}
                        </h3>
                        <p className="text-xs text-[#d1d5db]">
                          {submissionResult.preferredContact === 'whatsapp'
                            ? 'Your message is ready to send directly to SD Infinova on WhatsApp.'
                            : `Your message has been sent to ${studioEmail} & recorded in our system.`}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-[#9ca3af] leading-relaxed pt-2 border-t border-white/[0.08]">
                      {submissionResult.preferredContact === 'whatsapp'
                        ? 'If WhatsApp did not open automatically, click the primary button below to launch the chat with all your project details prefilled.'
                        : 'Click below to review or send the email thread directly from your mail client, or connect on WhatsApp for instant confirmation.'}
                    </p>
                  </div>

                  {/* Primary & Secondary Action Buttons */}
                  <div className="space-y-3">
                    {submissionResult.preferredContact === 'whatsapp' ? (
                      <>
                        <a
                          href={submissionResult.whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-4 px-6 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-sm flex items-center justify-center gap-3 shadow-xl hover:shadow-[0_0_25px_rgba(37,211,102,0.4)] transition-all cursor-pointer"
                        >
                          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                          </svg>
                          <span>Open WhatsApp &amp; Send Inquiry Message Now</span>
                        </a>

                        <a
                          href={submissionResult.mailtoUrl}
                          className="w-full py-3 px-5 rounded-xl bg-[#161922] hover:bg-[#1d212c] text-[#d1d5db] hover:text-white border border-white/[0.08] text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                        >
                          <Mail className="w-4 h-4 text-[#d89f66]" />
                          <span>Also Send Copy to Email ({studioEmail})</span>
                        </a>
                      </>
                    ) : (
                      <>
                        <a
                          href={submissionResult.mailtoUrl}
                          className="w-full py-4 px-6 rounded-xl bg-[#d89f66] hover:bg-[#eec397] text-[#090a0c] font-bold text-sm flex items-center justify-center gap-3 shadow-xl hover:shadow-[0_0_25px_rgba(216,159,102,0.35)] transition-all cursor-pointer"
                        >
                          <Mail className="w-5 h-5" />
                          <span>Open in Email App (Gmail / Outlook / Apple Mail)</span>
                        </a>

                        <a
                          href={submissionResult.whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3 px-5 rounded-xl bg-[#0f2418] hover:bg-[#153423] text-[#4ade80] border border-[#25D366]/40 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                          </svg>
                          <span>Also Notify on WhatsApp</span>
                        </a>
                      </>
                    )}
                  </div>

                  {/* Form Summary Card */}
                  <div className="p-4 rounded-xl bg-[#141720] border border-white/[0.06] space-y-3">
                    <div className="flex items-center justify-between text-xs text-[#9ca3af]">
                      <span className="font-semibold text-white">Inquiry Summary</span>
                      <button
                        type="button"
                        onClick={handleCopySummary}
                        className="flex items-center gap-1 text-[#d89f66] hover:text-[#eec397] transition-colors"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied' : 'Copy details'}</span>
                      </button>
                    </div>

                    <pre className="text-[11px] text-[#cbd5e1] font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto p-3 rounded-lg bg-[#0e1015]">
                      {submissionResult.summaryText}
                    </pre>

                    <div className="text-[11px] text-[#6b7280]">
                      Reference ID: <span className="font-mono text-[#9ca3af]">{submissionResult.inquiryId}</span> · Stored securely in SD Infinova database.
                    </div>
                  </div>

                  {/* Reset Button */}
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="text-xs text-[#9ca3af] hover:text-white underline underline-offset-4 cursor-pointer"
                    >
                      Submit Another Project Inquiry
                    </button>
                  </div>
                </div>
              ) : (
                /* Main Form */
                <form onSubmit={handleSubmit} className="space-y-6">
                  {errorMessage && (
                    <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Row 1: Name and Business */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#d1d5db] mb-1.5">
                        Your Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Suman Sharma"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#171a22] border border-white/[0.08] text-sm text-[#f1f2f4] placeholder-[#4b5563] focus:outline-none focus:border-[#d89f66] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#d1d5db] mb-1.5">
                        Business or Brand Name
                      </label>
                      <input
                        type="text"
                        value={formData.business_name}
                        onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                        placeholder="e.g. Apex Health Clinic"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#171a22] border border-white/[0.08] text-sm text-[#f1f2f4] placeholder-[#4b5563] focus:outline-none focus:border-[#d89f66] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Row 2: Email and Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#d1d5db] mb-1.5">
                        Work / Personal Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="name@company.com"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#171a22] border border-white/[0.08] text-sm text-[#f1f2f4] placeholder-[#4b5563] focus:outline-none focus:border-[#d89f66] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#d1d5db] mb-1.5">
                        Phone or WhatsApp (Optional)
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+977 98..."
                        className="w-full px-4 py-2.5 rounded-xl bg-[#171a22] border border-white/[0.08] text-sm text-[#f1f2f4] placeholder-[#4b5563] focus:outline-none focus:border-[#d89f66] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Row 3: Project Type & Budget Range */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#d1d5db] mb-1.5">
                        Project Type / Package *
                      </label>
                      <select
                        value={formData.project_type}
                        onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#171a22] border border-white/[0.08] text-sm text-[#f1f2f4] focus:outline-none focus:border-[#d89f66] transition-colors"
                      >
                        {projectTypes.map((pt) => (
                          <option key={pt} value={pt} className="bg-[#171a22] text-[#f1f2f4]">
                            {pt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#d1d5db] mb-1.5">
                        Expected Budget Range (NPR)
                      </label>
                      <select
                        value={formData.budget_range}
                        onChange={(e) => setFormData({ ...formData, budget_range: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#171a22] border border-white/[0.08] text-sm text-[#f1f2f4] focus:outline-none focus:border-[#d89f66] transition-colors"
                      >
                        {budgetOptions.map((b) => (
                          <option key={b} value={b} className="bg-[#171a22] text-[#f1f2f4]">
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 4: Timeline & Preferred Contact Method */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#d1d5db] mb-1.5">
                        Target Timeline
                      </label>
                      <select
                        value={formData.expected_timeline}
                        onChange={(e) => setFormData({ ...formData, expected_timeline: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#171a22] border border-white/[0.08] text-sm text-[#f1f2f4] focus:outline-none focus:border-[#d89f66] transition-colors"
                      >
                        {timelines.map((tl) => (
                          <option key={tl} value={tl} className="bg-[#171a22] text-[#f1f2f4]">
                            {tl}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Preferred Contact Method with dynamic routing feedback */}
                    <div>
                      <label className="block text-xs font-medium text-[#d1d5db] mb-1.5">
                        Preferred Contact Method *
                      </label>
                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, preferred_contact: 'whatsapp' })}
                          className={`py-2 px-3 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${formData.preferred_contact === 'whatsapp'
                              ? 'bg-[#0f2e1b] border-[#25D366] text-[#4ade80] shadow-sm'
                              : 'bg-[#171a22] border-white/[0.08] text-[#9ca3af] hover:text-white'
                            }`}
                        >
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                          </svg>
                          <span>WhatsApp</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, preferred_contact: 'email' })}
                          className={`py-2 px-3 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${formData.preferred_contact === 'email'
                              ? 'bg-[#261d11] border-[#d89f66] text-[#d89f66] shadow-sm'
                              : 'bg-[#171a22] border-white/[0.08] text-[#9ca3af] hover:text-white'
                            }`}
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Email</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Dispatch explanation pill */}
                  <div className="p-3 rounded-xl bg-[#141720] border border-white/[0.06] flex items-center gap-2 text-[11px] text-[#9ca3af]">
                    {formData.preferred_contact === 'whatsapp' ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-[#25D366] shrink-0" />
                        <span>
                          <strong>WhatsApp Selected:</strong> Submitting will prepare a prefilled WhatsApp message ready for you to open manually.
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-[#d89f66] shrink-0" />
                        <span>
                          <strong>Email Selected:</strong> Submitting will prepare an email draft ready for you to send manually.
                        </span>
                      </>
                    )}
                  </div>

                  {/* Row 5: Project Description */}
                  <div>
                    <label className="block text-xs font-medium text-[#d1d5db] mb-1.5">
                      Project Description &amp; Goals *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Briefly describe what you are looking to build, any reference sites you admire, and key features required..."
                      className="w-full px-4 py-3 rounded-xl bg-[#171a22] border border-white/[0.08] text-sm text-[#f1f2f4] placeholder-[#4b5563] focus:outline-none focus:border-[#d89f66] transition-colors resize-y leading-relaxed font-sans"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all duration-200 shadow-md cursor-pointer disabled:opacity-50 ${formData.preferred_contact === 'whatsapp'
                          ? 'bg-[#25D366] hover:bg-[#20ba59] text-white hover:shadow-[0_0_25px_rgba(37,211,102,0.35)]'
                          : 'bg-[#d89f66] hover:bg-[#eec397] text-[#090a0c] hover:shadow-[0_0_25px_rgba(216,159,102,0.35)]'
                        }`}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Routing Project Inquiry...</span>
                        </>
                      ) : formData.preferred_contact === 'whatsapp' ? (
                        <>
                          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                          </svg>
                          <span>Submit &amp; Open WhatsApp Chat</span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          <span>Submit &amp; Send to Email</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
