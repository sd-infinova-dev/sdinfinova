import type { CloudflareEnv } from './_lib/types';

interface EventContext {
  request: Request;
  env: CloudflareEnv;
}

const escapeXml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char] as string);

export async function onRequestGet(context: EventContext): Promise<Response> {
  const { request, env } = context;
  const siteOrigin = (env.PUBLIC_ORIGIN || new URL(request.url).origin).replace(/\/$/, '');

  try {
    const [projectsRes, postsRes, servicesRes] = await Promise.all([
      env.DB.prepare('SELECT slug, updated_at FROM projects WHERE is_published = 1').all(),
      env.DB.prepare('SELECT slug, updated_at FROM blog_posts WHERE is_published = 1').all(),
      env.DB.prepare('SELECT slug, created_at as updated_at FROM services WHERE is_published = 1').all()
    ]);

    const urls = [
      { loc: `${siteOrigin}/`, lastmod: new Date().toISOString().slice(0, 10) },
      ...projectsRes.results.map((r: any) => ({ loc: `${siteOrigin}/work/${encodeURIComponent(r.slug)}`, lastmod: r.updated_at })),
      ...postsRes.results.map((r: any) => ({ loc: `${siteOrigin}/blog/${encodeURIComponent(r.slug)}`, lastmod: r.updated_at })),
      ...servicesRes.results.map((r: any) => ({ loc: `${siteOrigin}/services/${encodeURIComponent(r.slug)}`, lastmod: r.updated_at }))
    ];

    const entries = urls.map(({ loc, lastmod }) => {
      let dateStr = '';
      if (lastmod) {
        try { dateStr = `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>`; } catch {}
      }
      return `<url><loc>${escapeXml(loc)}</loc>${dateStr}</url>`;
    }).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`;

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (err) {
    return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      status: 500
    });
  }
}
