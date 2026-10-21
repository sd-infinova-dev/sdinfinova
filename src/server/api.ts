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

// Public routes that are exempt from CSRF protection.
// Mount this router BEFORE csurf() middleware in server.ts.
export const publicApiRouter = Router();

// Ensure upload directory exists
const UPLOADS_DIR = path.resolve(process.cwd(), 'public/uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage configuration with mime type and size restrictions
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanExt = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'].includes(ext) ? ext : '.jpg';
    const rand = crypto.randomBytes(8).toString('hex');
    cb(null, `asset_${Date.now()}_${rand}${cleanExt}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (allowedMime.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, SVG, and GIF images are allowed.'));
    }
  }
});

// Middleware: Verify Admin Authentication
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.cookies?.admin_token || req.headers['x-admin-token'] as string);

  if (!token) {
    res.status(401).json({ error: 'Unauthorized. Admin session required.' });
    return;
  }

  try {
    const sessionRes = await pg.query(
      `SELECT s.*, u.id as user_id, u.email, u.name, u.role 
       FROM admin_sessions s
       JOIN admin_users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > CURRENT_TIMESTAMP`,
      [token]
    );

    if (sessionRes.rows.length === 0) {
      res.status(401).json({ error: 'Session expired or invalid.' });
      return;
    }

    const session = sessionRes.rows[0] as any;
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
    console.error('Failed to write admin activity log:', e);
  }
}

// ==========================================
// PUBLIC ENDPOINTS
// ==========================================

// Health Check
apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'SD Infinova Core API v1',
    database: 'PostgreSQL 16 (PGlite Persistent Engine)'
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
    res.json(val);
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

    // Ensure legacy paths are updated to authentic namespaced assets and verified live URLs
    await pg.exec(`
      UPDATE projects SET 
        live_url = 'https://sd-tech-photograph-ytpn.vercel.app/',
        repo_url = NULL,
        cover_image = '/assets/projects/sd-tech-photograph.png'
      WHERE slug = 'sd-tech-photograph' OR id = 'prj_1';

      UPDATE projects SET 
        live_url = 'https://dental-rust-two.vercel.app/',
        repo_url = NULL,
        cover_image = '/assets/projects/dental-care.png'
      WHERE slug = 'dental-care-clinic-portal' OR id = 'prj_2';

      UPDATE projects SET 
        title = 'SD Infininov - Dashain Reloaded Festive Clothing',
        live_url = 'https://sd-infininova.vercel.app/',
        repo_url = NULL,
        cover_image = '/assets/projects/clothing-brand.png'
      WHERE slug = 'nepal-apparel-clothing-store' OR id = 'prj_3';

      UPDATE projects SET 
        live_url = 'https://findmyhostel.pythonanywhere.com/',
        repo_url = NULL,
        cover_image = '/assets/projects/findmyhostel.png'
      WHERE slug = 'find-my-hostel-nepal' OR id = 'prj_4';
    `);

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
const inquirySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  business_name: z.string().optional().default(''),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional().default(''),
  location: z.string().optional().default('Nepal'),
  project_type: z.string().min(1, 'Please select a project type'),
  budget_range: z.string().min(1, 'Please select a budget range'),
  expected_timeline: z.string().optional().default('Flexible'),
  description: z.string().min(10, 'Project description must be at least 10 characters'),
  preferred_contact: z.enum(['email', 'phone', 'whatsapp']).default('email')
});

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
                <tr><td style="padding: 6px 0; color: #9ca3af;">Client:</td><td><strong>${data.name}</strong></td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Business:</td><td>${data.business_name || 'Individual'}</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Email:</td><td><a href="mailto:${data.email}" style="color: #d89f66;">${data.email}</a></td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Phone / WhatsApp:</td><td>${data.phone || 'N/A'}</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Preferred Contact:</td><td><strong style="color: #4ade80;">${data.preferred_contact.toUpperCase()}</strong></td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Package:</td><td>${data.project_type}</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Budget:</td><td style="color: #d89f66; font-family: monospace;">${data.budget_range}</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Timeline:</td><td>${data.expected_timeline}</td></tr>
              </table>
              <div style="background: #171a22; padding: 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); margin: 16px 0;">
                <div style="color: #9ca3af; font-size: 12px; text-transform: uppercase; margin-bottom: 8px;">Description:</div>
                <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${data.description}</div>
              </div>
              <div style="margin-top: 20px; font-size: 12px; color: #6b7280;">Inquiry ID: ${id}</div>
            </div>
          `
        });
        emailDispatched = true;
      } catch (mailErr) {
        console.error('SMTP automated email dispatch error:', mailErr);
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
    console.error('Inquiry submission error:', err);
    res.status(500).json({ error: 'Server error processing your inquiry. Please try again or reach out on WhatsApp.' });
  }
});

// Track Privacy-conscious Pageview
// NOTE: Registered on publicApiRouter (CSRF-exempt) — fire-and-forget ping,
// contains no sensitive mutation so CSRF protection is not needed.
publicApiRouter.post('/analytics/pageview', async (req, res) => {
  try {
    const { path: pagePath, referrer } = req.body;
    if (!pagePath || pagePath.startsWith('/admin')) {
      res.json({ recorded: false });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const id = `pv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const userAgent = (req.headers['user-agent'] || 'unknown').substring(0, 150);

    await pg.query(
      `INSERT INTO page_views (id, path, referrer, user_agent, date_str)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, pagePath, (referrer || 'direct').substring(0, 100), userAgent, today]
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
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

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

    // Create session token (valid for 7 days)
    const token = `adm_tok_${crypto.randomBytes(32).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pg.query(
      `INSERT INTO admin_sessions (id, user_id, token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [`ses_${Date.now()}`, user.id, token, expiresAt]
    );

    await logAdminAction(user.id, user.name, 'LOGIN', 'auth', user.id, { email: user.email });

    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
});

apiRouter.get('/auth/me', requireAdmin, (req, res) => {
  res.json({
    user: (req as any).adminUser
  });
});

apiRouter.post('/auth/logout', requireAdmin, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.cookies?.admin_token || req.headers['x-admin-token'] as string);

    if (token) {
      await pg.query('DELETE FROM admin_sessions WHERE token = $1', [token]);
    }

    res.clearCookie('admin_token');
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Logout failed.' });
  }
});

apiRouter.put('/auth/password', requireAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters long.' });
      return;
    }

    const userId = (req as any).adminUser.id;
    const userRes = await pg.query('SELECT * FROM admin_users WHERE id = $1', [userId]);
    const user = userRes.rows[0] as any;

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      res.status(400).json({ error: 'Current password incorrect.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    await pg.query('UPDATE admin_users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newHash, userId]);

    await logAdminAction(userId, user.name, 'PASSWORD_CHANGE', 'user', userId);
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
    const { status, internal_notes } = req.body;
    const admin = (req as any).adminUser;

    await pg.query(
      `UPDATE contact_inquiries 
       SET status = COALESCE($1, status), 
           internal_notes = COALESCE($2, internal_notes), 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [status, internal_notes, id]
    );

    await logAdminAction(admin.id, admin.name, 'UPDATE_INQUIRY', 'inquiry', id, { status, internal_notes });
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
      const clean = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;
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
    const p = req.body;
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
        p.live_url || '',
        p.repo_url || '',
        p.client_name || '',
        p.completion_date || '2026',
        p.is_featured === true,
        p.is_published !== false,
        JSON.stringify(p.metrics || [])
      ]
    );

    await logAdminAction(admin.id, admin.name, 'CREATE_PROJECT', 'project', id, { title: p.title });
    res.status(201).json({ success: true, id, message: 'Project created successfully.' });
  } catch (err: any) {
    console.error('Project create error:', err);
    res.status(500).json({ error: 'Failed to create project. Slug must be unique.' });
  }
});

apiRouter.put('/admin/projects/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const admin = (req as any).adminUser;
    const p = req.body;

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
        p.slug,
        p.title,
        p.category,
        p.short_description,
        p.full_case_study,
        p.cover_image,
        JSON.stringify(p.gallery_images || []),
        JSON.stringify(p.tech_stack || []),
        p.live_url,
        p.repo_url,
        p.client_name,
        p.completion_date,
        p.is_featured,
        p.is_published,
        JSON.stringify(p.metrics || []),
        id
      ]
    );

    await logAdminAction(admin.id, admin.name, 'UPDATE_PROJECT', 'project', id, { title: p.title });
    res.json({ success: true, message: 'Project updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update project.' });
  }
});

apiRouter.delete('/admin/projects/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const admin = (req as any).adminUser;
    await pg.query('DELETE FROM projects WHERE id = $1', [id]);
    await logAdminAction(admin.id, admin.name, 'DELETE_PROJECT', 'project', id);
    res.json({ success: true, message: 'Project deleted successfully.' });
  } catch (err: any) {
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
    const b = req.body;
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
        parseInt(b.reading_time_minutes || '5', 10),
        b.is_published !== false,
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
    const b = req.body;

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
        parseInt(b.reading_time_minutes || '5', 10),
        b.is_published,
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
apiRouter.post('/admin/media/upload', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded or file type unsupported.' });
      return;
    }

    const admin = (req as any).adminUser;
    const id = `med_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const url = `/uploads/${req.file.filename}`;
    const altText = req.body.alt_text || req.file.originalname;

    await pg.query(
      `INSERT INTO media_assets (id, filename, original_name, mime_type, file_size, url, alt_text)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, url, altText]
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
    res.status(500).json({ error: err.message || 'File upload failed.' });
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
    const newSettings = req.body;

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
