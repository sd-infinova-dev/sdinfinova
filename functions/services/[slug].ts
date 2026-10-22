import type { CloudflareEnv } from '../_lib/types';
import { renderContentPage, escapeHtml } from '../_lib/seo';

interface EventContext {
  request: Request;
  env: CloudflareEnv;
  params: { slug: string };
}

export async function onRequestGet(context: EventContext): Promise<Response> {
  const { request, env, params } = context;
  const slug = params.slug;
  const siteOrigin = (env.PUBLIC_ORIGIN || new URL(request.url).origin).replace(/\/$/, '');

  try {
    const row = await env.DB.prepare(
      'SELECT * FROM services WHERE slug = ?1 AND is_published = 1'
    ).bind(slug).first() as any;

    if (!row) {
      return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="robots" content="noindex"><title>Service not found | SD Infinova</title><h1>Service not found</h1><a href="/">Return to SD Infinova</a></html>', {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        status: 404
      });
    }

    const title = `${String(row.title || 'Service')} | SD Infinova`;
    const description = String(row.tagline || row.description || '');
    const canonical = `${siteOrigin}/services/${encodeURIComponent(slug)}`;

    let deliverablesHtml = '';
    try {
      const parsed = JSON.parse(row.deliverables);
      if (Array.isArray(parsed) && parsed.length > 0) {
        deliverablesHtml = `<h3>Key Deliverables</h3><ul>${parsed.map((d: any) => `<li>${escapeHtml(String(d))}</li>`).join('')}</ul>`;
      }
    } catch {
      // Ignored
    }

    const body = `
      <p class="eyebrow">Enterprise Service</p>
      <h1>${escapeHtml(row.title)}</h1>
      <p class="lead">${escapeHtml(row.tagline || '')}</p>
      <div class="content">${escapeHtml(row.description || '')}</div>
      ${deliverablesHtml}
      <p style="margin-top: 2rem;"><a href="/#contact" class="btn">Inquire About This Service ↗</a></p>
    `;

    return new Response(renderContentPage(title, description, canonical, body), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (err) {
    return new Response('Error loading service', { status: 500 });
  }
}
