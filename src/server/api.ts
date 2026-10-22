import { Router, Request, Response, NextFunction } from 'express';
import { pg } from './db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';

export const apiRouter = Router();
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char] as string);

// Public routes that are exempt from CSRF protection.
// Public routes are mounted before cookie-session CSRF validation in server.ts.
export const publicApiRouter = Router();

// Ensure upload directory exists
export const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), 'public/uploads'));
export function initializeUploadsStorage() {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.UPLOADS_DIR || !path.isAbsolute(process.env.UPLOADS_DIR) ||
        !fs.existsSync(UPLOADS_DIR) || !fs.statSync(UPLOADS_DIR).isDirectory()) {
      throw new Error('UPLOADS_DIR must be an absolute path to an existing persistent volume in production.');
    }
    return;
  }
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage configuration with mime type and size restrictions
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
    const rand = crypto.randomBytes(8).toString('hex');
    cb(null, `asset_${Date.now()}_${rand}${cleanExt}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.webp': 'image/webp', '.gif': 'image/gif'
    };
    const extension = path.extname(file.originalname).toLowerCase();
    if (allowedTypes[extension] === file.mimetype) {
      cb(null, true);
    } else {
      const error = new Error('Unsupported image type. Upload a JPEG, PNG, WebP, or GIF image.') as NodeJS.ErrnoException;
      error.code = 'UNSUPPORTED_FILE_TYPE';
      cb(error);
    }
  }
});

function hasValidImageSignature(filePath: string, mimeType: string): boolean {
  const header = Buffer.alloc(12);
  const fd = fs.openSync(filePath, 'r');
  try {
    const bytesRead = fs.readSync(fd, header, 0, header.length, 0);
    const bytes = header.subarray(0, bytesRead);
    if (mimeType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (mimeType === 'image/png') return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (mimeType === 'image/gif') return bytes.subarray(0, 6).toString('ascii').match(/^GIF8[79]a$/) !== null;
    if (mimeType === 'image/webp') return bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    return false;
  } finally {
    fs.closeSync(fd);
  }
}

function parsedJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// Middleware: Verify Admin Authentication
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.admin_token as string | undefined;

  if (!token) {
    res.status(401).json({ error: 'Unauthorized. Admin session required.' });
    return;
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const sessionRes = await pg.query(
      `SELECT s.*, u.id as user_id, u.email, u.name, u.role, u.must_change_password
       FROM admin_sessions s
       JOIN admin_users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > CURRENT_TIMESTAMP`,
      [tokenHash]
    );

    if (sessionRes.rows.length === 0) {
      res.status(401).json({ error: 'Session expired or invalid.' });
      return;
    }

    const session = sessionRes.rows[0] as any;
    if (session.must_change_password) {
      res.status(403).json({ error: 'Administrator credential rotation is required before access.' });
      return;
    }
    if (!['admin', 'superadmin'].includes(session.role)) {
      res.status(403).json({ error: 'Administrator permission required.' });
      return;
    }
    (req as any).adminUser = {
      id: session.user_id,
      email: session.email,
      name: session.name,
      role: session.role
    };
    next();
  } catch (err: any) {
    res.status(500).json({ error: 'Authentication verification failure.' });
  }
}

// Log admin action helper
async function logAdminAction(userId: string, userName: string, action: string, targetType: string, targetId: string, details: any = {}) {
  try {
    await pg.query(
      `INSERT INTO admin_activity_logs (id, user_id, user_name, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [`log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, userId, userName, action, targetType, targetId, JSON.stringify(details)]
    );
  } catch (e) {
    console.error('Failed to write administrative activity log.');
  }
}

// ==========================================
// PUBLIC ENDPOINTS
// ==========================================

// Health Check
apiRouter.get('/health', (_req, res) => {
  void pg.query('SELECT 1').then(() => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'SD Infinova Core API v1', database: 'reachable' });
  }).catch(() => {
    res.status(503).json({ status: 'unavailable', error: 'Database unavailable.' });
  });
});

// Get Site Settings
apiRouter.get('/settings', async (_req, res) => {
  try {
    const result = await pg.query("SELECT value FROM site_settings WHERE key = 'general'");
    if (result.rows.length === 0) {
      res.json({});
      return;
    }
    const row = result.rows[0] as any;
    const val = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
    const publicSettings = publicSettingsSchema.safeParse(val);
    res.json(publicSettings.success ? publicSettings.data : {});
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve site settings.' });
  }
});

// Get Services (Public)
apiRouter.get('/services', async (_req, res) => {
  try {
    const result = await pg.query('SELECT * FROM services WHERE is_published = true ORDER BY sort_order ASC');
    const parsed = result.rows.map((row: any) => ({
      ...row,
      deliverables: typeof row.deliverables === 'string' ? JSON.parse(row.deliverables) : row.deliverables,
      workflow: typeof row.workflow === 'string' ? JSON.parse(row.workflow) : row.workflow,
      problems_solved: typeof row.problems_solved === 'string' ? JSON.parse(row.problems_solved) : row.problems_solved
    }));
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve services.' });
  }
});

// Get Projects (Public)
apiRouter.get('/projects', async (req, res) => {
  try {
    const { category, featured } = req.query;
    let query = 'SELECT * FROM projects WHERE is_published = true';
    const params: any[] = [];

    if (category && category !== 'All') {
      params.push(`%${category}%`);
      query += ` AND category ILIKE $${params.length}`;
    }

    if (featured === 'true') {
      query += ` AND is_featured = true`;
    }

    query += ' ORDER BY created_at DESC';
    const result = await pg.query(query, params);

    const parsed = result.rows.map((row: any) => ({
      ...row,
      gallery_images: typeof row.gallery_images === 'string' ? JSON.parse(row.gallery_images) : row.gallery_images,
      tech_stack: typeof row.tech_stack === 'string' ? JSON.parse(row.tech_stack) : row.tech_stack,
      metrics: typeof row.metrics === 'string' ? JSON.parse(row.metrics) : row.metrics
    }));
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve projects.' });
  }
});

// Get Single Project by Slug (Public)
apiRouter.get('/projects/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await pg.query('SELECT * FROM projects WHERE slug = $1 AND is_published = true', [slug]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }
    const row: any = result.rows[0];
    const parsed = {
      ...row,
      gallery_images: typeof row.gallery_images === 'string' ? JSON.parse(row.gallery_images) : row.gallery_images,
      tech_stack: typeof row.tech_stack === 'string' ? JSON.parse(row.tech_stack) : row.tech_stack,
      metrics: typeof row.metrics === 'string' ? JSON.parse(row.metrics) : row.metrics
    };
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load project details.' });
  }
});

// Get Blog Posts (Public)
apiRouter.get('/blog', async (req, res) => {
  try {
    const { tag, category } = req.query;
    let query = 'SELECT * FROM blog_posts WHERE is_published = true';
    const params: any[] = [];

    if (category && category !== 'All') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    query += ' ORDER BY published_at DESC';
    const result = await pg.query(query, params);

    const parsed = result.rows.map((row: any) => ({
      ...row,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags
    }));
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve blog posts.' });
  }
});

// Get Single Blog Post by Slug (Public)
apiRouter.get('/blog/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await pg.query('SELECT * FROM blog_posts WHERE slug = $1 AND is_published = true', [slug]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Blog post not found.' });
      return;
    }
    const row: any = result.rows[0];
    res.json({
      ...row,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load blog post.' });
  }
});

// Submit Contact Inquiry (Public with validation & rate protection)
// NOTE: This route is registered on publicApiRouter (CSRF-exempt) because
// it is called from the public-facing contact form without a CSRF token.
const safeText = (max: number) => z.string().trim().max(max).refine((value) => !/[\u0000-\u001f\u007f]/.test(value), 'Control characters are not allowed');
const isHttpUrl = (value: string) => {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
};
const httpUrl = z.string().trim().url().max(2048).refine(isHttpUrl, 'Only HTTP and HTTPS URLs are allowed');
const assetReference = safeText(2048).refine((value) => value.startsWith('/') ? !value.startsWith('//') : isHttpUrl(value), 'Invalid asset URL');
const projectInputSchema = z.object({
  slug: safeText(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  title: safeText(160).min(1),
  category: safeText(100).optional().default('Business Website'),
  short_description: safeText(800).optional().default(''),
  full_case_study: safeText(15000).optional().default(''),
  cover_image: assetReference.optional().default('/assets/projects/sd-tech-photograph.png'),
  gallery_images: z.array(assetReference).max(30).optional().default([]),
  tech_stack: z.array(safeText(80)).max(40).optional().default(['React', 'TypeScript', 'Tailwind CSS']),
  live_url: z.union([httpUrl, z.literal('')]).optional().default(''),
  repo_url: z.union([httpUrl, z.literal('')]).optional().default(''),
  client_name: safeText(160).optional().default(''),
  completion_date: safeText(32).optional().default(''),
  is_featured: z.boolean().optional().default(false),
  is_published: z.boolean().optional().default(true),
  metrics: z.array(z.object({ label: safeText(100), value: safeText(100) })).max(30).optional().default([])
});
const projectPatchSchema = projectInputSchema.partial();
const blogInputSchema = z.object({
  slug: safeText(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  title: safeText(200).min(1),
  excerpt: safeText(1000).optional().default(''),
  content: safeText(30000).optional().default(''),
  author: safeText(160).optional().default('SD Infinova Team'),
  cover_image: assetReference.optional().default('/assets/projects/clothing-brand.png'),
  category: safeText(100).optional().default('Web Engineering'),
  tags: z.array(safeText(60)).max(40).optional().default([]),
  reading_time_minutes: z.coerce.number().int().min(1).max(120).optional().default(5),
  is_published: z.boolean().optional().default(true),
  seo_title: safeText(200).optional().default(''),
  seo_description: safeText(500).optional().default('')
});
const blogPatchSchema = blogInputSchema.partial();
const generalSettingsSchema = z.object({
  site_name: safeText(120).optional(),
  tagline: safeText(200).optional(),
  headline: safeText(240).optional(),
  subheadline: safeText(1000).optional(),
  contact_email: z.string().trim().email().max(254).optional(),
  contact_phone: safeText(60).optional(),
  whatsapp_number: safeText(40).optional(),
  location: safeText(160).optional(),
  operating_hours: safeText(200).optional(),
  social_links: z.object({
    github: z.union([httpUrl, z.literal('')]).optional(),
    linkedin: z.union([httpUrl, z.literal('')]).optional(),
    facebook: z.union([httpUrl, z.literal('')]).optional(),
    instagram: z.union([httpUrl, z.literal('')]).optional()
  }).optional(),
  announcement_bar: z.object({
    enabled: z.boolean(),
    text: safeText(400),
    link: z.union([safeText(2048).refine((value) => value.startsWith('#')), httpUrl])
  }).optional(),
  budget_options: z.array(safeText(160)).max(20).optional()
}).strict();
const publicSettingsSchema = generalSettingsSchema.strip();
const inquirySchema = z.object({
  name: safeText(120).min(2, 'Name must be at least 2 characters'),
  business_name: safeText(160).optional().default(''),
  email: z.string().trim().email('Please enter a valid email address').max(254).transform((value) => value.toLowerCase()),
  phone: safeText(40).optional().default(''),
  location: safeText(120).optional().default('Nepal'),
  project_type: safeText(120).min(1, 'Please select a project type'),
  budget_range: safeText(120).min(1, 'Please select a budget range'),
  expected_timeline: safeText(120).optional().default('Flexible'),
  description: safeText(5000).min(10, 'Project description must be at least 10 characters'),
  preferred_contact: z.enum(['email', 'phone', 'whatsapp']).default('email')
});

const inquiryUpdateSchema = z.object({
  status: z.enum(['new', 'contacted', 'qualified', 'won', 'lost']).optional(),
  internal_notes: safeText(10000).optional()
}).refine((data) => data.status !== undefined || data.internal_notes !== undefined, 'At least one field is required');

publicApiRouter.post('/inquiries', async (req, res) => {
  try {
    const parseResult = inquirySchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.format()
      });
      return;
    }

    const data = parseResult.data;
    const id = `inq_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Insert into persistent PostgreSQL
    await pg.query(
      `INSERT INTO contact_inquiries (
        id, name, business_name, email, phone, location,
        project_type, budget_range, expected_timeline, description,
        preferred_contact, status, internal_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'new', '')`,
      [
        id,
        data.name,
        data.business_name,
        data.email,
        data.phone,
        data.location,
        data.project_type,
        data.budget_range,
        data.expected_timeline,
        data.description,
        data.preferred_contact
      ]
    );

    // Retrieve studio configuration for WhatsApp and Email notifications
    let studioEmail = process.env.NOTIFICATION_EMAIL || 'sd.infinova@gmail.com';
    let studioWhatsApp = process.env.WHATSAPP_NUMBER || '9779800000000';

    try {
      const settingsRes = await pg.query("SELECT value FROM site_settings WHERE key = 'general'");
      if (settingsRes.rows.length > 0) {
        const row = settingsRes.rows[0] as any;
        const val = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
        if (val.contact_email) studioEmail = val.contact_email;
        if (val.whatsapp_number) studioWhatsApp = val.whatsapp_number.replace(/[^0-9]/g, '');
      }
    } catch {}

    // Formatted message payload for WhatsApp & Email
    const inquirySummary =
      `*SD INFINOVA — NEW PROJECT INQUIRY*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 *Client Name:* ${data.name}\n` +
      `🏢 *Business:* ${data.business_name || 'Individual'}\n` +
      `📧 *Email:* ${data.email}\n` +
      `📱 *Phone / WhatsApp:* ${data.phone || 'Not provided'}\n` +
      `📍 *Location:* ${data.location || 'Nepal'}\n` +
      `🎯 *Preferred Contact:* ${data.preferred_contact.toUpperCase()}\n\n` +
      `📦 *Package / Scope:* ${data.project_type}\n` +
      `💰 *Budget Range:* ${data.budget_range}\n` +
      `⏱️ *Expected Timeline:* ${data.expected_timeline}\n\n` +
      `📝 *Project Description:*\n${data.description}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `_Inquiry ID: ${id}_`;

    // Direct WhatsApp link to studio lead
    const cleanStudioWhatsApp = studioWhatsApp.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/${cleanStudioWhatsApp}?text=${encodeURIComponent(inquirySummary)}`;

    // Direct mailto link to studio lead
    const emailSubject = `New Project Inquiry from ${data.name} — ${data.project_type}`;
    const emailPlainBody = inquirySummary.replace(/\*/g, '');
    const mailtoUrl = `mailto:${studioEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailPlainBody)}`;

    // Optional automated email dispatch via SMTP if configured in environment
    let emailDispatched = false;
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_PORT === '465',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || `"SD Infinova Portal" <${process.env.SMTP_USER}>`,
          to: studioEmail,
          replyTo: data.email,
          subject: `[SD Infinova Lead] ${data.name} — ${data.project_type}`,
          text: emailPlainBody,
          html: `
            <div style="font-family: sans-serif; background: #0c0d10; color: #f1f2f4; padding: 24px; border-radius: 12px; max-width: 600px;">
              <h2 style="color: #d89f66; margin-top: 0;">New Project Inquiry Received</h2>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0; color: #e5e7eb; font-size: 14px;">
                <tr><td style="padding: 6px 0; color: #9ca3af;">Client:</td><td><strong>${escapeHtml(data.name)}</strong></td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Business:</td><td>${escapeHtml(data.business_name || 'Individual')}</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Email:</td><td><a href="mailto:${escapeHtml(data.email)}" style="color: #d89f66;">${escapeHtml(data.email)}</a></td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Phone / WhatsApp:</td><td>${escapeHtml(data.phone || 'N/A')}</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Preferred Contact:</td><td><strong style="color: #4ade80;">${escapeHtml(data.preferred_contact.toUpperCase())}</strong></td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Package:</td><td>${escapeHtml(data.project_type)}</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Budget:</td><td style="color: #d89f66; font-family: monospace;">${escapeHtml(data.budget_range)}</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Timeline:</td><td>${escapeHtml(data.expected_timeline)}</td></tr>
              </table>
              <div style="background: #171a22; padding: 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); margin: 16px 0;">
                <div style="color: #9ca3af; font-size: 12px; text-transform: uppercase; margin-bottom: 8px;">Description:</div>
                <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${escapeHtml(data.description)}</div>
              </div>
              <div style="margin-top: 20px; font-size: 12px; color: #6b7280;">Inquiry ID: ${id}</div>
            </div>
          `
        });
        emailDispatched = true;
      } catch (mailErr) {
        console.error('Inquiry notification delivery failed.');
      }
    }

    res.status(201).json({
      success: true,
      inquiry_id: id,
      preferred_contact: data.preferred_contact,
      whatsapp_url: whatsappUrl,
      mailto_url: mailtoUrl,
      studio_whatsapp: studioWhatsApp,
      studio_email: studioEmail,
      email_dispatched: emailDispatched,
      message: 'Thank you! Your project inquiry has been received. Our engineering lead will review your requirements and respond within 24 business hours.'
    });
  } catch (err: any) {
    console.error('Inquiry submission failed before confirmation.');
    res.status(500).json({ error: 'Server error processing your inquiry. Please try again or reach out on WhatsApp.' });
  }
});

// Track Privacy-conscious Pageview
// NOTE: Registered on publicApiRouter (CSRF-exempt) — fire-and-forget ping,
// contains no sensitive mutation so CSRF protection is not needed.
publicApiRouter.post('/analytics/pageview', async (req, res) => {
  try {
    const { path: pagePath, referrer } = req.body;
    if (typeof pagePath !== 'string' || !pagePath.startsWith('/') || pagePath.length > 1000 ||
        pagePath.startsWith('/admin') || pagePath.startsWith('/api/') || pagePath.includes('#admin')) {
      res.json({ recorded: false });
      return;
    }

    let sanitizedReferrer = '';
    if (typeof referrer === 'string') {
      try {
        const parsedReferrer = new URL(referrer);
        sanitizedReferrer = `${parsedReferrer.origin}${parsedReferrer.pathname}`.slice(0, 500);
      } catch {
        sanitizedReferrer = '';
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const id = `pv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const userAgent = (req.headers['user-agent'] || 'unknown').substring(0, 150);

    await pg.query(
      `INSERT INTO page_views (id, path, referrer, user_agent, date_str)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, pagePath, sanitizedReferrer || 'direct', userAgent, today]
    );

    res.json({ recorded: true });
  } catch (err) {
    res.json({ recorded: false });
  }
});

// ==========================================
// ADMIN AUTHENTICATION ENDPOINTS
// ==========================================

apiRouter.post('/auth/login', async (req, res) => {
  try {
    const credentials = z.object({
      email: z.string().trim().email().max(254),
      password: z.string().min(1).max(1024)
    }).safeParse(req.body);
    if (!credentials.success) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const { email, password } = credentials.data;

    const userRes = await pg.query('SELECT * FROM admin_users WHERE email = $1', [email.toLowerCase().trim()]);
    if (userRes.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials. Access restricted to authorized personnel.' });
      return;
    }

    const user = userRes.rows[0] as any;
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials. Access restricted to authorized personnel.' });
      return;
    }

    // Create an opaque, database-backed cookie session (valid for 8 hours).
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

    await pg.query(
      `INSERT INTO admin_sessions (id, user_id, token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [`ses_${crypto.randomUUID()}`, user.id, tokenHash, expiresAt]
    );

    await logAdminAction(user.id, user.name, 'LOGIN', 'auth', user.id, { email: user.email });

    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 8 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (err: any) {
    console.error('Administrator login request failed.');
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
});

apiRouter.get('/auth/csrf-token', (req, res) => {
  let csrfToken = req.cookies?._csrf as string | undefined;
  if (!csrfToken || !/^[A-Za-z0-9_-]{43}$/.test(csrfToken)) {
    csrfToken = crypto.randomBytes(32).toString('base64url');
  }
  res.cookie('_csrf', csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1',
    maxAge: 8 * 60 * 60 * 1000
  });
  res.setHeader('Cache-Control', 'no-store');
  res.json({ csrfToken });
});

apiRouter.get('/auth/me', requireAdmin, (req, res) => {
  res.json({
    user: (req as any).adminUser
  });
});

apiRouter.post('/auth/logout', requireAdmin, async (req, res) => {
  try {
    const token = req.cookies?.admin_token as string | undefined;

    if (token) {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await pg.query('DELETE FROM admin_sessions WHERE token = $1', [tokenHash]);
    }

    res.clearCookie('admin_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Logout failed.' });
  }
});

apiRouter.put('/auth/password', requireAdmin, async (req, res) => {
  try {
    const passwordChange = z.object({
      currentPassword: z.string().min(1).max(1024),
      newPassword: z.string().min(16).max(1024)
    }).safeParse(req.body);
    if (!passwordChange.success) {
      res.status(400).json({ error: 'New password must be at least 16 characters long.' });
      return;
    }
    const { currentPassword, newPassword } = passwordChange.data;

    const userId = (req as any).adminUser.id;
    const userRes = await pg.query('SELECT * FROM admin_users WHERE id = $1', [userId]);
    const user = userRes.rows[0] as any;

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      res.status(400).json({ error: 'Current password incorrect.' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await pg.query('UPDATE admin_users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newHash, userId]);
    await pg.query('DELETE FROM admin_sessions WHERE user_id = $1', [userId]);

    await logAdminAction(userId, user.name, 'PASSWORD_CHANGE', 'user', userId);
    res.clearCookie('admin_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update password.' });
  }
});

// ==========================================
// PROTECTED ADMIN CMS ENDPOINTS
// ==========================================

// Dashboard Overview Analytics
apiRouter.get('/admin/analytics', requireAdmin, async (_req, res) => {
  try {
    // 1. Total page views
    const totalViewsRes = await pg.query('SELECT COUNT(*) as count FROM page_views');
    const totalViews = parseInt((totalViewsRes.rows[0] as any)?.count || '0', 10);

    // 2. Inquiries summary
    const inquiriesRes = await pg.query('SELECT COUNT(*) as count FROM contact_inquiries');
    const totalInquiries = parseInt((inquiriesRes.rows[0] as any)?.count || '0', 10);

    const newInquiriesRes = await pg.query("SELECT COUNT(*) as count FROM contact_inquiries WHERE status = 'new'");
    const newInquiries = parseInt((newInquiriesRes.rows[0] as any)?.count || '0', 10);

    const wonInquiriesRes = await pg.query("SELECT COUNT(*) as count FROM contact_inquiries WHERE status = 'won'");
    const wonInquiries = parseInt((wonInquiriesRes.rows[0] as any)?.count || '0', 10);

    // 3. Projects count
    const projectsRes = await pg.query('SELECT COUNT(*) as count FROM projects WHERE is_published = true');
    const publishedProjects = parseInt((projectsRes.rows[0] as any)?.count || '0', 10);

    // 4. Blog posts count
    const blogRes = await pg.query('SELECT COUNT(*) as count FROM blog_posts WHERE is_published = true');
    const publishedPosts = parseInt((blogRes.rows[0] as any)?.count || '0', 10);

    // 5. Top visited paths
    const topPathsRes = await pg.query(
      `SELECT path, COUNT(*) as views 
       FROM page_views 
       GROUP BY path 
       ORDER BY views DESC 
       LIMIT 6`
    );

    // 6. Recent daily traffic (last 7 recorded dates)
    const dailyViewsRes = await pg.query(
      `SELECT date_str, COUNT(*) as views 
       FROM page_views 
       GROUP BY date_str 
       ORDER BY date_str DESC 
       LIMIT 7`
    );

    // 7. Recent Inquiries
    const recentInqRes = await pg.query(
      'SELECT id, name, business_name, email, project_type, budget_range, status, created_at FROM contact_inquiries ORDER BY created_at DESC LIMIT 5'
    );

    res.json({
      metrics: {
        totalViews,
        totalInquiries,
        newInquiries,
        wonInquiries,
        publishedProjects,
        publishedPosts,
        conversionRate: totalViews > 0 ? ((totalInquiries / totalViews) * 100).toFixed(1) + '%' : '0%'
      },
      topPaths: topPathsRes.rows,
      dailyViews: dailyViewsRes.rows,
      recentInquiries: recentInqRes.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to aggregate dashboard analytics.' });
  }
});

// Inquiries Management
apiRouter.get('/admin/inquiries', requireAdmin, async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = 'SELECT * FROM contact_inquiries';
    const params: any[] = [];
    const conditions: string[] = [];

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length} OR business_name ILIKE $${params.length} OR project_type ILIKE $${params.length})`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';
    const result = await pg.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve inquiries.' });
  }
});

apiRouter.put('/admin/inquiries/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = inquiryUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid inquiry update.' });
      return;
    }
    const { status, internal_notes } = parsed.data;
    const admin = (req as any).adminUser;

    await pg.query(
      `UPDATE contact_inquiries 
       SET status = COALESCE($1, status), 
           internal_notes = COALESCE($2, internal_notes), 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [status, internal_notes, id]
    );

    await logAdminAction(admin.id, admin.name, 'UPDATE_INQUIRY', 'inquiry', id, { status, notes_updated: internal_notes !== undefined });
    res.json({ success: true, message: 'Inquiry updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update inquiry.' });
  }
});

apiRouter.delete('/admin/inquiries/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const admin = (req as any).adminUser;
    await pg.query('DELETE FROM contact_inquiries WHERE id = $1', [id]);
    await logAdminAction(admin.id, admin.name, 'DELETE_INQUIRY', 'inquiry', id);
    res.json({ success: true, message: 'Inquiry deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete inquiry.' });
  }
});

// CSV Export for Inquiries
apiRouter.get('/admin/inquiries/export/csv', requireAdmin, async (_req, res) => {
  try {
    const result = await pg.query('SELECT * FROM contact_inquiries ORDER BY created_at DESC');
    let csv = 'ID,Name,Business,Email,Phone,Location,ProjectType,Budget,Timeline,PreferredContact,Status,Date\n';
    for (const r of (result.rows as any[])) {
      const clean = (val: unknown) => {
        let value = String(val || '');
        if (/^[\u0000-\u0020]*[=+\-@]/.test(value)) value = `'${value}`;
        return `"${value.replace(/"/g, '""')}"`;
      };
      csv += `${clean(r.id)},${clean(r.name)},${clean(r.business_name)},${clean(r.email)},${clean(r.phone)},${clean(r.location)},${clean(r.project_type)},${clean(r.budget_range)},${clean(r.expected_timeline)},${clean(r.preferred_contact)},${clean(r.status)},${clean(r.created_at)}\n`;
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="sd_infinova_inquiries.csv"');
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: 'Export failed.' });
  }
});

// Admin Projects CRUD
apiRouter.get('/admin/projects', requireAdmin, async (_req, res) => {
  try {
    const result = await pg.query('SELECT * FROM projects ORDER BY created_at DESC');
    const parsed = result.rows.map((row: any) => ({
      ...row,
      gallery_images: typeof row.gallery_images === 'string' ? JSON.parse(row.gallery_images) : row.gallery_images,
      tech_stack: typeof row.tech_stack === 'string' ? JSON.parse(row.tech_stack) : row.tech_stack,
      metrics: typeof row.metrics === 'string' ? JSON.parse(row.metrics) : row.metrics
    }));
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load projects.' });
  }
});

apiRouter.post('/admin/projects', requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).adminUser;
    const parsed = projectInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid project data.' });
      return;
    }
    const p = parsed.data;
    const id = `prj_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const slug = (p.slug || p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));

    await pg.query(
      `INSERT INTO projects (
        id, slug, title, category, short_description, full_case_study,
        cover_image, gallery_images, tech_stack, live_url, repo_url,
        client_name, completion_date, is_featured, is_published, metrics
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        id,
        slug,
        p.title,
        p.category || 'Business Website',
        p.short_description || '',
        p.full_case_study || '',
        p.cover_image || '/assets/projects/sd-tech-photograph.png',
        JSON.stringify(p.gallery_images || []),
        JSON.stringify(p.tech_stack || ['React', 'TypeScript', 'Tailwind CSS']),
        p.live_url && String(p.live_url).trim() ? String(p.live_url).trim() : null,
        p.repo_url && String(p.repo_url).trim() ? String(p.repo_url).trim() : null,
        p.client_name && String(p.client_name).trim() ? String(p.client_name).trim() : null,
        p.completion_date || '2026',
        p.is_featured === true,
        p.is_published !== false,
        JSON.stringify(p.metrics || [])
      ]
    );

    await logAdminAction(admin.id, admin.name, 'CREATE_PROJECT', 'project', id, { title: p.title });
    res.status(201).json({ success: true, id, message: 'Project created successfully.' });
  } catch (err: any) {
    console.error('Project creation failed.');
    res.status(500).json({ error: 'Failed to create project. Slug must be unique.' });
  }
});

apiRouter.put('/admin/projects/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const admin = (req as any).adminUser;
    const parsed = projectPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid project data.' });
      return;
    }
    const p = parsed.data;

    const existingRes = await pg.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }
    const existing = existingRes.rows[0] as any;

    const slug = (p.slug && String(p.slug).trim()) || existing.slug || (p.title && String(p.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) || id;
    const title = p.title !== undefined ? String(p.title) : existing.title;
    const category = p.category !== undefined ? String(p.category) : existing.category;
    const short_description = p.short_description !== undefined ? String(p.short_description) : existing.short_description;
    const full_case_study = p.full_case_study !== undefined ? String(p.full_case_study) : existing.full_case_study;
    const cover_image = p.cover_image !== undefined ? String(p.cover_image) : existing.cover_image;
    
    // Parse arrays safely
    const gallery_images = JSON.stringify(p.gallery_images ?? parsedJsonArray(existing.gallery_images));
    const tech_stack = JSON.stringify(p.tech_stack ?? parsedJsonArray(existing.tech_stack));

    const live_url = p.live_url !== undefined 
      ? (p.live_url && String(p.live_url).trim() ? String(p.live_url).trim() : null) 
      : existing.live_url;
    const repo_url = p.repo_url !== undefined 
      ? (p.repo_url && String(p.repo_url).trim() ? String(p.repo_url).trim() : null) 
      : existing.repo_url;
    const client_name = p.client_name !== undefined 
      ? (p.client_name && String(p.client_name).trim() ? String(p.client_name).trim() : null) 
      : existing.client_name;
    const completion_date = p.completion_date !== undefined ? String(p.completion_date) : existing.completion_date;
    const is_featured = p.is_featured !== undefined ? Boolean(p.is_featured) : Boolean(existing.is_featured);
    const is_published = p.is_published !== undefined ? Boolean(p.is_published) : Boolean(existing.is_published);
    
    const metrics = JSON.stringify(p.metrics ?? parsedJsonArray(existing.metrics));

    await pg.query(
      `UPDATE projects SET
        slug = $1,
        title = $2,
        category = $3,
        short_description = $4,
        full_case_study = $5,
        cover_image = $6,
        gallery_images = $7,
        tech_stack = $8,
        live_url = $9,
        repo_url = $10,
        client_name = $11,
        completion_date = $12,
        is_featured = $13,
        is_published = $14,
        metrics = $15,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $16`,
      [
        slug,
        title,
        category,
        short_description,
        full_case_study,
        cover_image,
        gallery_images,
        tech_stack,
        live_url,
        repo_url,
        client_name,
        completion_date,
        is_featured,
        is_published,
        metrics,
        id
      ]
    );

    await logAdminAction(admin.id, admin.name, 'UPDATE_PROJECT', 'project', id, { title });
    res.json({ success: true, message: 'Project updated successfully.' });
  } catch (err: any) {
    console.error('Project update failed.');
    res.status(500).json({ error: 'Failed to update project.' });
  }
});

apiRouter.delete('/admin/projects/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const admin = (req as any).adminUser;
    const check = await pg.query('SELECT title FROM projects WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }
    const projectTitle = (check.rows[0] as any).title;
    await pg.query('DELETE FROM projects WHERE id = $1', [id]);
    await logAdminAction(admin.id, admin.name, 'DELETE_PROJECT', 'project', id, { title: projectTitle });
    res.json({ success: true, message: 'Project deleted successfully.' });
  } catch (err: any) {
    console.error('Project deletion failed.');
    res.status(500).json({ error: 'Failed to delete project.' });
  }
});

// Admin Blog Posts CRUD
apiRouter.get('/admin/blog', requireAdmin, async (_req, res) => {
  try {
    const result = await pg.query('SELECT * FROM blog_posts ORDER BY created_at DESC');
    const parsed = result.rows.map((row: any) => ({
      ...row,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags
    }));
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load blog posts.' });
  }
});

apiRouter.post('/admin/blog', requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).adminUser;
    const parsed = blogInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid article data.' });
      return;
    }
    const b = parsed.data;
    const id = `pst_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const slug = (b.slug || b.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));

    await pg.query(
      `INSERT INTO blog_posts (
        id, slug, title, excerpt, content, author,
        cover_image, category, tags, reading_time_minutes,
        is_published, seo_title, seo_description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id,
        slug,
        b.title,
        b.excerpt || '',
        b.content || '',
        b.author || admin.name,
        b.cover_image || '/assets/projects/clothing-brand.png',
        b.category || 'Web Engineering',
        JSON.stringify(b.tags || ['Nepal', 'Engineering']),
        b.reading_time_minutes,
        b.is_published,
        b.seo_title || b.title,
        b.seo_description || b.excerpt
      ]
    );

    await logAdminAction(admin.id, admin.name, 'CREATE_BLOG_POST', 'blog', id, { title: b.title });
    res.status(201).json({ success: true, id, message: 'Article created successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create blog post.' });
  }
});

apiRouter.put('/admin/blog/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const admin = (req as any).adminUser;
    const parsed = blogPatchSchema.safeParse(req.body);
    if (!parsed.success || Object.keys(parsed.data || {}).length === 0) {
      res.status(400).json({ error: 'Invalid article data.' });
      return;
    }
    const existingRes = await pg.query('SELECT * FROM blog_posts WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      res.status(404).json({ error: 'Article not found.' });
      return;
    }
    const b = { ...(existingRes.rows[0] as Record<string, unknown>), ...parsed.data } as Record<string, any>;

    await pg.query(
      `UPDATE blog_posts SET
        slug = $1,
        title = $2,
        excerpt = $3,
        content = $4,
        author = $5,
        cover_image = $6,
        category = $7,
        tags = $8,
        reading_time_minutes = $9,
        is_published = $10,
        seo_title = $11,
        seo_description = $12,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $13`,
      [
        b.slug,
        b.title,
        b.excerpt,
        b.content,
        b.author,
        b.cover_image,
        b.category,
        JSON.stringify(b.tags || []),
        Number(b.reading_time_minutes || 5),
        Boolean(b.is_published),
        b.seo_title,
        b.seo_description,
        id
      ]
    );

    await logAdminAction(admin.id, admin.name, 'UPDATE_BLOG_POST', 'blog', id, { title: b.title });
    res.json({ success: true, message: 'Article updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update article.' });
  }
});

apiRouter.delete('/admin/blog/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const admin = (req as any).adminUser;
    await pg.query('DELETE FROM blog_posts WHERE id = $1', [id]);
    await logAdminAction(admin.id, admin.name, 'DELETE_BLOG_POST', 'blog', id);
    res.json({ success: true, message: 'Article deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete article.' });
  }
});

// Admin Media Upload
apiRouter.post('/admin/media/upload', requireAdmin, upload.single('file') as any, async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded or file type unsupported.' });
      return;
    }

    if (!hasValidImageSignature(req.file.path, req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      res.status(400).json({ error: 'The uploaded file is not a supported image.' });
      return;
    }

    const admin = (req as any).adminUser;
    const id = `med_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const url = `/uploads/${req.file.filename}`;
    const originalName = path.basename(req.file.originalname).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 255);
    const altText = typeof req.body.alt_text === 'string'
      ? req.body.alt_text.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 500)
      : originalName;

    await pg.query(
      `INSERT INTO media_assets (id, filename, original_name, mime_type, file_size, url, alt_text)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, req.file.filename, originalName, req.file.mimetype, req.file.size, url, altText]
    );

    await logAdminAction(admin.id, admin.name, 'UPLOAD_MEDIA', 'media', id, { filename: req.file.filename });
    res.status(201).json({
      success: true,
      media: {
        id,
        filename: req.file.filename,
        url,
        alt_text: altText,
        file_size: req.file.size
      }
    });
  } catch (err: any) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'File upload failed.' });
  }
});

apiRouter.get('/admin/media', requireAdmin, async (_req, res) => {
  try {
    const result = await pg.query('SELECT * FROM media_assets ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch media assets.' });
  }
});

apiRouter.delete('/admin/media/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const admin = (req as any).adminUser;
    const fileRes = await pg.query('SELECT filename FROM media_assets WHERE id = $1', [id]);
    if (fileRes.rows.length > 0) {
      const filename = (fileRes.rows[0] as any).filename;
      if (path.basename(filename) !== filename) {
        res.status(400).json({ error: 'Invalid media record.' });
        return;
      }
      const filePath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    await pg.query('DELETE FROM media_assets WHERE id = $1', [id]);
    await logAdminAction(admin.id, admin.name, 'DELETE_MEDIA', 'media', id);
    res.json({ success: true, message: 'Media asset deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete media asset.' });
  }
});

// Update Site Settings
apiRouter.put('/admin/settings', requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).adminUser;
    const parsed = generalSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid site settings.' });
      return;
    }
    const newSettings = parsed.data;

    await pg.query(
      `INSERT INTO site_settings (key, value, updated_at) 
       VALUES ('general', $1, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE 
       SET value = $1, updated_at = CURRENT_TIMESTAMP`,
      [JSON.stringify(newSettings)]
    );

    await logAdminAction(admin.id, admin.name, 'UPDATE_SETTINGS', 'settings', 'general');
    res.json({ success: true, message: 'Settings saved successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update settings.' });
  }
});

// Admin Audit Activity Log
apiRouter.get('/admin/activity', requireAdmin, async (_req, res) => {
  try {
    const result = await pg.query('SELECT * FROM admin_activity_logs ORDER BY created_at DESC LIMIT 50');
    const parsed = result.rows.map((row: any) => ({
      ...row,
      details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details
    }));
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load audit logs.' });
  }
});
