import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import csurf from 'csurf';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { initDatabase, pg } from './src/server/db';
import { apiRouter, publicApiRouter } from './src/server/api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  // Trust first proxy hop (Cloud Run / load balancer) for accurate IP resolution
  app.set('trust proxy', 1);

  // Basic security and parsing middleware
  // Restrictive CORS: allow only whitelisted origins defined in env (comma-separated). Fallback to same origin.
  const whitelist = (process.env.CORS_WHITELIST || '').split(',').map(o => o.trim()).filter(Boolean);
  const corsOptions: cors.CorsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests without Origin (e.g., server-to-server, curl, Postman)
      if (!origin) return callback(null, true);
      // If whitelist is empty, allow all origins (development fallback)
      if (whitelist.length === 0) return callback(null, true);
      if (whitelist.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  };
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());
  // Rate limiter for authentication and inquiry endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per window
    message: { error: 'Too many attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: {
      xForwardedForHeader: false,
      forwardedHeader: false,
      trustProxy: false
    }
  });
  // Apply to login route (will be attached later)
  // Apply to inquiry submission route (will be attached later)


  // Security Headers
  // Helmet with framing enabled for AI Studio preview environment iframe
  app.use(helmet({
    contentSecurityPolicy: false,
    frameguard: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false
  }));
  // Mount public API routes BEFORE csurf() so they are not blocked by CSRF.
  // Only non-sensitive, public-facing POST endpoints live here.
  app.use('/api/v1', publicApiRouter);

  // CSRF protection for all subsequent cookie-based routes
  const csrfProtection = csurf({ cookie: true });
  app.use((req, res, next) => {
    // API endpoints authenticating with Bearer tokens or API routes bypass CSRF
    if (req.headers.authorization || req.path.startsWith('/api/v1/')) {
      return next();
    }
    return (csrfProtection as any)(req, res, next);
  });
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Initialize PostgreSQL database & seed tables
  await initDatabase();

  // Static serving for public uploads and assets
  app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
  app.use('/assets/aistudio', express.static(path.join(__dirname, 'public/assets/aistudio')));

  // ==========================================
  // DYNAMIC TECHNICAL SEO: robots.txt & sitemap.xml
  // ==========================================
  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain');
    res.send(
`User-agent: *
Allow: /
Allow: /work
Allow: /services
Allow: /about
Allow: /blog
Allow: /contact
Disallow: /admin
Disallow: /api/v1/admin

Sitemap: https://sdinfinova.com/sitemap.xml
`
    );
  });

  app.get('/sitemap.xml', async (_req, res) => {
    try {
      const projectsRes = await pg.query('SELECT slug, updated_at FROM projects WHERE is_published = true');
      const blogsRes = await pg.query('SELECT slug, updated_at FROM blog_posts WHERE is_published = true');
      const servicesRes = await pg.query('SELECT slug FROM services WHERE is_published = true');

      const baseUrl = 'https://sdinfinova.com';
      const today = new Date().toISOString().split('T')[0];

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/work</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/services</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/about</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/contact</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;

      for (const p of (projectsRes.rows as any[])) {
        xml += `
  <url>
    <loc>${baseUrl}/work/${p.slug}</loc>
    <lastmod>${today}</lastmod>
    <priority>0.7</priority>
  </url>`;
      }

      for (const b of (blogsRes.rows as any[])) {
        xml += `
  <url>
    <loc>${baseUrl}/blog/${b.slug}</loc>
    <lastmod>${today}</lastmod>
    <priority>0.7</priority>
  </url>`;
      }

      for (const s of (servicesRes.rows as any[])) {
        xml += `
  <url>
    <loc>${baseUrl}/services/${s.slug}</loc>
    <lastmod>${today}</lastmod>
    <priority>0.7</priority>
  </url>`;
      }

      xml += `
</urlset>`;

      res.type('application/xml');
      res.send(xml);
    } catch (e) {
      res.status(500).send('Error generating sitemap');
    }
  });

  // REST API Router
  app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1', apiRouter);

  // Vite development integration or static production serving
  const distPath = path.resolve(__dirname, 'dist');
  if (isProduction && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
    console.log('[Server] Serving production static bundle from /dist');
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
    // Fallback to index.html for SPA routes in dev mode
    app.use('*', async (req, res) => {
      try {
        const url = req.originalUrl;
        const html = await vite.transformIndexHtml(url, fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8'));
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        console.error(e);
        res.status(500).end(e?.message || 'Server error');
      }
    });
    console.log('[Server] Vite middleware mounted in development mode.');
  }

  // Global error handling middleware
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err.code === 'EBADCSRFTOKEN') {
      res.status(403).json({ error: 'Session expired or invalid CSRF token' });
      return;
    }
    console.error('[Server Error]', err);
    res.status(500).json({ error: err?.message || 'Internal server error' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [SD Infinova] Server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
