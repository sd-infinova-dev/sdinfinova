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
      'SELECT * FROM projects WHERE slug = ?1 AND is_published = 1'
    ).bind(slug).first() as any;

    if (!row) {
      return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="robots" content="noindex"><title>Project not found | SD Infinova</title><h1>Project not found</h1><a href="/">Return to SD Infinova</a></html>', {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        status: 404
      });
    }

    const title = String(row.title || 'SD Infinova Project');
    const description = String(row.short_description || row.full_case_study || '');
    const canonical = `${siteOrigin}/work/${encodeURIComponent(slug)}`;
    const image = String(row.cover_image || '');

    let techStackStr = '';
    try {
      const parsedTech = JSON.parse(row.tech_stack);
      techStackStr = Array.isArray(parsedTech) ? parsedTech.join(', ') : String(parsedTech);
    } catch {
      techStackStr = String(row.tech_stack || '');
    }

    const body = `
      <p class="eyebrow">${escapeHtml(row.category || 'Case Study')}</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="lead">${escapeHtml(description)}</p>
      ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}">` : ''}
      <h2>Project Case Study</h2>
      <p>${escapeHtml(row.full_case_study)}</p>
      ${techStackStr ? `<p><strong>Technologies:</strong> ${escapeHtml(techStackStr)}</p>` : ''}
      ${row.live_url ? `<p><a href="${escapeHtml(row.live_url)}" target="_blank" rel="noopener noreferrer">Visit Live Project ↗</a></p>` : ''}
    `;

    return new Response(renderContentPage(title, description, canonical, body, image), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (err) {
    return new Response('Error loading project', { status: 500 });
  }
}
