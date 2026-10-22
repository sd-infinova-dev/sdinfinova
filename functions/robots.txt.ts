import type { CloudflareEnv } from './_lib/types';

interface EventContext {
  request: Request;
  env: CloudflareEnv;
}

export async function onRequestGet(context: EventContext): Promise<Response> {
  const { request, env } = context;
  const siteOrigin = (env.PUBLIC_ORIGIN || new URL(request.url).origin).replace(/\/$/, '');

  const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

User-agent: OAI-SearchBot
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${siteOrigin}/sitemap.xml
`;

  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}
