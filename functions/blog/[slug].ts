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
      'SELECT * FROM blog_posts WHERE slug = ?1 AND is_published = 1'
    ).bind(slug).first() as any;

    if (!row) {
      return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="robots" content="noindex"><title>Article not found | SD Infinova</title><h1>Article not found</h1><a href="/">Return to SD Infinova</a></html>', {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        status: 404
      });
    }

    const title = String(row.seo_title || row.title || 'SD Infinova Article');
    const description = String(row.seo_description || row.excerpt || '');
    const canonical = `${siteOrigin}/blog/${encodeURIComponent(slug)}`;
    const image = String(row.cover_image || '');

    const body = `
      <p class="eyebrow">${escapeHtml(row.category || 'Article')} · ${escapeHtml(row.author || 'SD Infinova Team')}</p>
      <h1>${escapeHtml(row.title || title)}</h1>
      <p class="lead">${escapeHtml(row.excerpt || '')}</p>
      ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}">` : ''}
      <div class="content">${escapeHtml(row.content || '')}</div>
    `;

    return new Response(renderContentPage(title, description, canonical, body, image), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (err) {
    return new Response('Error loading article', { status: 500 });
  }
}
