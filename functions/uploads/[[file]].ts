import type { CloudflareEnv } from '../_lib/types';

interface EventContext {
  request: Request;
  env: CloudflareEnv;
  params: { file?: string | string[] };
}

export async function onRequestGet(context: EventContext): Promise<Response> {
  const { env, params } = context;
  const rawFile = params.file;
  const filename = Array.isArray(rawFile) ? rawFile.join('/') : rawFile;

  if (!filename || typeof filename !== 'string') {
    return new Response('Not Found', { status: 404 });
  }

  // Prevent path traversal
  const cleanFilename = filename.split('/').pop() || '';
  if (!cleanFilename || cleanFilename.includes('..')) {
    return new Response('Invalid media path', { status: 400 });
  }

  if (!env.MEDIA_BUCKET) {
    return new Response('Storage unavailable', { status: 503 });
  }

  try {
    const object = await env.MEDIA_BUCKET.get(cleanFilename);
    if (!object) {
      return new Response('Media asset not found', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata?.(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Content-Security-Policy', "default-src 'none'; sandbox");
    headers.set('Cross-Origin-Resource-Policy', 'same-origin');

    return new Response(object.body, { headers });
  } catch (err) {
    return new Response('Failed to retrieve media asset', { status: 500 });
  }
}
