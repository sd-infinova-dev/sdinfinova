import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { z } from 'zod';
import type { AppContext, D1Database } from '../_lib/types';
import {
  hashPasswordPbkdf2,
  verifyPassword,
  sha256Hex,
  timingSafeEqualStr,
  generateSecureToken
} from '../_lib/auth';

const app = new Hono<AppContext>().basePath('/api/v1');

// Helpers
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char] as string);

function parseJsonField<T = unknown>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T; } catch { return fallback; }
  }
  return fallback;
}

function hasValidImageSignature(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === 'image/png') return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  if (mimeType === 'image/gif') {
    const text = new TextDecoder('ascii').decode(bytes.slice(0, 6));
    return text === 'GIF87a' || text === 'GIF89a';
  }
  if (mimeType === 'image/webp') {
    const riff = new TextDecoder('ascii').decode(bytes.slice(0, 4));
    const webp = new TextDecoder('ascii').decode(bytes.slice(8, 12));
    return bytes.length >= 12 && riff === 'RIFF' && webp === 'WEBP';
  }
  return false;
}

// Log admin action in D1
async function logAdminAction(db: D1Database, userId: string, userName: string, action: string, targetType: string, targetId: string, details: Record<string, unknown> = {}) {
  try {
    const id = `log_${Date.now()}_${crypto.randomUUID().slice(0, 5)}`;
    await db.prepare(
      `INSERT INTO admin_activity_logs (id, user_id, user_name, action, target_type, target_id, details, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'))`
    ).bind(id, userId, userName, action, targetType, targetId, JSON.stringify(details)).run();
  } catch (err) {
    console.error('Failed to log admin action', err);
  }
}

// Security Middleware: CSRF Validation
app.use('*', async (c, next) => {
  const method = c.req.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }
  const path = c.req.path;
  // Exempt public endpoints
  if (path === '/api/v1/inquiries' || path === '/api/v1/analytics/pageview' || path === '/api/v1/auth/login') {
    return next();
  }

  const cookieToken = getCookie(c, '_csrf');
  const headerToken = c.req.header('x-csrf-token');

  if (!cookieToken || !headerToken || !/^[A-Za-z0-9_-]{43}$/.test(cookieToken) || !/^[A-Za-z0-9_-]{43}$/.test(headerToken) || !timingSafeEqualStr(cookieToken, headerToken)) {
    return c.json({ error: 'CSRF validation failed. Refresh the page and try again.' }, 403);
  }
  return next();
});

// Admin Auth Middleware
async function requireAdmin(c: any, next: () => Promise<void>) {
  const token = getCookie(c, 'admin_token');
  if (!token) {
    return c.json({ error: 'Unauthorized. Admin session required.' }, 401);
  }

  try {
    const tokenHash = await sha256Hex(token);
    const session = await c.env.DB.prepare(
      `SELECT s.*, u.id as user_id, u.email, u.name, u.role, u.must_change_password
       FROM admin_sessions s
       JOIN admin_users u ON s.user_id = u.id
       WHERE s.token = ?1 AND s.expires_at > datetime('now')`
    ).bind(tokenHash).first() as any;

    if (!session) {
      return c.json({ error: 'Session expired or invalid.' }, 401);
    }
    if (session.must_change_password) {
      return c.json({ error: 'Administrator credential rotation is required before access.' }, 403);
    }
    if (!['admin', 'superadmin'].includes(session.role)) {
      return c.json({ error: 'Administrator permission required.' }, 403);
    }

    c.set('adminUser', {
      id: session.user_id,
      email: session.email,
      name: session.name,
      role: session.role
    });
    return next();
  } catch (err) {
    return c.json({ error: 'Authentication verification failure.' }, 500);
  }
}

// -------------------------------------------------------------
// Public Endpoints
// -------------------------------------------------------------

// Health check
app.get('/health', async (c) => {
  try {
    await c.env.DB.prepare('SELECT 1').run();
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'SD Infinova Core API (Cloudflare Pages)',
      database: 'reachable'
    });
  } catch (err) {
    return c.json({ status: 'unavailable', error: 'Database unavailable.' }, 503);
  }
});

// Settings (Public)
app.get('/settings', async (c) => {
  try {
    const row = await c.env.DB.prepare("SELECT value FROM site_settings WHERE key = 'general'").first() as any;
    if (!row) return c.json({});
    return c.json(parseJsonField(row.value, {}));
  } catch {
    return c.json({ error: 'Failed to retrieve site settings.' }, 500);
  }
});

// Services (Public)
app.get('/services', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM services WHERE is_published = 1 ORDER BY sort_order ASC').all();
    const parsed = results.map((row: any) => ({
      ...row,
      is_published: Boolean(row.is_published),
      deliverables: parseJsonField(row.deliverables, []),
      workflow: parseJsonField(row.workflow, []),
      problems_solved: parseJsonField(row.problems_solved, [])
    }));
    return c.json(parsed);
  } catch {
    return c.json({ error: 'Failed to retrieve services.' }, 500);
  }
});

// Projects (Public)
app.get('/projects', async (c) => {
  try {
    const category = c.req.query('category');
    let query = 'SELECT * FROM projects WHERE is_published = 1';
    const params: any[] = [];
    if (category) {
      query += ' AND category = ?1';
      params.push(category);
    }
    query += ' ORDER BY is_featured DESC, created_at DESC';
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    const parsed = results.map((row: any) => ({
      ...row,
      is_featured: Boolean(row.is_featured),
      is_published: Boolean(row.is_published),
      gallery_images: parseJsonField(row.gallery_images, []),
      tech_stack: parseJsonField(row.tech_stack, []),
      metrics: parseJsonField(row.metrics, [])
    }));
    return c.json(parsed);
  } catch {
    return c.json({ error: 'Failed to retrieve projects.' }, 500);
  }
});

app.get('/projects/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    const row = await c.env.DB.prepare('SELECT * FROM projects WHERE slug = ?1 AND is_published = 1').bind(slug).first() as any;
    if (!row) return c.json({ error: 'Project not found.' }, 404);
    return c.json({
      ...row,
      is_featured: Boolean(row.is_featured),
      is_published: Boolean(row.is_published),
      gallery_images: parseJsonField(row.gallery_images, []),
      tech_stack: parseJsonField(row.tech_stack, []),
      metrics: parseJsonField(row.metrics, [])
    });
  } catch {
    return c.json({ error: 'Failed to retrieve project.' }, 500);
  }
});

// Blog (Public)
app.get('/blog', async (c) => {
  try {
    const tag = c.req.query('tag');
    let query = 'SELECT * FROM blog_posts WHERE is_published = 1';
    const params: any[] = [];
    if (tag) {
      query += ' AND tags LIKE ?1';
      params.push(`%"${tag}"%`);
    }
    query += ' ORDER BY published_at DESC';
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    const parsed = results.map((row: any) => ({
      ...row,
      is_published: Boolean(row.is_published),
      tags: parseJsonField(row.tags, [])
    }));
    return c.json(parsed);
  } catch {
    return c.json({ error: 'Failed to retrieve blog posts.' }, 500);
  }
});

app.get('/blog/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    const row = await c.env.DB.prepare('SELECT * FROM blog_posts WHERE slug = ?1 AND is_published = 1').bind(slug).first() as any;
    if (!row) return c.json({ error: 'Post not found.' }, 404);
    return c.json({
      ...row,
      is_published: Boolean(row.is_published),
      tags: parseJsonField(row.tags, [])
    });
  } catch {
    return c.json({ error: 'Failed to retrieve blog post.' }, 500);
  }
});

// Inquiries Submit (Public)
const inquirySchema = z.object({
  name: z.string().trim().min(2).max(120),
  business_name: z.string().trim().max(160).optional().default(''),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional().default(''),
  location: z.string().trim().max(120).optional().default('Nepal'),
  project_type: z.string().trim().min(1).max(120),
  budget_range: z.string().trim().min(1).max(120),
  expected_timeline: z.string().trim().max(120).optional().default('Flexible'),
  description: z.string().trim().min(10).max(5000),
  preferred_contact: z.enum(['email', 'phone', 'whatsapp']).default('email')
});

app.post('/inquiries', async (c) => {
  try {
    const body = await c.req.json();
    if (body && typeof body === 'object' && 'honeypot' in body && String((body as any).honeypot).trim() !== '') {
      return c.json({ error: 'Bot detected' }, 400);
    }
    const parseResult = inquirySchema.safeParse(body);
    if (!parseResult.success) {
      return c.json({ error: 'Validation failed', details: parseResult.error.format() }, 400);
    }
    const data = parseResult.data;
    const id = `inq_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    await c.env.DB.prepare(
      `INSERT INTO contact_inquiries (
        id, name, business_name, email, phone, location,
        project_type, budget_range, expected_timeline, description,
        preferred_contact, status, internal_notes, created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'new', '', datetime('now'), datetime('now'))`
    ).bind(
      id, data.name, data.business_name, data.email, data.phone, data.location,
      data.project_type, data.budget_range, data.expected_timeline, data.description,
      data.preferred_contact
    ).run();

    let studioEmail = c.env.NOTIFICATION_EMAIL || 'sd.infinova@gmail.com';
    let studioWhatsApp = c.env.WHATSAPP_NUMBER || '9779800000000';

    try {
      const settingsRow = await c.env.DB.prepare("SELECT value FROM site_settings WHERE key = 'general'").first() as any;
      if (settingsRow) {
        const val = parseJsonField<any>(settingsRow.value, {});
        if (val.contact_email) studioEmail = val.contact_email;
        if (val.whatsapp_number) studioWhatsApp = val.whatsapp_number.replace(/[^0-9]/g, '');
      }
    } catch {}

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

    const cleanStudioWhatsApp = studioWhatsApp.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/${cleanStudioWhatsApp}?text=${encodeURIComponent(inquirySummary)}`;
    const emailSubject = `New Project Inquiry from ${data.name} — ${data.project_type}`;
    const mailtoUrl = `mailto:${studioEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(inquirySummary.replace(/\*/g, ''))}`;

    // Optional automated email dispatch via Resend REST API if configured
    let emailDispatched = false;
    if (c.env.RESEND_API_KEY) {
      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${c.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: c.env.SMTP_FROM || 'SD Infinova Inquiries <inquiries@sdinfinova.com>',
            to: [studioEmail],
            reply_to: data.email,
            subject: `[SD Infinova Lead] ${data.name} — ${data.project_type}`,
            text: inquirySummary.replace(/\*/g, ''),
            html: `<div style="font-family:sans-serif;background:#0c0d10;color:#f1f2f4;padding:24px;border-radius:12px;max-width:600px;">
              <h2 style="color:#d89f66;">New Project Inquiry Received</h2>
              <p><strong>Client:</strong> ${escapeHtml(data.name)}</p>
              <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
              <p><strong>Phone:</strong> ${escapeHtml(data.phone || 'N/A')}</p>
              <p><strong>Scope:</strong> ${escapeHtml(data.project_type)}</p>
              <p><strong>Budget:</strong> ${escapeHtml(data.budget_range)}</p>
              <p><strong>Timeline:</strong> ${escapeHtml(data.expected_timeline)}</p>
              <p><strong>Description:</strong><br/>${escapeHtml(data.description)}</p>
            </div>`
          })
        });
        emailDispatched = emailRes.ok;
      } catch (mailErr) {
        console.error('Email dispatch failed', mailErr);
      }
    }

    return c.json({
      success: true,
      inquiry_id: id,
      preferred_contact: data.preferred_contact,
      whatsapp_url: whatsappUrl,
      mailto_url: mailtoUrl,
      studio_whatsapp: studioWhatsApp,
      studio_email: studioEmail,
      email_dispatched: emailDispatched
    }, 201);
  } catch (err) {
    return c.json({ error: 'Failed to record inquiry.' }, 500);
  }
});

// Analytics (Public)
app.post('/analytics/pageview', async (c) => {
  try {
    const { path: pagePath, referrer } = await c.req.json();
    if (typeof pagePath !== 'string' || !pagePath.startsWith('/') || pagePath.length > 1000 ||
        pagePath.startsWith('/admin') || pagePath.startsWith('/api/') || pagePath.includes('#admin')) {
      return c.json({ recorded: false });
    }
    const today = new Date().toISOString().split('T')[0];
    const id = `pv_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
    const userAgent = (c.req.header('user-agent') || 'unknown').slice(0, 150);

    await c.env.DB.prepare(
      `INSERT INTO page_views (id, path, referrer, user_agent, date_str, timestamp)
       VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))`
    ).bind(id, pagePath, String(referrer || 'direct').slice(0, 500), userAgent, today).run();

    return c.json({ recorded: true });
  } catch {
    return c.json({ recorded: false });
  }
});

// CSRF Token
app.get('/auth/csrf-token', (c) => {
  let csrfToken = getCookie(c, '_csrf');
  if (!csrfToken || !/^[A-Za-z0-9_-]{43}$/.test(csrfToken)) {
    csrfToken = generateSecureToken();
  }
  setCookie(c, '_csrf', csrfToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: '/api/v1',
    maxAge: 8 * 60 * 60
  });
  c.header('Cache-Control', 'no-store');
  return c.json({ csrfToken });
});

// Admin Login
app.post('/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return c.json({ error: 'Email and password are required.' }, 400);
    }
    const normalizedEmail = email.trim().toLowerCase();

    // Check if any admin exists. If not, auto-bootstrap using INITIAL_ADMIN environment variables
    const adminCount = await c.env.DB.prepare('SELECT count(*) as count FROM admin_users').first('count') as number;
    if (adminCount === 0) {
      const initEmail = (c.env.INITIAL_ADMIN_EMAIL || '').trim().toLowerCase();
      const initPass = c.env.INITIAL_ADMIN_PASSWORD || '';
      if (initEmail && initPass && initPass.length >= 16 && normalizedEmail === initEmail && password === initPass) {
        const hash = await hashPasswordPbkdf2(initPass);
        const adminId = `usr_${crypto.randomUUID()}`;
        await c.env.DB.prepare(
          `INSERT INTO admin_users (id, email, password_hash, name, role, created_at, updated_at)
           VALUES (?1, ?2, ?3, 'SD Infinova Admin', 'superadmin', datetime('now'), datetime('now'))`
        ).bind(adminId, initEmail, hash).run();
      }
    }

    const user = await c.env.DB.prepare('SELECT * FROM admin_users WHERE email = ?1').bind(normalizedEmail).first() as any;
    if (!user) {
      return c.json({ error: 'Invalid credentials. Access restricted to authorized personnel.' }, 401);
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return c.json({ error: 'Invalid credentials. Access restricted to authorized personnel.' }, 401);
    }

    // Create session
    const token = generateSecureToken();
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();

    await c.env.DB.prepare(
      `INSERT INTO admin_sessions (id, user_id, token, expires_at, created_at)
       VALUES (?1, ?2, ?3, ?4, datetime('now'))`
    ).bind(`ses_${crypto.randomUUID()}`, user.id, tokenHash, expiresAt).run();

    await logAdminAction(c.env.DB, user.id, user.name, 'LOGIN', 'auth', user.id, { email: user.email });

    setCookie(c, 'admin_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      path: '/',
      maxAge: 8 * 60 * 60
    });

    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login failed', err);
    return c.json({ error: 'Internal server error during authentication.' }, 500);
  }
});

// -------------------------------------------------------------
// Admin Authenticated Endpoints
// -------------------------------------------------------------

app.get('/auth/me', requireAdmin, (c) => {
  return c.json({ user: c.get('adminUser') });
});

app.post('/auth/logout', requireAdmin, async (c) => {
  try {
    const token = getCookie(c, 'admin_token');
    if (token) {
      const tokenHash = await sha256Hex(token);
      await c.env.DB.prepare('DELETE FROM admin_sessions WHERE token = ?1').bind(tokenHash).run();
    }
    deleteCookie(c, 'admin_token', { path: '/' });
    return c.json({ success: true, message: 'Logged out successfully.' });
  } catch {
    return c.json({ error: 'Logout failed.' }, 500);
  }
});

app.put('/auth/password', requireAdmin, async (c) => {
  try {
    const admin = c.get('adminUser')!;
    const { current_password, new_password } = await c.req.json();
    if (!current_password || !new_password || typeof new_password !== 'string' || new_password.length < 16) {
      return c.json({ error: 'New password must be at least 16 characters.' }, 400);
    }
    const user = await c.env.DB.prepare('SELECT password_hash FROM admin_users WHERE id = ?1').bind(admin.id).first() as any;
    if (!user || !(await verifyPassword(current_password, user.password_hash))) {
      return c.json({ error: 'Current password incorrect.' }, 401);
    }

    const newHash = await hashPasswordPbkdf2(new_password);
    await c.env.DB.prepare('UPDATE admin_users SET password_hash = ?1, updated_at = datetime(\'now\') WHERE id = ?2').bind(newHash, admin.id).run();
    await c.env.DB.prepare('DELETE FROM admin_sessions WHERE user_id = ?1').bind(admin.id).run();
    await logAdminAction(c.env.DB, admin.id, admin.name, 'PASSWORD_CHANGE', 'auth', admin.id);

    deleteCookie(c, 'admin_token', { path: '/' });
    return c.json({ success: true, message: 'Password updated. Please log in with your new password.' });
  } catch {
    return c.json({ error: 'Failed to update password.' }, 500);
  }
});

// Dashboard Stats
app.get('/admin/dashboard', requireAdmin, async (c) => {
  try {
    const [totalViews, totalInq, newInq, wonInq, pubProjects, pubBlog, topPaths, dailyViews, recentInq] = await Promise.all([
      c.env.DB.prepare('SELECT count(*) as count FROM page_views').first('count') as Promise<number>,
      c.env.DB.prepare('SELECT count(*) as count FROM contact_inquiries').first('count') as Promise<number>,
      c.env.DB.prepare("SELECT count(*) as count FROM contact_inquiries WHERE status = 'new'").first('count') as Promise<number>,
      c.env.DB.prepare("SELECT count(*) as count FROM contact_inquiries WHERE status = 'won'").first('count') as Promise<number>,
      c.env.DB.prepare('SELECT count(*) as count FROM projects WHERE is_published = 1').first('count') as Promise<number>,
      c.env.DB.prepare('SELECT count(*) as count FROM blog_posts WHERE is_published = 1').first('count') as Promise<number>,
      c.env.DB.prepare('SELECT path, count(*) as count FROM page_views GROUP BY path ORDER BY count DESC LIMIT 8').all(),
      c.env.DB.prepare('SELECT date_str, count(*) as count FROM page_views GROUP BY date_str ORDER BY date_str DESC LIMIT 14').all(),
      c.env.DB.prepare('SELECT * FROM contact_inquiries ORDER BY created_at DESC LIMIT 6').all()
    ]);

    return c.json({
      stats: {
        totalViews: totalViews || 0,
        totalInquiries: totalInq || 0,
        newInquiries: newInq || 0,
        wonInquiries: wonInq || 0,
        publishedProjects: pubProjects || 0,
        publishedArticles: pubBlog || 0
      },
      topPaths: topPaths.results || [],
      dailyViews: dailyViews.results || [],
      recentInquiries: recentInq.results || []
    });
  } catch (err) {
    return c.json({ error: 'Failed to generate dashboard metrics.' }, 500);
  }
});

// Admin Inquiries
app.get('/admin/inquiries', requireAdmin, async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM contact_inquiries ORDER BY created_at DESC').all();
    return c.json(results);
  } catch {
    return c.json({ error: 'Failed to fetch inquiries.' }, 500);
  }
});

app.put('/admin/inquiries/:id', requireAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    const { status, internal_notes } = await c.req.json();
    await c.env.DB.prepare(
      `UPDATE contact_inquiries
       SET status = COALESCE(?1, status),
           internal_notes = COALESCE(?2, internal_notes),
           updated_at = datetime('now')
       WHERE id = ?3`
    ).bind(status || null, internal_notes || null, id).run();
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Failed to update inquiry.' }, 500);
  }
});

app.delete('/admin/inquiries/:id', requireAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM contact_inquiries WHERE id = ?1').bind(id).run();
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Failed to delete inquiry.' }, 500);
  }
});

// Admin Projects
app.get('/admin/projects', requireAdmin, async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
    return c.json(results.map((r: any) => ({
      ...r,
      is_featured: Boolean(r.is_featured),
      is_published: Boolean(r.is_published),
      gallery_images: parseJsonField(r.gallery_images, []),
      tech_stack: parseJsonField(r.tech_stack, []),
      metrics: parseJsonField(r.metrics, [])
    })));
  } catch {
    return c.json({ error: 'Failed to fetch projects.' }, 500);
  }
});

app.post('/admin/projects', requireAdmin, async (c) => {
  try {
    const data = await c.req.json();
    const id = `prj_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
    await c.env.DB.prepare(
      `INSERT INTO projects (
        id, slug, title, category, short_description, full_case_study,
        cover_image, gallery_images, tech_stack, live_url, repo_url,
        client_name, completion_date, is_featured, is_published, metrics,
        created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, datetime('now'), datetime('now'))`
    ).bind(
      id, data.slug, data.title, data.category, data.short_description, data.full_case_study,
      data.cover_image, JSON.stringify(data.gallery_images || []), JSON.stringify(data.tech_stack || []),
      data.live_url || '', data.repo_url || '', data.client_name || '', data.completion_date || '',
      data.is_featured ? 1 : 0, data.is_published ? 1 : 0, JSON.stringify(data.metrics || [])
    ).run();
    return c.json({ success: true, id }, 201);
  } catch {
    return c.json({ error: 'Failed to create project.' }, 500);
  }
});

app.put('/admin/projects/:id', requireAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    const data = await c.req.json();
    await c.env.DB.prepare(
      `UPDATE projects SET
        slug = ?1, title = ?2, category = ?3, short_description = ?4, full_case_study = ?5,
        cover_image = ?6, gallery_images = ?7, tech_stack = ?8, live_url = ?9, repo_url = ?10,
        client_name = ?11, completion_date = ?12, is_featured = ?13, is_published = ?14, metrics = ?15,
        updated_at = datetime('now')
       WHERE id = ?16`
    ).bind(
      data.slug, data.title, data.category, data.short_description, data.full_case_study,
      data.cover_image, JSON.stringify(data.gallery_images || []), JSON.stringify(data.tech_stack || []),
      data.live_url || '', data.repo_url || '', data.client_name || '', data.completion_date || '',
      data.is_featured ? 1 : 0, data.is_published ? 1 : 0, JSON.stringify(data.metrics || []),
      id
    ).run();
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Failed to update project.' }, 500);
  }
});

app.delete('/admin/projects/:id', requireAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM projects WHERE id = ?1').bind(id).run();
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Failed to delete project.' }, 500);
  }
});

// Admin Blog
app.get('/admin/blog', requireAdmin, async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM blog_posts ORDER BY created_at DESC').all();
    return c.json(results.map((r: any) => ({
      ...r,
      is_published: Boolean(r.is_published),
      tags: parseJsonField(r.tags, [])
    })));
  } catch {
    return c.json({ error: 'Failed to fetch blog posts.' }, 500);
  }
});

app.post('/admin/blog', requireAdmin, async (c) => {
  try {
    const data = await c.req.json();
    const id = `pst_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
    await c.env.DB.prepare(
      `INSERT INTO blog_posts (
        id, slug, title, excerpt, content, author, cover_image, category,
        tags, reading_time_minutes, is_published, published_at, seo_title, seo_description,
        created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, datetime('now'), ?12, ?13, datetime('now'), datetime('now'))`
    ).bind(
      id, data.slug, data.title, data.excerpt, data.content, data.author || 'SD Infinova Team',
      data.cover_image, data.category, JSON.stringify(data.tags || []), data.reading_time_minutes || 5,
      data.is_published ? 1 : 0, data.seo_title || null, data.seo_description || null
    ).run();
    return c.json({ success: true, id }, 201);
  } catch {
    return c.json({ error: 'Failed to create blog post.' }, 500);
  }
});

app.put('/admin/blog/:id', requireAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    const data = await c.req.json();
    await c.env.DB.prepare(
      `UPDATE blog_posts SET
        slug = ?1, title = ?2, excerpt = ?3, content = ?4, author = ?5, cover_image = ?6,
        category = ?7, tags = ?8, reading_time_minutes = ?9, is_published = ?10,
        seo_title = ?11, seo_description = ?12, updated_at = datetime('now')
       WHERE id = ?13`
    ).bind(
      data.slug, data.title, data.excerpt, data.content, data.author, data.cover_image,
      data.category, JSON.stringify(data.tags || []), data.reading_time_minutes,
      data.is_published ? 1 : 0, data.seo_title, data.seo_description, id
    ).run();
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Failed to update blog post.' }, 500);
  }
});

app.delete('/admin/blog/:id', requireAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM blog_posts WHERE id = ?1').bind(id).run();
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Failed to delete blog post.' }, 500);
  }
});

// Admin Media (R2 Object Storage)
app.post('/admin/media/upload', requireAdmin, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No file uploaded or file type unsupported.' }, 400);
    }

    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: 'File size exceeds 5 MB limit.' }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const allowedMimes: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif'
    };
    const ext = allowedMimes[file.type];
    if (!ext || !hasValidImageSignature(bytes, file.type)) {
      return c.json({ error: 'The uploaded file is not a supported image.' }, 400);
    }

    const filename = `asset_${Date.now()}_${crypto.randomUUID().slice(0, 8)}${ext}`;
    const id = `med_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
    const url = `/uploads/${filename}`;
    const altText = (formData.get('alt_text') as string || file.name).slice(0, 500);

    // Save to R2 Bucket
    if (c.env.MEDIA_BUCKET) {
      await c.env.MEDIA_BUCKET.put(filename, arrayBuffer, {
        httpMetadata: { contentType: file.type }
      });
    }

    // Save to D1
    await c.env.DB.prepare(
      `INSERT INTO media_assets (id, filename, original_name, mime_type, file_size, url, alt_text, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'))`
    ).bind(id, filename, file.name.slice(0, 255), file.type, file.size, url, altText).run();

    const admin = c.get('adminUser')!;
    await logAdminAction(c.env.DB, admin.id, admin.name, 'UPLOAD_MEDIA', 'media', id, { filename });

    return c.json({
      success: true,
      media: {
        id,
        filename,
        url,
        alt_text: altText,
        file_size: file.size
      }
    }, 201);
  } catch (err) {
    console.error('Media upload failed', err);
    return c.json({ error: 'File upload failed.' }, 500);
  }
});

app.get('/admin/media', requireAdmin, async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM media_assets ORDER BY created_at DESC').all();
    return c.json(results);
  } catch {
    return c.json({ error: 'Failed to fetch media assets.' }, 500);
  }
});

app.delete('/admin/media/:id', requireAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    const asset = await c.env.DB.prepare('SELECT filename FROM media_assets WHERE id = ?1').bind(id).first() as any;
    if (asset && c.env.MEDIA_BUCKET) {
      try { await c.env.MEDIA_BUCKET.delete(asset.filename); } catch {}
    }
    await c.env.DB.prepare('DELETE FROM media_assets WHERE id = ?1').bind(id).run();
    const admin = c.get('adminUser')!;
    await logAdminAction(c.env.DB, admin.id, admin.name, 'DELETE_MEDIA', 'media', id);
    return c.json({ success: true, message: 'Media asset deleted.' });
  } catch {
    return c.json({ error: 'Failed to delete media asset.' }, 500);
  }
});

// Admin Site Settings
app.put('/admin/settings', requireAdmin, async (c) => {
  try {
    const body = await c.req.json();
    await c.env.DB.prepare(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ('general', ?1, datetime('now'))
       ON CONFLICT (key) DO UPDATE SET value = ?1, updated_at = datetime('now')`
    ).bind(JSON.stringify(body)).run();

    const admin = c.get('adminUser')!;
    await logAdminAction(c.env.DB, admin.id, admin.name, 'UPDATE_SETTINGS', 'settings', 'general');
    return c.json({ success: true, message: 'Settings updated successfully.' });
  } catch {
    return c.json({ error: 'Failed to update settings.' }, 500);
  }
});

// Admin Logs
app.get('/admin/logs', requireAdmin, async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM admin_activity_logs ORDER BY created_at DESC LIMIT 50').all();
    return c.json(results);
  } catch {
    return c.json({ error: 'Failed to fetch activity logs.' }, 500);
  }
});

export { app };
export const onRequest = handle(app);
