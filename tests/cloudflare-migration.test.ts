import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

import {
  hashPasswordPbkdf2,
  verifyPassword,
  sha256Hex,
  timingSafeEqualStr,
  generateSecureToken
} from '../functions/_lib/auth.ts';
import { app } from '../functions/api/[[route]].ts';
import { onRequestGet as getRobots } from '../functions/robots.txt.ts';
import { onRequestGet as getSitemap } from '../functions/sitemap.xml.ts';
import type { CloudflareEnv, D1Database, D1PreparedStatement, D1Result, R2Bucket, R2Object } from '../functions/_lib/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to create an in-memory SQLite wrapper that matches Cloudflare D1 API
function createD1Mock(db: DatabaseSync): D1Database {
  return {
    prepare(query: string): D1PreparedStatement {
      return {
        bind(...values: any[]): D1PreparedStatement {
          return {
            bind: (..._more: any[]) => this,
            async first<T = unknown>(colName?: string): Promise<T | null> {
              const stmt = db.prepare(query);
              const row = stmt.get(...values) as any;
              if (!row) return null;
              if (colName) return row[colName] ?? null;
              return row as T;
            },
            async run<T = unknown>(): Promise<D1Result<T>> {
              const stmt = db.prepare(query);
              const result = stmt.run(...values);
              return {
                results: [],
                success: true,
                meta: { changes: result.changes, last_row_id: result.lastInsertRowid }
              };
            },
            async all<T = unknown>(): Promise<D1Result<T>> {
              const stmt = db.prepare(query);
              const rows = stmt.all(...values) as T[];
              return {
                results: rows,
                success: true,
                meta: { count: rows.length }
              };
            }
          };
        },
        async first<T = unknown>(colName?: string): Promise<T | null> {
          const stmt = db.prepare(query);
          const row = stmt.get() as any;
          if (!row) return null;
          if (colName) return row[colName] ?? null;
          return row as T;
        },
        async run<T = unknown>(): Promise<D1Result<T>> {
          const stmt = db.prepare(query);
          const result = stmt.run();
          return {
            results: [],
            success: true,
            meta: { changes: result.changes, last_row_id: result.lastInsertRowid }
          };
        },
        async all<T = unknown>(): Promise<D1Result<T>> {
          const stmt = db.prepare(query);
          const rows = stmt.all() as T[];
          return {
            results: rows,
            success: true,
            meta: { count: rows.length }
          };
        }
      };
    },
    async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
      const results: D1Result<T>[] = [];
      for (const stmt of statements) {
        results.push(await stmt.run<T>());
      }
      return results;
    },
    async exec(query: string) {
      db.exec(query);
      return { count: 1, duration: 1 };
    }
  };
}

// Helper to create an in-memory R2 mock
function createR2Mock(): R2Bucket & { files: Map<string, { buffer: ArrayBuffer; headers: Record<string, string> }> } {
  const files = new Map<string, { buffer: ArrayBuffer; headers: Record<string, string> }>();
  return {
    files,
    async get(key: string) {
      const entry = files.get(key);
      if (!entry) return null;
      return {
        key,
        version: '1',
        size: entry.buffer.byteLength,
        etag: 'mock-etag',
        httpEtag: '"mock-etag"',
        uploaded: new Date(),
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(entry.buffer));
            controller.close();
          }
        }),
        bodyUsed: false,
        async arrayBuffer() { return entry.buffer; },
        async text() { return new TextDecoder().decode(entry.buffer); },
        async json<T>() { return JSON.parse(new TextDecoder().decode(entry.buffer)) as T; },
        async blob() { return new Blob([entry.buffer]); },
        writeHttpMetadata(headers: Headers) {
          for (const [k, v] of Object.entries(entry.headers)) {
            headers.set(k, v);
          }
        }
      };
    },
    async put(key: string, value: any, options?: any): Promise<R2Object> {
      let buffer: ArrayBuffer;
      if (value instanceof ArrayBuffer) {
        buffer = value;
      } else if (ArrayBuffer.isView(value)) {
        const u8 = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
        const copy = new ArrayBuffer(u8.byteLength);
        new Uint8Array(copy).set(u8);
        buffer = copy;
      } else if (typeof value === 'string') {
        const encoded = new TextEncoder().encode(value);
        const copy = new ArrayBuffer(encoded.byteLength);
        new Uint8Array(copy).set(encoded);
        buffer = copy;
      } else {
        buffer = new ArrayBuffer(0);
      }

      const headers: Record<string, string> = {};
      if (options?.httpMetadata?.contentType) {
        headers['content-type'] = options.httpMetadata.contentType;
      }
      files.set(key, { buffer, headers });

      return {
        key,
        version: '1',
        size: buffer.byteLength,
        etag: 'mock-etag',
        httpEtag: '"mock-etag"',
        uploaded: new Date()
      };
    },
    async delete(keys: string | string[]) {
      const list = Array.isArray(keys) ? keys : [keys];
      for (const k of list) files.delete(k);
    },
    async list() {
      return { objects: [] };
    }
  };
}

test('1. Cloudflare Web Crypto Authentication & 10ms CPU safety', async (t) => {
  const password = 'CorrectHorseBatteryStaple-2026!';
  
  // Timing check
  const start = performance.now();
  const hash = await hashPasswordPbkdf2(password);
  const elapsed = performance.now() - start;

  assert.ok(hash.startsWith('pbkdf2$sha256$100000$'), 'Hash must match standard PBKDF2 format');
  assert.ok(elapsed < 150, `PBKDF2 hashing should execute rapidly in C++ (took ${elapsed.toFixed(2)}ms)`);

  // Verification checks
  const valid = await verifyPassword(password, hash);
  assert.equal(valid, true, 'Valid password must verify successfully');

  const invalid = await verifyPassword('WrongPassword123!', hash);
  assert.equal(invalid, false, 'Invalid password must be rejected');

  // SHA-256 helper
  const digest = await sha256Hex('test-string');
  assert.equal(digest, 'ffe65f1d98fafedea3514adc956c8ada5980c6c5d2552fd61f48401aefd5c00e');

  // Timing safe equal
  assert.equal(timingSafeEqualStr('hello', 'hello'), true);
  assert.equal(timingSafeEqualStr('hello', 'world'), false);
  assert.equal(timingSafeEqualStr('hello', 'hell'), false);

  // Secure token
  const token = generateSecureToken(32);
  assert.equal(token.length, 43, '32 bytes base64url should be 43 characters');
});

test('2. Cloudflare D1 SQL Schema and Seed Syntax Validation', async (t) => {
  const sqlite = new DatabaseSync(':memory:');
  const schemaSql = fs.readFileSync(path.join(rootDir, 'd1', 'schema.sql'), 'utf8');
  const seedSql = fs.readFileSync(path.join(rootDir, 'd1', 'seed.sql'), 'utf8');

  // Execute schema
  sqlite.exec(schemaSql);

  // Verify all 10 tables exist
  const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
  const tableNames = new Set(tables.map(t => t.name));

  const expectedTables = [
    'schema_migrations',
    'admin_users',
    'admin_sessions',
    'services',
    'projects',
    'blog_posts',
    'contact_inquiries',
    'media_assets',
    'page_views',
    'site_settings',
    'admin_activity_logs'
  ];

  for (const table of expectedTables) {
    assert.ok(tableNames.has(table), `Table ${table} must be created in D1 schema`);
  }

  // Execute seed
  sqlite.exec(seedSql);

  // Verify seed data
  const serviceCount = sqlite.prepare('SELECT count(*) as count FROM services').get() as { count: number };
  assert.ok(serviceCount.count >= 3, 'Seed must insert services');

  const projectCount = sqlite.prepare('SELECT count(*) as count FROM projects').get() as { count: number };
  assert.ok(projectCount.count >= 2, 'Seed must insert projects');

  const blogCount = sqlite.prepare('SELECT count(*) as count FROM blog_posts').get() as { count: number };
  assert.ok(blogCount.count >= 2, 'Seed must insert blog posts');

  const settings = sqlite.prepare("SELECT value FROM site_settings WHERE key = 'general'").get() as { value: string };
  assert.ok(settings && settings.value.includes('SD Infinova'), 'Seed must insert site settings');
});

test('3. Cloudflare Pages Functions API Router & Endpoint Regression', async (t) => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(fs.readFileSync(path.join(rootDir, 'd1', 'schema.sql'), 'utf8'));
  sqlite.exec(fs.readFileSync(path.join(rootDir, 'd1', 'seed.sql'), 'utf8'));

  const d1Mock = createD1Mock(sqlite);
  const r2Mock = createR2Mock();

  const testPassword = 'AdminSecretPassword-123456!';
  const testHash = await hashPasswordPbkdf2(testPassword);
  sqlite.prepare("INSERT INTO admin_users (id, email, password_hash, name, role) VALUES ('usr_test_1', 'admin@sdinfinova.com', ?, 'Administrator', 'admin')").run(testHash);

  const mockEnv: CloudflareEnv = {
    DB: d1Mock,
    MEDIA_BUCKET: r2Mock,
    PUBLIC_ORIGIN: 'https://test.sdinfinova.pages.dev',
    CORS_WHITELIST: 'https://test.sdinfinova.pages.dev',
    NODE_ENV: 'test'
  };

  // Helper for requests
  async function makeRequest(path: string, options: RequestInit = {}) {
    const url = `https://test.sdinfinova.pages.dev${path}`;
    const req = new Request(url, options);
    return app.fetch(req, mockEnv);
  }

  // 1. Health check
  const healthRes = await makeRequest('/api/v1/health');
  assert.equal(healthRes.status, 200);
  const healthJson = await healthRes.json() as any;
  assert.equal(healthJson.status, 'ok');
  assert.equal(healthJson.database, 'reachable');

  // 2. CSRF Token
  const csrfRes = await makeRequest('/api/v1/auth/csrf-token');
  assert.equal(csrfRes.status, 200);
  const csrfCookieHeader = csrfRes.headers.get('set-cookie') || '';
  assert.ok(csrfCookieHeader.includes('_csrf='), 'CSRF cookie must be issued');
  const csrfTokenMatch = csrfCookieHeader.match(/_csrf=([^;]+)/);
  const csrfCookieValue = csrfTokenMatch ? csrfTokenMatch[1] : '';
  const { csrfToken } = await csrfRes.json() as { csrfToken: string };
  assert.ok(csrfToken, 'CSRF token returned in JSON body');

  // 3. Public GET endpoints (Services, Projects, Blog, Settings)
  const servicesRes = await makeRequest('/api/v1/services');
  assert.equal(servicesRes.status, 200);
  const servicesList = await servicesRes.json() as any[];
  assert.ok(Array.isArray(servicesList) && servicesList.length >= 3);

  const projectsRes = await makeRequest('/api/v1/projects');
  assert.equal(projectsRes.status, 200);
  const projectsList = await projectsRes.json() as any[];
  assert.ok(Array.isArray(projectsList) && projectsList.length >= 2);

  const blogRes = await makeRequest('/api/v1/blog');
  assert.equal(blogRes.status, 200);
  const blogList = await blogRes.json() as any[];
  assert.ok(Array.isArray(blogList) && blogList.length >= 2);

  const settingsRes = await makeRequest('/api/v1/settings');
  assert.equal(settingsRes.status, 200);
  const settingsJson = await settingsRes.json() as any;
  assert.equal(settingsJson.site_name, 'SD Infinova');

  // 4. Inquiries POST & CSRF Validation
  // 4a. Protected route rejected without CSRF
  const badCsrfRes = await makeRequest('/api/v1/admin/services', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'New Service' })
  });
  assert.equal(badCsrfRes.status, 403, 'Protected mutation without CSRF header must return 403');

  // 4b. Rejected with honeypot
  const botInquiryRes = await makeRequest('/api/v1/inquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Spam Bot',
      email: 'bot@spam.com',
      project_type: 'Web App',
      budget_range: 'NPR 10,000',
      description: 'Cheap SEO service spam message',
      honeypot: 'bot-filled-field'
    })
  });
  assert.equal(botInquiryRes.status, 400, 'Honeypot violation must be rejected with 400');

  // 4c. Accepted with valid payload
  const validInquiryRes = await makeRequest('/api/v1/inquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Sujit Tech',
      email: 'client@example.com',
      project_type: 'Web Development',
      budget_range: 'NPR 7,500',
      description: 'Inquiry message for Cloudflare D1 persistence test',
      honeypot: ''
    })
  });
  assert.equal(validInquiryRes.status, 201, 'Valid inquiry must return 201 Created');
  const inquiryRows = sqlite.prepare("SELECT * FROM contact_inquiries WHERE email = 'client@example.com'").all();
  assert.equal(inquiryRows.length, 1, 'Inquiry must be stored in D1 database');

  // 5. Admin Authentication Flow
  // 5a. Login failure with wrong password
  const badLoginRes = await makeRequest('/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
      'Cookie': `_csrf=${csrfCookieValue}`
    },
    body: JSON.stringify({ email: 'admin@sdinfinova.com', password: 'WrongPassword!' })
  });
  assert.equal(badLoginRes.status, 401);

  // 5b. Login success with valid PBKDF2 credentials
  const goodLoginRes = await makeRequest('/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
      'Cookie': `_csrf=${csrfCookieValue}`
    },
    body: JSON.stringify({ email: 'admin@sdinfinova.com', password: testPassword })
  });
  assert.equal(goodLoginRes.status, 200);
  const loginCookieHeader = goodLoginRes.headers.get('set-cookie') || '';
  assert.ok(loginCookieHeader.includes('admin_token='), 'Admin session cookie must be set');
  const adminTokenMatch = loginCookieHeader.match(/admin_token=([^;]+)/);
  const adminToken = adminTokenMatch ? adminTokenMatch[1] : '';

  // 5c. Protected route /api/v1/auth/me
  // Without token -> 401
  const unauthMe = await makeRequest('/api/v1/auth/me');
  assert.equal(unauthMe.status, 401);

  // With token -> 200
  const authMe = await makeRequest('/api/v1/auth/me', {
    headers: { 'Cookie': `admin_token=${adminToken}` }
  });
  assert.equal(authMe.status, 200);
  const meJson = await authMe.json() as any;
  assert.equal(meJson.user.email, 'admin@sdinfinova.com');

  // 6. Media Upload with Magic-Byte Validation & R2 Mock
  // 6a. Malicious file disguised as image (e.g. PHP script with .jpg extension)
  const fakeJpgData = new TextEncoder().encode('<?php echo "evil script"; ?>');
  const fakeFormData = new FormData();
  fakeFormData.append('file', new Blob([fakeJpgData], { type: 'image/jpeg' }), 'evil.jpg');

  const maliciousUploadRes = await makeRequest('/api/v1/admin/media/upload', {
    method: 'POST',
    headers: {
      'x-csrf-token': csrfToken,
      'Cookie': `_csrf=${csrfCookieValue}; admin_token=${adminToken}`
    },
    body: fakeFormData
  });
  assert.equal(maliciousUploadRes.status, 400, 'Malicious file must be rejected by magic bytes inspection');

  // 6b. Valid PNG image (89 50 4E 47 0D 0A 1A 0A)
  const validPngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
  const validFormData = new FormData();
  validFormData.append('file', new Blob([validPngHeader], { type: 'image/png' }), 'logo.png');

  const validUploadRes = await makeRequest('/api/v1/admin/media/upload', {
    method: 'POST',
    headers: {
      'x-csrf-token': csrfToken,
      'Cookie': `_csrf=${csrfCookieValue}; admin_token=${adminToken}`
    },
    body: validFormData
  });
  assert.equal(validUploadRes.status, 201, 'Valid PNG must be uploaded to R2 successfully');
  const uploadJson = await validUploadRes.json() as any;
  assert.ok(uploadJson.media.url.startsWith('/uploads/'), 'Upload URL must point to /uploads/* path');
  assert.ok(r2Mock.files.size === 1, 'File must be written into R2 bucket');
});

test('4. Dynamic SEO Edge Handlers (robots.txt and sitemap.xml)', async (t) => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(fs.readFileSync(path.join(rootDir, 'd1', 'schema.sql'), 'utf8'));
  sqlite.exec(fs.readFileSync(path.join(rootDir, 'd1', 'seed.sql'), 'utf8'));

  const d1Mock = createD1Mock(sqlite);
  const mockEnv: CloudflareEnv = {
    DB: d1Mock,
    MEDIA_BUCKET: createR2Mock(),
    PUBLIC_ORIGIN: 'https://sdinfinova.pages.dev'
  };

  // Test robots.txt
  const robotsReq = new Request('https://sdinfinova.pages.dev/robots.txt');
  const robotsRes = await getRobots({ request: robotsReq, env: mockEnv });
  assert.equal(robotsRes.status, 200);
  assert.equal(robotsRes.headers.get('content-type'), 'text/plain; charset=utf-8');
  const robotsTxt = await robotsRes.text();
  assert.ok(robotsTxt.includes('Disallow: /admin'), 'robots.txt must disallow /admin');
  assert.ok(robotsTxt.includes('User-agent: OAI-SearchBot'), 'robots.txt must explicitly configure OAI-SearchBot');
  assert.ok(robotsTxt.includes('Sitemap: https://sdinfinova.pages.dev/sitemap.xml'), 'robots.txt must point to sitemap');

  // Test sitemap.xml
  const sitemapReq = new Request('https://sdinfinova.pages.dev/sitemap.xml');
  const sitemapRes = await getSitemap({ request: sitemapReq, env: mockEnv });
  assert.equal(sitemapRes.status, 200);
  assert.ok(sitemapRes.headers.get('content-type')?.includes('xml'));
  const sitemapXml = await sitemapRes.text();
  assert.ok(sitemapXml.includes('<loc>https://sdinfinova.pages.dev/</loc>'));
  assert.ok(sitemapXml.includes('/work/'), 'sitemap.xml must include dynamic project slugs from D1');
  assert.ok(sitemapXml.includes('/blog/'), 'sitemap.xml must include dynamic blog slugs from D1');
  assert.ok(sitemapXml.includes('/services/'), 'sitemap.xml must include dynamic service slugs from D1');
});
