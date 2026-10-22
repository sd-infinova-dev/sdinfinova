import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { spawnSync } from 'node:child_process';

process.env.NODE_ENV = 'test';
process.env.PGLITE_IN_MEMORY = 'true';
process.env.INITIAL_ADMIN_EMAIL = 'owner@example.test';
process.env.INITIAL_ADMIN_PASSWORD = 'test-only-password-value-over-sixteen';

const [{ createApp }, { pg }] = await Promise.all([
  import('../server.ts'),
  import('../src/server/db.ts')
]);

test('security and core API regression checks run against isolated in-memory PGlite', async (t) => {
  const app = await createApp();
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  let csrfCookie = '';
  let csrfToken = '';
  let adminCookie = '';

  function rememberCookies(response: Response) {
    for (const value of response.headers.getSetCookie()) {
      const pair = value.split(';', 1)[0];
      if (pair.startsWith('_csrf=')) csrfCookie = pair;
      if (pair.startsWith('admin_token=')) adminCookie = pair;
    }
  }

  async function getCsrfToken() {
    const response = await fetch(`${base}/api/v1/auth/csrf-token`);
    rememberCookies(response);
    assert.equal(response.status, 200);
    csrfToken = (await response.json() as { csrfToken: string }).csrfToken;
    return csrfToken;
  }

  function cookieHeader(session = adminCookie) {
    return [csrfCookie, session].filter(Boolean).join('; ');
  }

  async function adminRequest(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    headers.set('Cookie', cookieHeader());
    headers.set('X-CSRF-Token', csrfToken);
    headers.set('Origin', 'http://localhost');
    return fetch(`${base}${path}`, { ...init, headers });
  }

  try {
    await t.test('health and routing return accurate status codes', async () => {
      const health = await fetch(`${base}/api/v1/health`);
      assert.equal(health.status, 200);
      assert.equal((await health.json() as { database: string }).database, 'reachable');

      const missingApi = await fetch(`${base}/api/v1/not-a-route`);
      assert.equal(missingApi.status, 404);
      assert.match(missingApi.headers.get('content-type') || '', /application\/json/);

      const missingPage = await fetch(`${base}/this-page-does-not-exist`);
      assert.equal(missingPage.status, 404);

      const adminPage = await fetch(`${base}/admin`);
      assert.equal(adminPage.status, 200);
      assert.match(adminPage.headers.get('x-robots-tag') || '', /noindex/);
      const adminHtml = await adminPage.text();
      assert.match(adminHtml, /<meta name="robots" content="noindex, nofollow, noarchive"/);
      assert.doesNotMatch(adminHtml, /rel="canonical"/);

      const homePage = await fetch(`${base}/`);
      assert.match(await homePage.text(), /rel="canonical" href="https:\/\/sdinfinova\.com\/"/);

      const sitemap = await fetch(`${base}/sitemap.xml`);
      assert.equal(sitemap.status, 200);
      assert.match(await sitemap.text(), /<loc>https:\/\/sdinfinova\.com\//);

      await pg.query("UPDATE site_settings SET value = value || '{\"private_marker\":\"must-not-be-public\"}'::jsonb WHERE key = 'general'");
      const settings = await fetch(`${base}/api/v1/settings`);
      const settingsBody = await settings.json() as Record<string, unknown>;
      assert.equal('private_marker' in settingsBody, false);

      const blockedOrigin = await fetch(`${base}/api/v1/inquiries`, {
        method: 'POST', headers: { Origin: 'https://attacker.example', 'Content-Type': 'application/json' }, body: '{}'
      });
      assert.equal(blockedOrigin.status, 403);
    });

    await t.test('cookie sessions require CSRF, reject bad credentials, and do not expose tokens', async () => {
      const anonymous = await fetch(`${base}/api/v1/admin/inquiries`);
      assert.equal(anonymous.status, 401);

      const token = await getCsrfToken();
      const missingCsrf = await fetch(`${base}/api/v1/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookieHeader() },
        body: JSON.stringify({ email: 'owner@example.test', password: 'incorrect-password' })
      });
      assert.equal(missingCsrf.status, 403);

      const rejected = await fetch(`${base}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieHeader(), 'X-CSRF-Token': token, Origin: 'http://localhost' },
        body: JSON.stringify({ email: 'owner@example.test', password: 'incorrect-password' })
      });
      assert.equal(rejected.status, 401);

      const accepted = await fetch(`${base}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieHeader(), 'X-CSRF-Token': token, Origin: 'http://localhost' },
        body: JSON.stringify({ email: 'owner@example.test', password: process.env.INITIAL_ADMIN_PASSWORD })
      });
      rememberCookies(accepted);
      assert.equal(accepted.status, 200);
      const payload = await accepted.json() as Record<string, unknown>;
      assert.equal('token' in payload, false);
      assert.equal(accepted.headers.get('set-cookie')?.toLowerCase().includes('httponly'), true);

    });

    await t.test('authenticated non-admin users receive 403', async () => {
      const password = 'editor-test-password-value-long-enough';
      const hash = await bcrypt.hash(password, 4);
      await pg.query(
        `INSERT INTO admin_users (id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)`,
        ['test_editor', 'editor@example.test', hash, 'Test Editor', 'editor']
      );
      const login = await fetch(`${base}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieHeader(), 'X-CSRF-Token': csrfToken, Origin: 'http://localhost' },
        body: JSON.stringify({ email: 'editor@example.test', password })
      });
      rememberCookies(login);
      assert.equal(login.status, 200);
      const editorCookie = adminCookie;
      const denied = await fetch(`${base}/api/v1/admin/inquiries`, { headers: { Cookie: cookieHeader(editorCookie) } });
      assert.equal(denied.status, 403);

      const adminLogin = await fetch(`${base}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieHeader(editorCookie), 'X-CSRF-Token': csrfToken, Origin: 'http://localhost' },
        body: JSON.stringify({ email: 'owner@example.test', password: process.env.INITIAL_ADMIN_PASSWORD })
      });
      rememberCookies(adminLogin);
      assert.equal(adminLogin.status, 200);

      const rateLimited = await fetch(`${base}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieHeader(), 'X-CSRF-Token': csrfToken, Origin: 'http://localhost' },
        body: JSON.stringify({ email: 'owner@example.test', password: process.env.INITIAL_ADMIN_PASSWORD })
      });
      assert.equal(rateLimited.status, 429);
    });

    await t.test('project CRUD respects validation and keeps drafts private', async () => {
      const invalid = await adminRequest('/api/v1/admin/projects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: '' })
      });
      assert.equal(invalid.status, 400);

      const created = await adminRequest('/api/v1/admin/projects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: 'security-regression-draft', title: 'Security Regression Draft', is_published: false })
      });
      assert.equal(created.status, 201);
      const { id } = await created.json() as { id: string };
      assert.equal((await fetch(`${base}/api/v1/projects/security-regression-draft`)).status, 404);
      assert.equal((await fetch(`${base}/work/security-regression-draft`)).status, 404);

      const published = await adminRequest(`/api/v1/admin/projects/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_published: true })
      });
      assert.equal(published.status, 200);
      assert.equal((await fetch(`${base}/api/v1/projects/security-regression-draft`)).status, 200);
      const publicDetail = await fetch(`${base}/work/security-regression-draft`);
      assert.equal(publicDetail.status, 200);
      assert.match(await publicDetail.text(), /rel="canonical" href="https:\/\/sdinfinova\.com\/work\/security-regression-draft"/);

      const deleted = await adminRequest(`/api/v1/admin/projects/${id}`, { method: 'DELETE' });
      assert.equal(deleted.status, 200);
      assert.equal((await fetch(`${base}/api/v1/projects/security-regression-draft`)).status, 404);
    });

    await t.test('blog CRUD respects publication status', async () => {
      const created = await adminRequest('/api/v1/admin/blog', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: 'security-regression-article', title: 'Security Regression Article', excerpt: 'test excerpt', content: 'test content', is_published: false })
      });
      assert.equal(created.status, 201);
      const { id } = await created.json() as { id: string };
      assert.equal((await fetch(`${base}/api/v1/blog/security-regression-article`)).status, 404);
      assert.equal((await fetch(`${base}/blog/security-regression-article`)).status, 404);

      const published = await adminRequest(`/api/v1/admin/blog/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_published: true })
      });
      assert.equal(published.status, 200);
      assert.equal((await fetch(`${base}/api/v1/blog/security-regression-article`)).status, 200);
      const publicArticle = await fetch(`${base}/blog/security-regression-article`);
      assert.equal(publicArticle.status, 200);
      assert.match(await publicArticle.text(), /<title>Security Regression Article \| SD Infinova<\/title>/);

      const deleted = await adminRequest(`/api/v1/admin/blog/${id}`, { method: 'DELETE' });
      assert.equal(deleted.status, 200);
      assert.equal((await fetch(`${base}/api/v1/blog/security-regression-article`)).status, 404);
    });

    await t.test('inquiries validate, persist, and are rate limited', async () => {
      const originHeaders = { 'Content-Type': 'application/json', Origin: 'http://localhost' };
      const validInquiry = {
        name: 'Test Contact', business_name: '', email: 'TEST@example.test', phone: '', location: 'Nepal',
        project_type: 'Test Website', budget_range: 'Custom', expected_timeline: 'Flexible',
        description: 'This is an isolated automated regression inquiry.', preferred_contact: 'email'
      };
      const accepted = await fetch(`${base}/api/v1/inquiries`, {
        method: 'POST', headers: originHeaders, body: JSON.stringify(validInquiry)
      });
      assert.equal(accepted.status, 201);
      const acceptedBody = await accepted.json() as { inquiry_id: string };
      const record = await pg.query('SELECT email FROM contact_inquiries WHERE id = $1', [acceptedBody.inquiry_id]);
      assert.equal((record.rows[0] as { email: string }).email, 'test@example.test');

      const notes = 'private regression note';
      const updated = await adminRequest(`/api/v1/admin/inquiries/${acceptedBody.inquiry_id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'qualified', internal_notes: notes })
      });
      assert.equal(updated.status, 200);
      const activity = await pg.query("SELECT details FROM admin_activity_logs WHERE action = 'UPDATE_INQUIRY' ORDER BY created_at DESC LIMIT 1");
      const activityDetails = (activity.rows[0] as { details?: unknown } | undefined)?.details;
      assert.equal(JSON.stringify(activityDetails).includes(notes), false);

      const invalid = await fetch(`${base}/api/v1/inquiries`, {
        method: 'POST', headers: originHeaders, body: JSON.stringify({ email: 'not-an-email' })
      });
      assert.equal(invalid.status, 400);

      for (let index = 0; index < 3; index += 1) {
        const response = await fetch(`${base}/api/v1/inquiries`, {
          method: 'POST', headers: originHeaders, body: JSON.stringify({ email: 'bad' })
        });
        assert.equal(response.status, 400);
      }
      const limited = await fetch(`${base}/api/v1/inquiries`, {
        method: 'POST', headers: originHeaders, body: JSON.stringify({ email: 'bad' })
      });
      assert.equal(limited.status, 429);
    });

    await t.test('unsafe image uploads are rejected and logout revokes the session', async () => {
      const data = new FormData();
      data.append('file', new Blob(['not an image'], { type: 'text/plain' }), 'payload.svg');
      const upload = await adminRequest('/api/v1/admin/media/upload', { method: 'POST', body: data });
      assert.equal(upload.status, 400);

      const logout = await adminRequest('/api/v1/auth/logout', { method: 'POST' });
      assert.equal(logout.status, 200);
      const staleSession = await fetch(`${base}/api/v1/auth/me`, { headers: { Cookie: cookieHeader() } });
      assert.equal(staleSession.status, 401);
    });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await pg.close();
  }
});

test('production mode refuses in-memory database fallback', () => {
  const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', "const { initDatabase } = await import('./src/server/db.ts'); await initDatabase();"], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'production', PGLITE_IN_MEMORY: 'true', PGLITE_DATA_DIR: '' }
  });
  assert.notEqual(child.status, 0);
  assert.match(`${child.stdout}${child.stderr}`, /PGLITE_DATA_DIR must be an absolute path to an existing persistent volume directory/);
});
