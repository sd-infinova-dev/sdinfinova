-- Cloudflare D1 Default Seed Data for SD Infinova
-- Applied when database is initialized

-- Schema migration record
INSERT OR IGNORE INTO schema_migrations (version, applied_at)
VALUES ('001_initial_schema', datetime('now'));

-- Services
INSERT OR IGNORE INTO services (id, slug, title, tagline, description, deliverables, workflow, problems_solved, icon_name, sort_order, is_published)
VALUES
('srv_1', 'website-design-development', 'Website Design & Development',
 'Custom high-performance websites engineered for credibility and conversion.',
 'From bespoke digital agency experiences to corporate showcases, we craft clean, accessible, lightning-fast websites that communicate your distinct brand value.',
 '["Custom Responsive Design", "Semantic HTML5 & Modern CSS/Tailwind", "Interactive Micro-animations", "Speed & Performance Optimization", "Cross-browser & Mobile Testing"]',
 '["Discovery & Wireframing", "High-Fidelity Visual Design", "Frontend Engineering", "Quality Assurance & Lighthouse Audit", "Launch & DNS Handover"]',
 '["Outdated visual presence", "Poor mobile layout responsiveness", "High bounce rates from slow page loads", "Lack of brand differentiation"]',
 'Layout', 1, 1),

('srv_2', 'business-websites-landing-pages', 'Business Websites & Landing Pages',
 'Lead-generating digital storefronts tailored for Nepal SMBs and global clients.',
 'Targeted marketing pages and corporate web presences built to guide qualified prospects to take decisive action, contact your sales team, or request estimates.',
 '["Conversion-focused Copywriting Architecture", "WhatsApp & Direct Lead Funnels", "Local SEO & Google Business Integration", "Contact & Estimate Forms", "Analytics & Event Tracking"]',
 '["Market & Competitor Analysis", "Conversion Architecture", "Design & Copy Implementation", "Lead Capture Form Verification", "Live Production Rollout"]',
 '["Unclear value propositions", "No qualified inbound leads", "Visitors leaving without contacting", "Missed local search opportunities in Nepal"]',
 'TrendingUp', 2, 1),

('srv_3', 'website-redesign-ui-ux', 'Website Redesign & UI/UX Improvements',
 'Modernize legacy websites with contemporary aesthetics and frictionless usability.',
 'Transform cluttered, outdated platforms into sleek, high-retention digital assets. We audit your existing site, resolve UX bottlenecks, and re-engineer the complete presentation layer.',
 '["Comprehensive UX & Heuristic Audit", "Information Architecture Reorganization", "Modern Design System & Token Setup", "Mobile Touch Optimization", "Zero-downtime Content Migration"]',
 '["Current Site Audit", "User Journey Mapping", "Prototyping & Alignment", "Iterative Redesign Implementation", "Staging Review & Cutover"]',
 '["Dated 2010s aesthetic", "Complex, confusing navigation", "Poor accessibility and readability", "Inability to update content easily"]',
 'Sparkles', 3, 1),

('srv_4', 'custom-web-apps-dashboards', 'Custom Web Applications & Dashboards',
 'Tailor-made software platforms, internal tooling, and client portals.',
 'Full-stack web software built for your exact operational workflows. Dynamic single-page applications, administrative consoles, and multi-tenant portals engineered with React, TypeScript, and robust databases.',
 '["Role-Based Access Control (RBAC)", "Real-time Data Visualization", "Interactive Data Tables & Exporting", "Secure REST API Endpoints", "Automated Background Workflows"]',
 '["Technical Architecture Scoping", "Database & Entity Schema Design", "API Specification", "Frontend & Backend Development", "Security Hardening & Deployment"]',
 '["Manual spreadsheet bottlenecks", "Disparate software tools that do not sync", "Lack of visibility into key business metrics", "Off-the-shelf software limitations"]',
 'Cpu', 4, 1),

('srv_5', 'backend-api-database-integration', 'Backend API & Database Integration',
 'Resilient server architectures, data pipelines, and third-party integrations.',
 'Engineered backend foundations that power modern applications. Relational PostgreSQL architecture, clean RESTful APIs, secure authentication, and payment gateway connections.',
 '["PostgreSQL Database Schema & Migrations", "Secure Token & Session Authentication", "eSewa, Khalti, or Stripe Payment Gateways", "Third-Party Webhook Handlers", "Automated Database Backups"]',
 '["Data Modeling", "API Endpoint Contract Definition", "Logic Implementation & Validation", "Stress Testing & Indexing", "Continuous Production Monitoring"]',
 '["Slow database queries", "Unsecured administrative endpoints", "Inflexible data structures", "Failed payment callbacks"]',
 'Database', 5, 1),

('srv_6', 'technical-seo-performance-optimization', 'Technical SEO & Performance Optimization',
 'Sub-second load times, stellar Core Web Vitals, and dominant local rankings.',
 'Audited and optimized web engineering that boosts your organic visibility in Nepal and overseas. We tackle Core Web Vitals (LCP, INP, CLS), Schema.org structured data, and clean metadata.',
 '["Core Web Vitals Audit & Remediation", "Schema.org JSON-LD Structured Data", "Automated XML Sitemaps & robots.txt", "Asset Compression & Image Serving", "Local Search Geo-Optimization"]',
 '["Baseline Performance Benchmark", "Asset & Bundle Elimination", "Metadata & Structured Data Injection", "Post-Optimization Audit", "Monthly Ranking & Traffic Monitoring"]',
 '["Poor Google rankings in Kathmandu and Nepal", "Failing Core Web Vitals scores", "Bloated JavaScript bundles", "Missing rich snippet search results"]',
 'Zap', 6, 1),

('srv_7', 'business-automation-digital-solutions', 'Business Automation & Digital Solutions',
 'Eliminate repetitive manual tasks with automated digital pipelines.',
 'Connect your inquiry pipelines, automated email confirmations, CRM notifications, and operational spreadsheets into a single unified business machine.',
 '["Automated Customer Notifications", "CRM & Lead Intake Syncing", "Automated PDF Invoice & Receipt Generation", "Webhook & Third-party Integrations", "System Health Monitoring"]',
 '["Workflow Assessment", "Automation Architecture Design", "Integration Configuration & Testing", "Fail-Safe Error Handling", "Staff Walkthrough & Documentation"]',
 '["Delayed customer follow-ups", "Lost customer contact details", "Hours spent manually copying data", "Human error in repetitive tasks"]',
 'Workflow', 7, 1),

('srv_8', 'website-maintenance-technical-support', 'Website Maintenance & Technical Support',
 'Reliable ongoing management, security monitoring, and uptime assurance.',
 'Peace of mind for business owners. We handle routine dependency updates, SSL certificate monitoring, server health checks, regular database backups, and emergency hotfixes.',
 '["24/7 Uptime & Error Alerting", "Weekly Security & Package Updates", "Automated Offsite Database Backups", "Content Update Requests (within 24h)", "Priority Developer On-Call Support"]',
 '["Onboarding & Health Audit", "Continuous Monitoring Setup", "Weekly Maintenance Cycles", "Monthly Health & Traffic Reports"]',
 '["Websites hacked due to outdated software", "Downtime unnoticed for days", "Data loss from absent backups", "No engineer available when issues arise"]',
 'ShieldCheck', 8, 1);

-- Projects
INSERT OR IGNORE INTO projects (id, slug, title, category, short_description, full_case_study, cover_image, gallery_images, tech_stack, live_url, repo_url, client_name, completion_date, is_featured, is_published, metrics)
VALUES
('prj_1', 'sd-tech-photograph', 'SD Tech Photograph', 'Photography & Portfolio',
 'An editorial portfolio and photo client delivery gallery platform featuring ultra-fast image loading and dark studio aesthetics.',
 'SD Tech Photograph required an editorial digital showcase to display high-resolution commercial and creative photography without sacrificing loading speeds on mobile connections in Nepal. We engineered an image-optimized gallery with progressive WebP loading, masonry layouts, custom lightboxes, and a private client proofing section where clients review and select proofs directly.',
 '/assets/projects/sd-tech-photograph.png', '["/assets/projects/sd-tech-photograph.png"]',
 '["React", "TypeScript", "Tailwind CSS", "Vite", "Cloudflare CDN"]',
 'https://sd-tech-photograph-ytpn.vercel.app/', '', 'SD Tech Photography Studio', '2025', 1, 1,
 '[{"label":"Lighthouse Performance","value":"98/100"},{"label":"Average Page Load","value":"0.6s"},{"label":"Client Proofing Speed","value":"3x Faster"}]'),

('prj_2', 'dental-care-clinic-portal', 'Dental Care Clinic Platform', 'Healthcare & Clinic',
 'Patient appointment scheduling portal, clinical service catalog, and doctor directory built for modern healthcare practices.',
 'A premier dental clinic in Kathmandu required a trustworthy, patient-centric digital portal to handle appointment bookings, showcase clinical specialties (Orthodontics, Implants, Cosmetic Dentistry), and answer common patient queries. We designed a clean, calming interface with seamless WhatsApp direct booking, doctor credential profiles, and interactive service breakdowns.',
 '/assets/projects/dental-care.png', '["/assets/projects/dental-care.png"]',
 '["React", "Node.js", "Express", "PostgreSQL", "Tailwind CSS"]',
 'https://dental-rust-two.vercel.app/', '', 'Dental Care Healthcare Clinic', '2025', 1, 1,
 '[{"label":"Online Inquiries","value":"+185%"},{"label":"Booking Drop-off","value":"-60%"},{"label":"Mobile Traffic Share","value":"74%"}]'),

('prj_3', 'nepal-apparel-clothing-store', 'SD Infininov - Dashain Reloaded Festive Clothing', 'E-commerce & Retail',
 'A boutique streetwear and contemporary apparel showcase featuring lookbooks, size charts, and direct Kathmandu order fulfillment.',
 'Created for a growing Nepali clothing label looking to bridge the gap between social media marketing and structured digital ordering. We developed a fluid, mobile-first product catalog with dynamic filterable collections, detailed textile specifications, size guides, and one-click order placement via WhatsApp and bank transfer confirmation.',
 '/assets/projects/clothing-brand.png', '["/assets/projects/clothing-brand.png"]',
 '["React", "TypeScript", "Vite", "PostgreSQL", "Tailwind CSS"]',
 'https://sd-infininova.vercel.app/', '', 'Urban Heritage Apparel', '2025', 1, 1,
 '[{"label":"Monthly Catalog Views","value":"45,000+"},{"label":"Order Inquiry Rate","value":"4.8%"},{"label":"Cart Checkout Time","value":"< 45s"}]'),

('prj_4', 'find-my-hostel-nepal', 'FindMyHostel Platform', 'Custom Web Application',
 'Comprehensive student hostel and accommodation directory platform with location filters, amenity comparisons, and direct landlord contact.',
 'FindMyHostel connects students and young professionals across Kathmandu, Lalitpur, and Pokhara with verified hostels. Built with complex filtering (by college proximity, price per bed, Wi-Fi, food options), interactive maps, photo tours, and real-time room availability indicators.',
 '/assets/projects/findmyhostel.png', '["/assets/projects/findmyhostel.png"]',
 '["React", "Node.js", "PostgreSQL", "Tailwind CSS", "Map Integration"]',
 'https://findmyhostel.pythonanywhere.com/', '', 'FindMyHostel Nepal', '2026', 1, 1,
 '[{"label":"Verified Listings","value":"120+"},{"label":"Active Monthly Students","value":"15,000+"},{"label":"Search Latency","value":"< 50ms"}]');

-- Blog Posts
INSERT OR IGNORE INTO blog_posts (id, slug, title, excerpt, content, author, cover_image, category, tags, reading_time_minutes, is_published, published_at, seo_title, seo_description)
VALUES
('pst_1', 'why-nepalese-businesses-need-professional-websites',
 'Why Nepalese Businesses Can No Longer Rely on Social Media Alone',
 'Relying exclusively on Facebook pages and Instagram feeds exposes your business to algorithm changes and limits credibility. Here is how a custom website builds permanent commercial equity.',
 'In Nepal''s rapidly digitizing economy, thousands of businesses start with a Facebook page or Instagram profile. While social media is effective for initial discovery, it leaves companies vulnerable to arbitrary algorithm shifts, account suspensions, and zero search presence on Google.\n\n### The Credibility Gap\nWhen a corporate client, tourist, or high-value customer searches for a service in Kathmandu, they start with Google Search. A business with a professional, fast website instantly commands greater authority than a competitor with only an unverified social profile.\n\n### Conversion and Ownership\nA custom website gives you 100% control over the user experience:\n1. **Frictionless inquiry funnels** connecting directly to WhatsApp or your CRM.\n2. **Permanent search rankings** for terms like "best dental clinic Kathmandu" or "custom clothing Nepal".\n3. **Verified brand trust** where you showcase real client testimonials, licenses, and detailed project portfolios without social media clutter.',
 'SD Infinova Engineering', '/assets/aistudio/Screenshot_2026-10-17_122839_0fe2d1b9.png', 'Business & Strategy',
 '["Nepal Business", "Web Strategy", "Brand Credibility", "Digital Growth"]', 5, 1, datetime('now'),
 'Why Nepalese Businesses Need Professional Websites in 2026',
 'Explore why modern businesses in Nepal are moving from social media reliance to high-performance custom web engineering.'),

('pst_2', 'website-design-development-costs-in-nepal',
 'How Much Does a Professional Website Actually Cost in Nepal?',
 'A transparent, honest breakdown of website design pricing in Nepal: from budget landing pages (NPR 15,000) to bespoke web applications (NPR 75,000+).',
 'Website pricing in Nepal is notorious for lack of transparency. Some freelancers quote NPR 5,000 for a hacked WordPress template, while agencies quote NPR 300,000 without explaining the deliverables. At SD Infinova, we believe in radical transparency.\n\n### The Realistic Price Tiers\n\n- **NPR 15,000 – 35,000 (Single-Page & Essential Business Showcase)**: Ideal for local service businesses, clinics, and freelancers needing a fast, responsive, SEO-ready landing page with contact forms and WhatsApp integration.\n- **NPR 35,000 – 75,000 (Multi-Page Corporate & Studio Websites)**: Custom-designed 5 to 10-page platforms with custom CMS, rich service breakdowns, project case studies, and local SEO configuration.\n- **NPR 75,000+ (Custom Web Apps, Dashboards & High-Traffic Portals)**: Bespoke full-stack platforms with PostgreSQL databases, user authentication, automated workflows, and high-concurrency architectures.\n\n### The Cost of Cheap Websites\nA 5,000 NPR template site often breaks on mobile, takes 8 seconds to load, contains security vulnerabilities, and lacks ongoing support. Investing in clean web engineering pays for itself with the first two converted clients.',
 'SD Infinova Engineering', '/assets/aistudio/image_ee582da3.png', 'Pricing & Strategy',
 '["Pricing Nepal", "Web Development Cost", "ROI", "Transparency"]', 6, 1, datetime('now'),
 'Website Design & Development Costs in Nepal (2026 Guide)',
 'Detailed and transparent guide to website design and development costs for Nepalese businesses in 2026.'),

('pst_3', 'local-seo-guide-kathmandu-nepal',
 'Local SEO for Small Businesses in Kathmandu: Dominating Google Search',
 'Practical technical steps to rank your business at the top of Google searches in Nepal without paying for expensive ads.',
 'Local search is the highest-intent marketing channel available in Nepal. When someone searches for "web development company in Kathmandu" or "emergency dentist Lalitpur", they are ready to purchase today.\n\n### Step 1: Technical Foundation\nBefore building backlinks, your website must load in under 1.5 seconds on Ncell and Nepal Telecom mobile data connections. Search engines penalize sluggish websites severely.\n\n### Step 2: Schema.org Structured Data\nImplement local business JSON-LD structured data telling search engines your exact city, service coordinates, opening hours, and contact details.\n\n### Step 3: Localized Content Architecture\nEnsure your service pages naturally integrate regional intent without keyword stuffing: target specific business districts like New Baneshwor, Thamel, Durbarmarg, and Jhamsikhel where your clients reside.',
 'SD Infinova Engineering', '/assets/aistudio/Screenshot_2026-10-17_122839_0fe2d1b9.png', 'SEO & Performance',
 '["Local SEO", "Kathmandu", "Google Ranking", "Core Web Vitals"]', 4, 1, datetime('now'),
 'Local SEO for Businesses in Kathmandu, Nepal | SD Infinova',
 'Learn how to rank your Nepalese business on Google with technical SEO, schema markup, and speed optimization.');

-- Site Settings
INSERT OR IGNORE INTO site_settings (key, value, updated_at)
VALUES
('general', json_object(
  'site_name', 'SD Infinova',
  'tagline', 'Digital Studio & Web Engineering',
  'headline', 'Engineering Digital Experiences Without Limits.',
  'subheadline', 'We design and develop modern websites and digital solutions that help businesses build their online presence and move forward with confidence.',
  'contact_email', 'sd.infinova@gmail.com',
  'contact_phone', '+977 9800000000',
  'whatsapp_number', '9779800000000',
  'location', 'Kathmandu, Nepal',
  'operating_hours', 'Sun – Fri: 9:00 AM – 6:00 PM NPT',
  'social_links', json_object(
    'github', 'https://github.com/sdinfinova',
    'linkedin', 'https://linkedin.com/company/sd-infinova',
    'facebook', 'https://facebook.com/sdinfinova',
    'instagram', 'https://instagram.com/sdinfinova'
  ),
  'announcement_bar', json_object(
    'enabled', json('true'),
    'text', 'Now accepting Q2/Q3 2026 web engineering projects for Nepal & International clients.',
    'link', '#contact'
  ),
  'budget_options', json_array(
    'NPR 4,999 (Landing Page Package)',
    'NPR 7,500 (Business Website - Recommended)',
    'NPR 12,500 (Professional Website Package)',
    'From NPR 15,000 (E-commerce / Custom Systems)',
    'Custom / Undecided Scope'
  )
), datetime('now'));
