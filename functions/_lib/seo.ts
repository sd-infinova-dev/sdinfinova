export const escapeHtml = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character] as string);

export function renderContentPage(title: string, description: string, canonical: string, body: string, image?: string): string {
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

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${safeTitle} | SD Infinova</title>
  <meta name="description" content="${safeDescription}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="${safeCanonical}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${safeTitle} | SD Infinova">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:url" content="${safeCanonical}">
  ${imageTag}
  <script type="application/ld+json">${jsonLd}</script>
  <style>
    body { margin:0; background:#090a0c; color:#f1f2f4; font:16px/1.7 system-ui,sans-serif; }
    main { max-width:880px; margin:auto; padding:36px 24px 80px; }
    a { color:#e8a879; text-decoration:none; }
    a:hover { text-decoration:underline; }
    h1 { font-size:clamp(2rem,6vw,3.5rem); line-height:1.1; margin:16px 0; color:#fff; }
    h2 { margin-top:2rem; color:#f3f4f6; }
    img { max-width:100%; height:auto; border-radius:16px; margin:20px 0; }
    article { color:#d1d5db; white-space:pre-line; }
    .eyebrow { color:#d89f66; text-transform:uppercase; letter-spacing:.12em; font-size:.8rem; font-weight:600; }
    li { margin:.4rem 0; }
    .back-nav { display:inline-flex; align-items:center; gap:6px; margin-bottom:24px; font-weight:500; font-size:14px; }
  </style>
</head>
<body>
  <main>
    <a href="/" class="back-nav">← Return to SD Infinova</a>
    <article>
      ${body}
    </article>
  </main>
</body>
</html>`;
}
