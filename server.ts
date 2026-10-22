import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { createServer as createViteServer } from 'vite';
import { initDatabase, pg } from './src/server/db';
import { apiRouter, publicApiRouter, UPLOADS_DIR, initializeUploadsStorage } from './src/server/api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

function productionConfiguration() {
  if (!isProduction) return;
  const missing = ['PGLITE_DATA_DIR', 'UPLOADS_DIR', 'PUBLIC_ORIGIN', 'CORS_WHITELIST']
    .filter((name) => !process.env[name]?.trim());
  if (missing.length) throw new Error(`Missing required production configuration: ${missing.join(', ')}`);
  const publicOrigin = new URL(process.env.PUBLIC_ORIGIN!);
  if (publicOrigin.protocol !== 'https:') throw new Error('PUBLIC_ORIGIN must use HTTPS in production.');
  const corsOrigins = process.env.CORS_WHITELIST!.split(',').map((origin) => origin.trim()).filter(Boolean);
  if (!corsOrigins.includes(publicOrigin.origin)) {
    throw new Error('CORS_WHITELIST must include the exact PUBLIC_ORIGIN.');
  }
  if (!path.isAbsolute(process.env.PGLITE_DATA_DIR!) || !path.isAbsolute(process.env.UPLOADS_DIR!)) {
    throw new Error('Production data and upload paths must be absolute paths on mounted persistent volumes.');
  }
  for (const directory of [process.env.PGLITE_DATA_DIR!, process.env.UPLOADS_DIR!]) {
    if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
      throw new Error('Production data and upload directories must already exist on configured persistent volumes.');
    }
  }
}

function allowedOrigins(): Set<string> {
  const origins = (process.env.CORS_WHITELIST || '').split(',').map((origin) => origin.trim()).filter(Boolean);
  if (process.env.PUBLIC_ORIGIN) origins.push(process.env.PUBLIC_ORIGIN);
  if (!isProduction && !isTest) origins.push('http://localhost:3000', 'http://localhost:5173');
  if (isTest) origins.push('http://localhost');
  return new Set(origins);
}

const escapeHtml = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character] as string);

function contentPage(title: string, description: string, canonical: string, body: string, image?: string) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description.slice(0, 300));
  const safeCanonical = escapeHtml(canonical);
  const safeImage = image && (/^https:\/\//i.test(image) || image.startsWith('/')) ? image : undefined;
  const imageTag = safeImage ? `<meta property="og:image" content="${escapeHtml(new URL(safeImage, canonical).href)}">` : '';
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description: description.slice(0, 300),
    url: canonical
  }).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle} | SD Infinova</title><meta name="description" content="${safeDescription}"><meta name="robots" content="index,follow"><link rel="canonical" href="${safeCanonical}"><meta property="og:type" content="article"><meta property="og:title" content="${safeTitle} | SD Infinova"><meta property="og:description" content="${safeDescription}"><meta property="og:url" content="${safeCanonical}">${imageTag}<script type="application/ld+json">${jsonLd}</script><style>body{margin:0;background:#090a0c;color:#f1f2f4;font:16px/1.7 system-ui,sans-serif}main{max-width:880px;margin:auto;padding:36px 24px 80px}a{color:#e8a879}h1{font-size:clamp(2rem,6vw,3.5rem);line-height:1.1}h2{margin-top:2rem}img{max-width:100%;height:auto;border-radius:16px}article{color:#d1d5db;white-space:pre-line}.eyebrow{color:#d89f66;text-transform:uppercase;letter-spacing:.12em;font-size:.8rem}li{margin:.4rem 0}</style></head><body><main><a href="/">SD Infinova</a><article>${body}</article></main></body></html>`;
}

export async function createApp() {
  productionConfiguration();
  initializeUploadsStorage();
  await initDatabase();

  const app = express();
  const origins = allowedOrigins();
  const devPreviewOrigins = !isProduction && !isTest
    ? (process.env.DEV_PREVIEW_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean)
    : [];
  const devPreviewHosts = devPreviewOrigins.map((origin) => {
    try { return new URL(origin).hostname; } catch { throw new Error('DEV_PREVIEW_ORIGINS must contain valid origins.'); }
  });
  devPreviewOrigins.forEach((origin) => origins.add(new URL(origin).origin));
  const originAllowed = (origin: string | undefined) => !origin || origins.has(origin);
  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => callback(null, originAllowed(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token']
  };

  const configuredProxyHops = process.env.TRUST_PROXY_HOPS;
  if (configuredProxyHops) {
    const hops = Number(configuredProxyHops);
    if (!Number.isInteger(hops) || hops < 1 || hops > 5) throw new Error('TRUST_PROXY_HOPS must be an integer from 1 to 5.');
    app.set('trust proxy', hops);
  }

  app.use(cors(corsOptions));
  app.use(express.json({ limit: '64kb' }));
  app.use(express.urlencoded({ extended: true, limit: '64kb' }));
  app.use(cookieParser());
  app.use((req, res, next) => {
    const isUnsafeMethod = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    if (isUnsafeMethod && !originAllowed(req.get('origin'))) {
      res.status(403).json({ error: 'Request origin is not allowed.' });
      return;
    }
    next();
  });

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: isProduction ? ["'none'"] : ["'self'", ...devPreviewOrigins],
        formAction: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'"],
        ...(isProduction ? { upgradeInsecureRequests: [] } : {})
      }
    },
    frameguard: devPreviewOrigins.length ? false : { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  }));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many attempts. Please try again later.' }
  });
  const pageViewLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Page-view limit reached.' }
  });
  const inquiryLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many inquiries from this network. Please try again later.' }
  });

  const csrfProtection: express.RequestHandler = (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      next();
      return;
    }
    const cookieToken = req.cookies?._csrf;
    const headerToken = req.get('x-csrf-token');
    if (typeof cookieToken !== 'string' || typeof headerToken !== 'string' ||
        !/^[A-Za-z0-9_-]{43}$/.test(cookieToken) || !/^[A-Za-z0-9_-]{43}$/.test(headerToken) ||
        cookieToken.length !== headerToken.length ||
        !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
      res.status(403).json({ error: 'CSRF validation failed. Refresh the page and try again.' });
      return;
    }
    next();
  };

  app.use('/uploads', express.static(UPLOADS_DIR, {
    dotfiles: 'deny',
    index: false,
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    }
  }));
  app.use('/assets/aistudio', express.static(path.join(__dirname, 'public/assets/aistudio'), { dotfiles: 'deny' }));

  app.get('/robots.txt', (_req, res) => {
    const siteOrigin = (process.env.PUBLIC_ORIGIN || 'https://sdinfinova.com').replace(/\/$/, '');
    res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nUser-agent: OAI-SearchBot\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${siteOrigin}/sitemap.xml\n`);
  });

  app.get('/sitemap.xml', async (_req, res, next) => {
    const siteOrigin = (process.env.PUBLIC_ORIGIN || 'https://sdinfinova.com').replace(/\/$/, '');
    try {
      const [projects, posts, services] = await Promise.all([
        pg.query('SELECT slug, updated_at FROM projects WHERE is_published = true'),
        pg.query('SELECT slug, updated_at FROM blog_posts WHERE is_published = true'),
        pg.query('SELECT slug, created_at AS updated_at FROM services WHERE is_published = true')
      ]);
      const urls = [
        { loc: `${siteOrigin}/`, lastmod: new Date().toISOString().slice(0, 10) },
        ...projects.rows.map((row: any) => ({ loc: `${siteOrigin}/work/${encodeURIComponent(row.slug)}`, lastmod: row.updated_at })),
        ...posts.rows.map((row: any) => ({ loc: `${siteOrigin}/blog/${encodeURIComponent(row.slug)}`, lastmod: row.updated_at })),
        ...services.rows.map((row: any) => ({ loc: `${siteOrigin}/services/${encodeURIComponent(row.slug)}`, lastmod: row.updated_at }))
      ];
      const xmlEscape = (value: unknown) => escapeHtml(value);
      const entries = urls.map(({ loc, lastmod }) => `<url><loc>${xmlEscape(loc)}</loc>${lastmod ? `<lastmod>${new Date(lastmod as string | number | Date).toISOString().slice(0, 10)}</lastmod>` : ''}</url>`).join('');
      res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`);
    } catch (error) {
      next(error);
    }
  });

  app.use('/api/v1/auth/login', authLimiter);
  app.use('/api/v1/inquiries', inquiryLimiter);
  app.use('/api/v1/analytics/pageview', pageViewLimiter);
  app.use('/api/v1', publicApiRouter);
  app.use('/api/v1', csrfProtection, apiRouter);
  app.use('/api/v1', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));

  const distPath = path.resolve(__dirname, 'dist');
  let transformIndexHtml: ((url: string, html: string) => Promise<string>) | undefined;
  if (isProduction) {
    if (!fs.existsSync(path.join(distPath, 'index.html'))) {
      throw new Error('Production frontend bundle is missing. Run the production build before starting the server.');
    }
    app.use(express.static(distPath, { dotfiles: 'deny', index: false }));
  } else if (!isTest) {
    const vite = await createViteServer({
      server: { middlewareMode: true, ...(devPreviewHosts.length ? { allowedHosts: devPreviewHosts } : {}) },
      appType: 'custom'
    });
    transformIndexHtml = (url, html) => vite.transformIndexHtml(url, html);
    app.use(vite.middlewares);
  }

  const indexPath = isProduction ? path.join(distPath, 'index.html') : path.join(__dirname, 'index.html');
  const siteOrigin = (process.env.PUBLIC_ORIGIN || 'https://sdinfinova.com').replace(/\/$/, '');
  const sendApp = async (req: Request, res: Response, next: NextFunction) => {
    const isAdminPage = req.path === '/admin' || req.path.startsWith('/admin/');
    if (transformIndexHtml) {
      try {
        let source = fs.readFileSync(indexPath, 'utf8');
        source = source.replace(/<link rel="canonical" href="[^"]*"\s*\/?\s*>/i, isAdminPage ? '' : `<link rel="canonical" href="${escapeHtml(`${siteOrigin}/`)}" />`);
        source = source.replace(/<meta name="robots" content="[^"]*"\s*\/?\s*>/i, `<meta name="robots" content="${isAdminPage ? 'noindex, nofollow, noarchive' : 'index, follow'}" />`);
        if (isAdminPage) source = source.replace(/<title>[^<]*<\/title>/i, '<title>Administrator | SD Infinova</title>');
        res.type('html').send(await transformIndexHtml(req.originalUrl, source));
      } catch (error) {
        next(error);
      }
      return;
    }
    try {
      let source = fs.readFileSync(indexPath, 'utf8');
      source = source.replace(/<link rel="canonical" href="[^"]*"\s*\/?\s*>/i, isAdminPage ? '' : `<link rel="canonical" href="${escapeHtml(`${siteOrigin}/`)}" />`);
      source = source.replace(/<meta name="robots" content="[^"]*"\s*\/?\s*>/i, `<meta name="robots" content="${isAdminPage ? 'noindex, nofollow, noarchive' : 'index, follow'}" />`);
      if (isAdminPage) source = source.replace(/<title>[^<]*<\/title>/i, '<title>Administrator | SD Infinova</title>');
      res.type('html').send(source);
    } catch (error) {
      next(error);
    }
  };
  const sendPublishedDetail = async (kind: 'work' | 'blog' | 'services', req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = req.params.slug;
      const table = kind === 'work' ? 'projects' : kind === 'blog' ? 'blog_posts' : 'services';
      const result = await pg.query(
        `SELECT * FROM ${table} WHERE slug = $1 AND is_published = true LIMIT 1`, [slug]
      );
      if (!result.rows.length) {
        res.status(404).type('html').send('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="robots" content="noindex"><title>Page not found | SD Infinova</title><h1>Page not found</h1><a href="/">Return to SD Infinova</a></html>');
        return;
      }
      const row = result.rows[0] as Record<string, unknown>;
      let title = String(row.title || 'SD Infinova');
      let description = String(row.short_description || row.seo_description || row.excerpt || row.tagline || row.description || '');
      let body = '';
      const canonical = `${siteOrigin}/${kind === 'work' ? 'work' : kind}/${encodeURIComponent(slug)}`;
      if (kind === 'work') {
        const image = String(row.cover_image || '');
        body = `<p class="eyebrow">${escapeHtml(row.category)}</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p>${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}">` : ''}<h2>Project case study</h2><p>${escapeHtml(row.full_case_study)}</p><p>Technologies: ${escapeHtml(Array.isArray(row.tech_stack) ? row.tech_stack.join(', ') : row.tech_stack)}</p>`;
        res.type('html').send(contentPage(title, description, canonical, body, image));
        return;
      }
      if (kind === 'blog') {
        title = String(row.seo_title || row.title || title);
        description = String(row.seo_description || row.excerpt || description);
        body = `<p class="eyebrow">${escapeHtml(row.category)} · ${escapeHtml(row.author)}</p><h1>${escapeHtml(row.title)}</h1><p>${escapeHtml(row.excerpt)}</p><article>${escapeHtml(row.content)}</article>`;
        res.type('html').send(contentPage(title, description, canonical, body, String(row.cover_image || '')));
        return;
      }
      const deliverables = Array.isArray(row.deliverables) ? row.deliverables : [];
      body = `<p class="eyebrow">SD Infinova service</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(row.tagline)}</p><p>${escapeHtml(row.description)}</p><h2>Deliverables</h2><ul>${deliverables.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul><p><a href="/#contact">Discuss this service</a></p>`;
      res.type('html').send(contentPage(title, description, canonical, body));
    } catch (error) {
      next(error);
    }
  };
  app.get('/work/:slug', (req, res, next) => { void sendPublishedDetail('work', req, res, next); });
  app.get('/blog/:slug', (req, res, next) => { void sendPublishedDetail('blog', req, res, next); });
  app.get('/services/:slug', (req, res, next) => { void sendPublishedDetail('services', req, res, next); });
  app.get('/admin', (_req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.setHeader('Cache-Control', 'no-store');
    void sendApp(_req, res, next);
  });
  app.get('/admin/*', (_req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.setHeader('Cache-Control', 'no-store');
    void sendApp(_req, res, next);
  });
  app.get('/', (req, res, next) => { void sendApp(req, res, next); });
  app.use((_req, res) => res.status(404).type('html').send('<!doctype html><html lang="en"><meta charset="utf-8"><title>Page not found | SD Infinova</title><h1>Page not found</h1><p>The page may have moved or no longer exists.</p><a href="/">Return to SD Infinova</a></html>'));

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const error = err as { code?: string; name?: string; message?: string };
    if (error.code === 'EBADCSRFTOKEN') {
      res.status(403).json({ error: 'CSRF validation failed. Refresh the page and try again.' });
      return;
    }
    if (error.name === 'MulterError' || error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'Upload rejected. Check the allowed image type and 5 MB size limit.' });
      return;
    }
    if (error.message === 'Unsupported image type. Upload a JPEG, PNG, WebP, or GIF image.') {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error.' });
  });

  return app;
}

async function startServer() {
  const app = await createApp();
  const port = Number.parseInt(process.env.PORT || '3000', 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port.');
  app.listen(port, '0.0.0.0', () => {
    console.log(`[SD Infinova] Server listening on port ${port}.`);
  });
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  startServer().catch(() => {
    console.error('[SD Infinova] Startup failed. Check required configuration and persistent storage.');
    process.exit(1);
  });
}
