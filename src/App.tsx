import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { HeroSection } from './components/HeroSection';
import { WorkShowcase, Project } from './components/WorkShowcase';
import { ServicesSection, ServiceItem } from './components/ServicesSection';
import { PricingSection } from './components/PricingSection';
import { PricingPackage } from './data/pricing';
import { ProcessSection } from './components/ProcessSection';
import { AboutSection } from './components/AboutSection';
import { TechStackSection } from './components/TechStackSection';
import { FAQSection } from './components/FAQSection';
import { BlogSection, BlogPost } from './components/BlogSection';
import { ContactInquirySection } from './components/ContactInquirySection';
import { Footer } from './components/Footer';
import { AdminDashboard } from './components/AdminDashboard';
import { LegalModal } from './components/LegalModal';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';

export default function App() {
  const [activeSection, setActiveSection] = useState<string>('hero');
  const [showAdmin, setShowAdmin] = useState<boolean>(() => {
    return window.location.pathname.startsWith('/admin') || window.location.hash === '#admin';
  });
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | null>(null);

  // Dynamic backend data
  const [settings, setSettings] = useState<any>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Pre-fill parameters for Contact Form
  const [inquiryProjectType, setInquiryProjectType] = useState<string>('');
  const [inquiryBudget, setInquiryBudget] = useState<string>('');
  const [inquiryDescription, setInquiryDescription] = useState<string>('');

  useEffect(() => {
    loadPublicData();
    recordPageView();

    const handleHashChange = () => {
      if (window.location.hash === '#admin' || window.location.pathname.startsWith('/admin')) {
        setShowAdmin(true);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const loadPublicData = async () => {
    setLoading(true);
    try {
      const [settingsRes, servicesRes, projectsRes, blogRes] = await Promise.all([
        fetch('/api/v1/settings'),
        fetch('/api/v1/services'),
        fetch('/api/v1/projects'),
        fetch('/api/v1/blog')
      ]);

      if (settingsRes.ok) setSettings(await settingsRes.json());
      if (servicesRes.ok) setServices(await servicesRes.json());
      if (projectsRes.ok) setProjects(await projectsRes.json());
      if (blogRes.ok) setBlogPosts(await blogRes.json());
    } catch (err) {
      console.error('Failed to load initial backend data:', err);
    } finally {
      setLoading(false);
    }
  };

  const recordPageView = async () => {
    try {
      await fetch('/api/v1/analytics/pageview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: window.location.pathname + window.location.hash,
          referrer: document.referrer
        })
      });
    } catch {}
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    if (id === 'hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleStartInquiry = (serviceName?: string) => {
    if (serviceName) {
      setInquiryProjectType(serviceName);
      setInquiryBudget('NPR 7,500 (Business Website - Recommended)');
    }
    scrollToSection('contact');
  };

  const handleSelectPackage = (pkg: PricingPackage) => {
    setInquiryProjectType(pkg.projectTypeValue);
    setInquiryBudget(pkg.budgetRangeValue);
    setInquiryDescription(
      `Interested in: ${pkg.title} (${pkg.priceDisplay})\n` +
      `Target Delivery: ${pkg.deliveryTime}\n\n` +
      `Project Requirements / Notes:\n`
    );
    scrollToSection('contact');
  };

  const handleApplyEstimate = (projectType: string, budgetRange: string, estimatedScopeText: string) => {
    setInquiryProjectType(projectType);
    setInquiryBudget(budgetRange);
    setInquiryDescription(estimatedScopeText);
    scrollToSection('contact');
  };

  const currentWhatsApp = settings?.whatsapp_number || '9779800000000';
  const currentEmail = settings?.contact_email || 'sd.infinova@gmail.com';

  return (
    <div className="min-h-screen bg-[#090a0c] text-[#f1f2f4] flex flex-col font-sans selection:bg-[#d89f66]/25 selection:text-[#f8caa0]">
      {/* Top Navigation */}
      <Navigation
        activeSection={activeSection}
        onNavigate={scrollToSection}
        onOpenInquiry={() => handleStartInquiry()}
        onOpenAdmin={() => setShowAdmin(true)}
        announcementText={settings?.announcement_bar?.enabled ? settings.announcement_bar.text : undefined}
        whatsappNumber={currentWhatsApp}
      />

      {/* Main Public Website Sections */}
      <main className="flex-1">
        <HeroSection
          onStartProject={() => handleStartInquiry()}
          onExploreWork={() => scrollToSection('work')}
          whatsappNumber={currentWhatsApp}
        />

        <WorkShowcase
          projects={projects}
          loading={loading}
        />

        <ServicesSection
          services={services}
          onSelectService={(s) => handleStartInquiry(s.title)}
          onStartInquiryWithService={handleStartInquiry}
        />

        <PricingSection
          onSelectPackage={handleSelectPackage}
          onApplyEstimate={handleApplyEstimate}
        />

        <ProcessSection />

        <AboutSection />

        <TechStackSection />

        <BlogSection
          posts={blogPosts}
          loading={loading}
        />

        <FAQSection />

        <ContactInquirySection
          initialProjectType={inquiryProjectType}
          initialBudget={inquiryBudget}
          initialDescription={inquiryDescription}
          whatsappNumber={currentWhatsApp}
          studioEmail={currentEmail}
        />
      </main>

      {/* Footer */}
      <Footer
        onNavigate={scrollToSection}
        onOpenAdmin={() => setShowAdmin(true)}
        onOpenPrivacy={() => setLegalModalType('privacy')}
        onOpenTerms={() => setLegalModalType('terms')}
        whatsappNumber={currentWhatsApp}
      />

      {/* Floating WhatsApp Quick Action Button */}
      <FloatingWhatsApp
        whatsappNumber={currentWhatsApp}
        studioName="SD Infinova"
      />

      {/* Admin Panel Console Overlay */}
      {showAdmin && (
        <AdminDashboard
          onClose={() => {
            setShowAdmin(false);
            if (window.location.hash === '#admin') {
              window.history.pushState(null, '', '/');
            }
            loadPublicData(); // Reload content in case admin updated anything
          }}
        />
      )}

      {/* Legal Notices Modal */}
      <LegalModal
        type={legalModalType}
        onClose={() => setLegalModalType(null)}
      />
    </div>
  );
}
