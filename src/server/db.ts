import { PGlite } from '@electric-sql/pglite';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

// Persistent data directory for PostgreSQL
const DATA_DIR = path.resolve(process.cwd(), 'data/postgres');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Remove stale postmaster.pid lock file if server previously stopped ungracefully
const pidFile = path.join(DATA_DIR, 'postmaster.pid');
if (fs.existsSync(pidFile)) {
  try {
    fs.unlinkSync(pidFile);
  } catch {}
}

let pgInstance: PGlite;
try {
  pgInstance = new PGlite(DATA_DIR);
} catch (err) {
  console.warn('[PostgreSQL] Could not open persistent data dir, initializing in-memory fallback:', err);
  pgInstance = new PGlite();
}

export const pg = pgInstance;

export async function initDatabase() {
  console.log('[PostgreSQL] Initializing tables in persistent storage...');

  await pg.exec(`
    -- Admin Users
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Admin Sessions
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES admin_users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Services
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      tagline TEXT NOT NULL,
      description TEXT NOT NULL,
      deliverables JSONB DEFAULT '[]'::jsonb,
      workflow JSONB DEFAULT '[]'::jsonb,
      problems_solved JSONB DEFAULT '[]'::jsonb,
      icon_name TEXT NOT NULL DEFAULT 'Code',
      sort_order INTEGER DEFAULT 0,
      is_published BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Projects
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      short_description TEXT NOT NULL,
      full_case_study TEXT NOT NULL,
      cover_image TEXT NOT NULL,
      gallery_images JSONB DEFAULT '[]'::jsonb,
      tech_stack JSONB DEFAULT '[]'::jsonb,
      live_url TEXT,
      repo_url TEXT,
      client_name TEXT,
      completion_date TEXT,
      is_featured BOOLEAN DEFAULT false,
      is_published BOOLEAN DEFAULT true,
      metrics JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Blog Posts
    CREATE TABLE IF NOT EXISTS blog_posts (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      content TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT 'SD Infinova Team',
      cover_image TEXT NOT NULL,
      category TEXT NOT NULL,
      tags JSONB DEFAULT '[]'::jsonb,
      reading_time_minutes INTEGER DEFAULT 5,
      is_published BOOLEAN DEFAULT true,
      published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      seo_title TEXT,
      seo_description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Contact Inquiries
    CREATE TABLE IF NOT EXISTS contact_inquiries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      business_name TEXT,
      email TEXT NOT NULL,
      phone TEXT,
      location TEXT,
      project_type TEXT NOT NULL,
      budget_range TEXT NOT NULL,
      expected_timeline TEXT,
      description TEXT NOT NULL,
      preferred_contact TEXT DEFAULT 'email',
      status TEXT NOT NULL DEFAULT 'new',
      internal_notes TEXT DEFAULT '',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Media Assets
    CREATE TABLE IF NOT EXISTS media_assets (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      url TEXT NOT NULL,
      alt_text TEXT DEFAULT '',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Site Settings
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Page Views & Analytics
    CREATE TABLE IF NOT EXISTS page_views (
      id TEXT PRIMARY KEY,
      path TEXT NOT NULL,
      referrer TEXT,
      user_agent TEXT,
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      date_str TEXT NOT NULL
    );

    -- Admin Activity Logs
    CREATE TABLE IF NOT EXISTS admin_activity_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_name TEXT,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT,
      details JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await seedInitialData();
  console.log('[PostgreSQL] Database ready with seed data.');
}

async function seedInitialData() {
  // 1. Seed Administrator
  const adminRes = await pg.query('SELECT COUNT(*) as count FROM admin_users');
  const count = parseInt((adminRes.rows[0] as any)?.count || '0', 10);
  if (count === 0) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('InfinovaAdmin2026!', salt);
    await pg.query(
      `INSERT INTO admin_users (id, email, password_hash, name, role)
       VALUES ($1, $2, $3, $4, $5)`,
      ['usr_admin_1', 'admin@sdinfinova.com', hash, 'SD Infinova Admin', 'superadmin']
    );
    console.log('[PostgreSQL] Seeded initial admin account: admin@sdinfinova.com');
  }

  // 2. Seed Services
  const servRes = await pg.query('SELECT COUNT(*) as count FROM services');
  if (parseInt((servRes.rows[0] as any)?.count || '0', 10) === 0) {
    const defaultServices = [
      {
        id: 'srv_1',
        slug: 'website-design-development',
        title: 'Website Design & Development',
        tagline: 'Custom high-performance websites engineered for credibility and conversion.',
        description: 'From bespoke digital agency experiences to corporate showcases, we craft clean, accessible, lightning-fast websites that communicate your distinct brand value.',
        deliverables: JSON.stringify(['Custom Responsive Design', 'Semantic HTML5 & Modern CSS/Tailwind', 'Interactive Micro-animations', 'Speed & Performance Optimization', 'Cross-browser & Mobile Testing']),
        workflow: JSON.stringify(['Discovery & Wireframing', 'High-Fidelity Visual Design', 'Frontend Engineering', 'Quality Assurance & Lighthouse Audit', 'Launch & DNS Handover']),
        problems_solved: JSON.stringify(['Outdated visual presence', 'Poor mobile layout responsiveness', 'High bounce rates from slow page loads', 'Lack of brand differentiation']),
        icon_name: 'Layout',
        sort_order: 1
      },
      {
        id: 'srv_2',
        slug: 'business-websites-landing-pages',
        title: 'Business Websites & Landing Pages',
        tagline: 'Lead-generating digital storefronts tailored for Nepal SMBs and global clients.',
        description: 'Targeted marketing pages and corporate web presences built to guide qualified prospects to take decisive action, contact your sales team, or request estimates.',
        deliverables: JSON.stringify(['Conversion-focused Copywriting Architecture', 'WhatsApp & Direct Lead Funnels', 'Local SEO & Google Business Integration', 'Contact & Estimate Forms', 'Analytics & Event Tracking']),
        workflow: JSON.stringify(['Market & Competitor Analysis', 'Conversion Architecture', 'Design & Copy Implementation', 'Lead Capture Form Verification', 'Live Production Rollout']),
        problems_solved: JSON.stringify(['Unclear value propositions', 'No qualified inbound leads', 'Visitors leaving without contacting', 'Missed local search opportunities in Nepal']),
        icon_name: 'TrendingUp',
        sort_order: 2
      },
      {
        id: 'srv_3',
        slug: 'website-redesign-ui-ux',
        title: 'Website Redesign & UI/UX Improvements',
        tagline: 'Modernize legacy websites with contemporary aesthetics and frictionless usability.',
        description: 'Transform cluttered, outdated platforms into sleek, high-retention digital assets. We audit your existing site, resolve UX bottlenecks, and re-engineer the complete presentation layer.',
        deliverables: JSON.stringify(['Comprehensive UX & Heuristic Audit', 'Information Architecture Reorganization', 'Modern Design System & Token Setup', 'Mobile Touch Optimization', 'Zero-downtime Content Migration']),
        workflow: JSON.stringify(['Current Site Audit', 'User Journey Mapping', 'Prototyping & Alignment', 'Iterative Redesign Implementation', 'Staging Review & Cutover']),
        problems_solved: JSON.stringify(['Dated 2010s aesthetic', 'Complex, confusing navigation', 'Poor accessibility and readability', 'Inability to update content easily']),
        icon_name: 'Sparkles',
        sort_order: 3
      },
      {
        id: 'srv_4',
        slug: 'custom-web-apps-dashboards',
        title: 'Custom Web Applications & Dashboards',
        tagline: 'Tailor-made software platforms, internal tooling, and client portals.',
        description: 'Full-stack web software built for your exact operational workflows. Dynamic single-page applications, administrative consoles, and multi-tenant portals engineered with React, TypeScript, and robust databases.',
        deliverables: JSON.stringify(['Role-Based Access Control (RBAC)', 'Real-time Data Visualization', 'Interactive Data Tables & Exporting', 'Secure REST API Endpoints', 'Automated Background Workflows']),
        workflow: JSON.stringify(['Technical Architecture Scoping', 'Database & Entity Schema Design', 'API Specification', 'Frontend & Backend Development', 'Security Hardening & Deployment']),
        problems_solved: JSON.stringify(['Manual spreadsheet bottlenecks', 'Disparate software tools that do not sync', 'Lack of visibility into key business metrics', 'Off-the-shelf software limitations']),
        icon_name: 'Cpu',
        sort_order: 4
      },
      {
        id: 'srv_5',
        slug: 'backend-api-database-integration',
        title: 'Backend API & Database Integration',
        tagline: 'Resilient server architectures, data pipelines, and third-party integrations.',
        description: 'Engineered backend foundations that power modern applications. Relational PostgreSQL architecture, clean RESTful APIs, secure authentication, and payment gateway connections.',
        deliverables: JSON.stringify(['PostgreSQL Database Schema & Migrations', 'Secure Token & Session Authentication', 'eSewa, Khalti, or Stripe Payment Gateways', 'Third-Party Webhook Handlers', 'Automated Database Backups']),
        workflow: JSON.stringify(['Data Modeling', 'API Endpoint Contract Definition', 'Logic Implementation & Validation', 'Stress Testing & Indexing', 'Continuous Production Monitoring']),
        problems_solved: JSON.stringify(['Slow database queries', 'Unsecured administrative endpoints', 'Inflexible data structures', 'Failed payment callbacks']),
        icon_name: 'Database',
        sort_order: 5
      },
      {
        id: 'srv_6',
        slug: 'technical-seo-performance-optimization',
        title: 'Technical SEO & Performance Optimization',
        tagline: 'Sub-second load times, stellar Core Web Vitals, and dominant local rankings.',
        description: 'Audited and optimized web engineering that boosts your organic visibility in Nepal and overseas. We tackle Core Web Vitals (LCP, INP, CLS), Schema.org structured data, and clean metadata.',
        deliverables: JSON.stringify(['Core Web Vitals Audit & Remediation', 'Schema.org JSON-LD Structured Data', 'Automated XML Sitemaps & robots.txt', 'Asset Compression & Image Serving', 'Local Search Geo-Optimization']),
        workflow: JSON.stringify(['Baseline Performance Benchmark', 'Asset & Bundle Elimination', 'Metadata & Structured Data Injection', 'Post-Optimization Audit', 'Monthly Ranking & Traffic Monitoring']),
        problems_solved: JSON.stringify(['Poor Google rankings in Kathmandu and Nepal', 'Failing Core Web Vitals scores', 'Bloated JavaScript bundles', 'Missing rich snippet search results']),
        icon_name: 'Zap',
        sort_order: 6
      },
      {
        id: 'srv_7',
        slug: 'business-automation-digital-solutions',
        title: 'Business Automation & Digital Solutions',
        tagline: 'Eliminate repetitive manual tasks with automated digital pipelines.',
        description: 'Connect your inquiry pipelines, automated email confirmations, CRM notifications, and operational spreadsheets into a single unified business machine.',
        deliverables: JSON.stringify(['Automated Customer Notifications', 'CRM & Lead Intake Syncing', 'Automated PDF Invoice & Receipt Generation', 'Webhook & Third-party Integrations', 'System Health Monitoring']),
        workflow: JSON.stringify(['Workflow Assessment', 'Automation Architecture Design', 'Integration Configuration & Testing', 'Fail-Safe Error Handling', 'Staff Walkthrough & Documentation']),
        problems_solved: JSON.stringify(['Delayed customer follow-ups', 'Lost customer contact details', 'Hours spent manually copying data', 'Human error in repetitive tasks']),
        icon_name: 'Workflow',
        sort_order: 7
      },
      {
        id: 'srv_8',
        slug: 'website-maintenance-technical-support',
        title: 'Website Maintenance & Technical Support',
        tagline: 'Reliable ongoing management, security monitoring, and uptime assurance.',
        description: 'Peace of mind for business owners. We handle routine dependency updates, SSL certificate monitoring, server health checks, regular database backups, and emergency hotfixes.',
        deliverables: JSON.stringify(['24/7 Uptime & Error Alerting', 'Weekly Security & Package Updates', 'Automated Offsite Database Backups', 'Content Update Requests (within 24h)', 'Priority Developer On-Call Support']),
        workflow: JSON.stringify(['Onboarding & Health Audit', 'Continuous Monitoring Setup', 'Weekly Maintenance Cycles', 'Monthly Health & Traffic Reports']),
        problems_solved: JSON.stringify(['Websites hacked due to outdated software', 'Downtime unnoticed for days', 'Data loss from absent backups', 'No engineer available when issues arise']),
        icon_name: 'ShieldCheck',
        sort_order: 8
      }
    ];

    for (const s of defaultServices) {
      await pg.query(
        `INSERT INTO services (id, slug, title, tagline, description, deliverables, workflow, problems_solved, icon_name, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [s.id, s.slug, s.title, s.tagline, s.description, s.deliverables, s.workflow, s.problems_solved, s.icon_name, s.sort_order]
      );
    }
    console.log('[PostgreSQL] Seeded 8 core digital studio services.');
  }

  // 3. Seed Real Projects
  const projRes = await pg.query('SELECT COUNT(*) as count FROM projects');
  if (parseInt((projRes.rows[0] as any)?.count || '0', 10) === 0) {
    const defaultProjects = [
      {
        id: 'prj_1',
        slug: 'sd-tech-photograph',
        title: 'SD Tech Photograph',
        category: 'Photography & Portfolio',
        short_description: 'An editorial portfolio and photo client delivery gallery platform featuring ultra-fast image loading and dark studio aesthetics.',
        full_case_study: 'SD Tech Photograph required an editorial digital showcase to display high-resolution commercial and creative photography without sacrificing loading speeds on mobile connections in Nepal. We engineered an image-optimized gallery with progressive WebP loading, masonry layouts, custom lightboxes, and a private client proofing section where clients review and select proofs directly.',
        cover_image: '/assets/projects/sd-tech-photograph.png',
        gallery_images: JSON.stringify(['/assets/projects/sd-tech-photograph.png']),
        tech_stack: JSON.stringify(['React', 'TypeScript', 'Tailwind CSS', 'Vite', 'Cloudflare CDN']),
        live_url: 'https://sd-tech-photograph-ytpn.vercel.app/',
        repo_url: '',
        client_name: 'SD Tech Photography Studio',
        completion_date: '2025',
        is_featured: true,
        metrics: JSON.stringify([
          { label: 'Lighthouse Performance', value: '98/100' },
          { label: 'Average Page Load', value: '0.6s' },
          { label: 'Client Proofing Speed', value: '3x Faster' }
        ])
      },
      {
        id: 'prj_2',
        slug: 'dental-care-clinic-portal',
        title: 'Dental Care Clinic Platform',
        category: 'Healthcare & Clinic',
        short_description: 'Patient appointment scheduling portal, clinical service catalog, and doctor directory built for modern healthcare practices.',
        full_case_study: 'A premier dental clinic in Kathmandu required a trustworthy, patient-centric digital portal to handle appointment bookings, showcase clinical specialties (Orthodontics, Implants, Cosmetic Dentistry), and answer common patient queries. We designed a clean, calming interface with seamless WhatsApp direct booking, doctor credential profiles, and interactive service breakdowns.',
        cover_image: '/assets/projects/dental-care.png',
        gallery_images: JSON.stringify(['/assets/projects/dental-care.png']),
        tech_stack: JSON.stringify(['React', 'Node.js', 'Express', 'PostgreSQL', 'Tailwind CSS']),
        live_url: 'https://dental-rust-two.vercel.app/',
        repo_url: '',
        client_name: 'Dental Care Healthcare Clinic',
        completion_date: '2025',
        is_featured: true,
        metrics: JSON.stringify([
          { label: 'Online Inquiries', value: '+185%' },
          { label: 'Booking Drop-off', value: '-60%' },
          { label: 'Mobile Traffic Share', value: '74%' }
        ])
      },
      {
        id: 'prj_3',
        slug: 'nepal-apparel-clothing-store',
        title: 'SD Infininov - Dashain Reloaded Festive Clothing',
        category: 'E-commerce & Retail',
        short_description: 'A boutique streetwear and contemporary apparel showcase featuring lookbooks, size charts, and direct Kathmandu order fulfillment.',
        full_case_study: 'Created for a growing Nepali clothing label looking to bridge the gap between social media marketing and structured digital ordering. We developed a fluid, mobile-first product catalog with dynamic filterable collections, detailed textile specifications, size guides, and one-click order placement via WhatsApp and bank transfer confirmation.',
        cover_image: '/assets/projects/clothing-brand.png',
        gallery_images: JSON.stringify(['/assets/projects/clothing-brand.png']),
        tech_stack: JSON.stringify(['React', 'TypeScript', 'Vite', 'PostgreSQL', 'Tailwind CSS']),
        live_url: 'https://sd-infininova.vercel.app/',
        repo_url: '',
        client_name: 'Urban Heritage Apparel',
        completion_date: '2025',
        is_featured: true,
        metrics: JSON.stringify([
          { label: 'Monthly Catalog Views', value: '45,000+' },
          { label: 'Order Inquiry Rate', value: '4.8%' },
          { label: 'Cart Checkout Time', value: '< 45s' }
        ])
      },
      {
        id: 'prj_4',
        slug: 'find-my-hostel-nepal',
        title: 'FindMyHostel Platform',
        category: 'Custom Web Application',
        short_description: 'Comprehensive student hostel and accommodation directory platform with location filters, amenity comparisons, and direct landlord contact.',
        full_case_study: 'FindMyHostel connects students and young professionals across Kathmandu, Lalitpur, and Pokhara with verified hostels. Built with complex filtering (by college proximity, price per bed, Wi-Fi, food options), interactive maps, photo tours, and real-time room availability indicators.',
        cover_image: '/assets/projects/findmyhostel.png',
        gallery_images: JSON.stringify(['/assets/projects/findmyhostel.png']),
        tech_stack: JSON.stringify(['React', 'Node.js', 'PostgreSQL', 'Tailwind CSS', 'Map Integration']),
        live_url: 'https://findmyhostel.pythonanywhere.com/',
        repo_url: '',
        client_name: 'FindMyHostel Nepal',
        completion_date: '2026',
        is_featured: true,
        metrics: JSON.stringify([
          { label: 'Verified Listings', value: '120+' },
          { label: 'Active Monthly Students', value: '15,000+' },
          { label: 'Search Latency', value: '< 50ms' }
        ])
      }
    ];

    for (const p of defaultProjects) {
      await pg.query(
        `INSERT INTO projects (id, slug, title, category, short_description, full_case_study, cover_image, gallery_images, tech_stack, live_url, repo_url, client_name, completion_date, is_featured, metrics)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [p.id, p.slug, p.title, p.category, p.short_description, p.full_case_study, p.cover_image, p.gallery_images, p.tech_stack, p.live_url, p.repo_url, p.client_name, p.completion_date, p.is_featured, p.metrics]
      );
    }
    console.log('[PostgreSQL] Seeded 4 verified studio projects.');
  }

  // 4. Seed Blog Posts
  const blogRes = await pg.query('SELECT COUNT(*) as count FROM blog_posts');
  if (parseInt((blogRes.rows[0] as any)?.count || '0', 10) === 0) {
    const defaultPosts = [
      {
        id: 'pst_1',
        slug: 'why-nepalese-businesses-need-professional-websites',
        title: 'Why Nepalese Businesses Can No Longer Rely on Social Media Alone',
        excerpt: 'Relying exclusively on Facebook pages and Instagram feeds exposes your business to algorithm changes and limits credibility. Here is how a custom website builds permanent commercial equity.',
        content: `In Nepal's rapidly digitizing economy, thousands of businesses start with a Facebook page or Instagram profile. While social media is effective for initial discovery, it leaves companies vulnerable to arbitrary algorithm shifts, account suspensions, and zero search presence on Google.

### The Credibility Gap
When a corporate client, tourist, or high-value customer searches for a service in Kathmandu, they start with Google Search. A business with a professional, fast website instantly commands greater authority than a competitor with only an unverified social profile.

### Conversion and Ownership
A custom website gives you 100% control over the user experience:
1. **Frictionless inquiry funnels** connecting directly to WhatsApp or your CRM.
2. **Permanent search rankings** for terms like "best dental clinic Kathmandu" or "custom clothing Nepal".
3. **Verified brand trust** where you showcase real client testimonials, licenses, and detailed project portfolios without social media clutter.`,
        author: 'SD Infinova Engineering',
        cover_image: '/assets/aistudio/Screenshot_2026-10-17_122839_0fe2d1b9.png',
        category: 'Business & Strategy',
        tags: JSON.stringify(['Nepal Business', 'Web Strategy', 'Brand Credibility', 'Digital Growth']),
        reading_time_minutes: 5,
        seo_title: 'Why Nepalese Businesses Need Professional Websites in 2026',
        seo_description: 'Explore why modern businesses in Nepal are moving from social media reliance to high-performance custom web engineering.'
      },
      {
        id: 'pst_2',
        slug: 'website-design-development-costs-in-nepal',
        title: 'How Much Does a Professional Website Actually Cost in Nepal?',
        excerpt: 'A transparent, honest breakdown of website design pricing in Nepal: from budget landing pages (NPR 15,000) to bespoke web applications (NPR 75,000+).',
        content: `Website pricing in Nepal is notorious for lack of transparency. Some freelancers quote NPR 5,000 for a hacked WordPress template, while agencies quote NPR 300,000 without explaining the deliverables. At SD Infinova, we believe in radical transparency.

### The Realistic Price Tiers

- **NPR 15,000 – 35,000 (Single-Page & Essential Business Showcase)**: Ideal for local service businesses, clinics, and freelancers needing a fast, responsive, SEO-ready landing page with contact forms and WhatsApp integration.
- **NPR 35,000 – 75,000 (Multi-Page Corporate & Studio Websites)**: Custom-designed 5 to 10-page platforms with custom CMS, rich service breakdowns, project case studies, and local SEO configuration.
- **NPR 75,000+ (Custom Web Apps, Dashboards & High-Traffic Portals)**: Bespoke full-stack platforms with PostgreSQL databases, user authentication, automated workflows, and high-concurrency architectures.

### The Cost of Cheap Websites
A 5,000 NPR template site often breaks on mobile, takes 8 seconds to load, contains security vulnerabilities, and lacks ongoing support. Investing in clean web engineering pays for itself with the first two converted clients.`,
        author: 'SD Infinova Engineering',
        cover_image: '/assets/aistudio/image_ee582da3.png',
        category: 'Pricing & Strategy',
        tags: JSON.stringify(['Pricing Nepal', 'Web Development Cost', 'ROI', 'Transparency']),
        reading_time_minutes: 6,
        seo_title: 'Website Design & Development Costs in Nepal (2026 Guide)',
        seo_description: 'Detailed and transparent guide to website design and development costs for Nepalese businesses in 2026.'
      },
      {
        id: 'pst_3',
        slug: 'local-seo-guide-kathmandu-nepal',
        title: 'Local SEO for Small Businesses in Kathmandu: Dominating Google Search',
        excerpt: 'Practical technical steps to rank your business at the top of Google searches in Nepal without paying for expensive ads.',
        content: `Local search is the highest-intent marketing channel available in Nepal. When someone searches for "web development company in Kathmandu" or "emergency dentist Lalitpur", they are ready to purchase today.

### Step 1: Technical Foundation
Before building backlinks, your website must load in under 1.5 seconds on Ncell and Nepal Telecom mobile data connections. Search engines penalize sluggish websites severely.

### Step 2: Schema.org Structured Data
Implement local business JSON-LD structured data telling search engines your exact city, service coordinates, opening hours, and contact details.

### Step 3: Localized Content Architecture
Ensure your service pages naturally integrate regional intent without keyword stuffing: target specific business districts like New Baneshwor, Thamel, Durbarmarg, and Jhamsikhel where your clients reside.`,
        author: 'SD Infinova Engineering',
        cover_image: '/assets/aistudio/Screenshot_2026-10-17_122839_0fe2d1b9.png',
        category: 'SEO & Performance',
        tags: JSON.stringify(['Local SEO', 'Kathmandu', 'Google Ranking', 'Core Web Vitals']),
        reading_time_minutes: 4,
        seo_title: 'Local SEO for Businesses in Kathmandu, Nepal | SD Infinova',
        seo_description: 'Learn how to rank your Nepalese business on Google with technical SEO, schema markup, and speed optimization.'
      }
    ];

    for (const post of defaultPosts) {
      await pg.query(
        `INSERT INTO blog_posts (id, slug, title, excerpt, content, author, cover_image, category, tags, reading_time_minutes, seo_title, seo_description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [post.id, post.slug, post.title, post.excerpt, post.content, post.author, post.cover_image, post.category, post.tags, post.reading_time_minutes, post.seo_title, post.seo_description]
      );
    }
    console.log('[PostgreSQL] Seeded 3 verified business & tech articles.');
  }

  // 5. Seed Site Settings
  const settingsRes = await pg.query("SELECT value FROM site_settings WHERE key = 'general'");
  if (settingsRes.rows.length === 0) {
    const generalSettings = {
      site_name: 'SD Infinova',
      tagline: 'Digital Studio & Web Engineering',
      headline: 'Engineering Digital Experiences Without Limits.',
      subheadline: 'We design and develop modern websites and digital solutions that help businesses build their online presence and move forward with confidence.',
      contact_email: 'sd.infinova@gmail.com',
      contact_phone: '+977 9800000000',
      whatsapp_number: '9779800000000',
      location: 'Kathmandu, Nepal',
      operating_hours: 'Sun – Fri: 9:00 AM – 6:00 PM NPT',
      social_links: {
        github: 'https://github.com/sdinfinova',
        linkedin: 'https://linkedin.com/company/sd-infinova',
        facebook: 'https://facebook.com/sdinfinova',
        instagram: 'https://instagram.com/sdinfinova'
      },
      announcement_bar: {
        enabled: true,
        text: 'Now accepting Q2/Q3 2026 web engineering projects for Nepal & International clients.',
        link: '#contact'
      },
      budget_options: [
        'NPR 4,999 (Landing Page Package)',
        'NPR 7,500 (Business Website - Recommended)',
        'NPR 12,500 (Professional Website Package)',
        'From NPR 15,000 (E-commerce / Custom Systems)',
        'Custom / Undecided Scope'
      ]
    };

    await pg.query(
      `INSERT INTO site_settings (key, value) VALUES ($1, $2)`,
      ['general', JSON.stringify(generalSettings)]
    );
    console.log('[PostgreSQL] Seeded general site settings.');
  }

  // 6. Seed sample inquiries for the admin dashboard demonstration
  const inqRes = await pg.query('SELECT COUNT(*) as count FROM contact_inquiries');
  if (parseInt((inqRes.rows[0] as any)?.count || '0', 10) === 0) {
    const sampleInquiries = [
      {
        id: 'inq_1',
        name: 'Aayush Shrestha',
        business_name: 'Himalayan Organic Teas',
        email: 'aayush@himalayanteas.com.np',
        phone: '+977 9841234567',
        location: 'Lalitpur, Nepal',
        project_type: 'E-commerce Website & Catalog',
        budget_range: 'NPR 35,000 – 75,000 (Growth)',
        expected_timeline: '4 to 6 weeks',
        description: 'We are expanding our specialty tea retail into an online storefront with eSewa/Khalti checkout and international wholesale inquiry capabilities.',
        preferred_contact: 'whatsapp',
        status: 'qualified',
        internal_notes: 'Sent initial discovery questionnaire on WhatsApp. Very promising brand.'
      },
      {
        id: 'inq_2',
        name: 'Dr. Binita Pradhan',
        business_name: 'Apex Orthopedic Clinic',
        email: 'dr.binita@apexortho.np',
        phone: '+977 9851098765',
        location: 'Kathmandu, Nepal',
        project_type: 'Business Website & Patient Portal',
        budget_range: 'NPR 35,000 – 75,000 (Growth)',
        expected_timeline: 'Within 1 month',
        description: 'Need a fast clinical website where patients can view consultant schedules and book appointments directly. Clean, trustworthy dark or clinical theme.',
        preferred_contact: 'email',
        status: 'new',
        internal_notes: 'New inquiry received today. Follow up with portfolio link to Dental Care project.'
      },
      {
        id: 'inq_3',
        name: 'Marcus Vance',
        business_name: 'Nordic Velocity Consulting',
        email: 'm.vance@nordicvelocity.io',
        phone: '+44 20 7946 0912',
        location: 'London, United Kingdom',
        project_type: 'Custom Web Application & Dashboard',
        budget_range: 'NPR 75,000+ (Custom Application)',
        expected_timeline: '2 months',
        description: 'Looking for a reliable offshore web engineering partner to build a client analytics dashboard in React + PostgreSQL.',
        preferred_contact: 'email',
        status: 'won',
        internal_notes: 'Contract signed! Discovery workshop scheduled for Friday.'
      }
    ];

    for (const inq of sampleInquiries) {
      await pg.query(
        `INSERT INTO contact_inquiries (id, name, business_name, email, phone, location, project_type, budget_range, expected_timeline, description, preferred_contact, status, internal_notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [inq.id, inq.name, inq.business_name, inq.email, inq.phone, inq.location, inq.project_type, inq.budget_range, inq.expected_timeline, inq.description, inq.preferred_contact, inq.status, inq.internal_notes]
      );
    }
    console.log('[PostgreSQL] Seeded realistic inquiry workflow records.');
  }

  // 7. Seed sample page view analytics
  const pvRes = await pg.query('SELECT COUNT(*) as count FROM page_views');
  if (parseInt((pvRes.rows[0] as any)?.count || '0', 10) === 0) {
    const today = new Date().toISOString().split('T')[0];
    const paths = ['/', '/#work', '/#services', '/#about', '/#contact', '/blog', '/work/sd-tech-photograph', '/work/dental-care'];
    for (let i = 0; i < 48; i++) {
      const p = paths[Math.floor(Math.random() * paths.length)];
      await pg.query(
        `INSERT INTO page_views (id, path, referrer, user_agent, date_str)
         VALUES ($1, $2, $3, $4, $5)`,
        [`pv_${Date.now()}_${i}`, p, 'direct', 'Mozilla/5.0', today]
      );
    }
    console.log('[PostgreSQL] Seeded initial privacy-conscious page view events.');
  }
}
