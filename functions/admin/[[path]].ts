declare const HTMLRewriter: any;

interface EventContext {
  request: Request;
  env: {
    ASSETS: {
      fetch: (req: Request | string) => Promise<Response>;
    };
    PUBLIC_ORIGIN?: string;
  };
}

export async function onRequest(context: EventContext): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);

  // Fetch the SPA index.html from static assets
  const assetUrl = new URL('/index.html', url.origin);
  const assetResponse = await env.ASSETS.fetch(new Request(assetUrl.toString(), {
    headers: request.headers,
    method: 'GET'
  }));

  if (!assetResponse.ok) {
    return assetResponse;
  }

  // Use Cloudflare's streaming HTMLRewriter to inject robots and title
  const rewriter = new HTMLRewriter()
    .on('head', {
      element(el: any) {
        el.append('<meta name="robots" content="noindex, nofollow, noarchive" />', { html: true });
      }
    })
    .on('title', {
      element(el: any) {
        el.setInnerContent('Administrator | SD Infinova');
      }
    });

  const modifiedResponse = rewriter.transform(assetResponse);

  // Clone headers and enforce strict admin caching & security
  const headers = new Headers(modifiedResponse.headers);
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  headers.set('Pragma', 'no-cache');
  headers.set('Content-Type', 'text/html; charset=utf-8');

  return new Response(modifiedResponse.body, {
    status: 200,
    statusText: 'OK',
    headers
  });
}
