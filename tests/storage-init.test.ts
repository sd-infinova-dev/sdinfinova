import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

test('invalid production storage paths fail before creating database or upload directories', () => {
  const runId = crypto.randomBytes(12).toString('hex');
  const databasePath = path.join(os.tmpdir(), `sdinfinova-db-must-not-create-${runId}`);
  const uploadsPath = path.join(os.tmpdir(), `sdinfinova-uploads-must-not-create-${runId}`);
  assert.equal(fs.existsSync(databasePath), false);
  assert.equal(fs.existsSync(uploadsPath), false);

  const script = `
    const { createApp } = await import('./server.ts');
    try { await createApp(); process.exitCode = 2; }
    catch (error) {
      if (!String(error?.message).includes('must already exist')) process.exitCode = 3;
    }
  `;
  const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', script], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PGLITE_DATA_DIR: databasePath,
      UPLOADS_DIR: uploadsPath,
      PUBLIC_ORIGIN: 'https://example.test',
      CORS_WHITELIST: 'https://example.test',
      ALLOW_SCHEMA_MIGRATIONS: 'false'
    }
  });

  assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`);
  assert.equal(fs.existsSync(databasePath), false);
  assert.equal(fs.existsSync(uploadsPath), false);
});

test('importing database and API modules does not create configured storage paths', () => {
  const runId = crypto.randomBytes(12).toString('hex');
  const databasePath = path.join(os.tmpdir(), `sdinfinova-db-import-${runId}`);
  const uploadsPath = path.join(os.tmpdir(), `sdinfinova-uploads-import-${runId}`);
  const script = `await Promise.all([import('./src/server/db.ts'), import('./src/server/api.ts')]);`;
  const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', script], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'production', PGLITE_DATA_DIR: databasePath, UPLOADS_DIR: uploadsPath }
  });

  assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`);
  assert.equal(fs.existsSync(databasePath), false);
  assert.equal(fs.existsSync(uploadsPath), false);
});

test('production migration authorization is checked before PGlite opens or writes the database directory', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sdinfinova-startup-unauthorized-'));
  const databasePath = path.join(root, 'database');
  fs.mkdirSync(databasePath);
  assert.deepEqual(fs.readdirSync(databasePath), []);

  const script = `
    const { initDatabase } = await import('./src/server/db.ts');
    try { await initDatabase(); process.exitCode = 2; }
    catch (error) {
      if (!String(error?.message).includes('requires ALLOW_SCHEMA_MIGRATIONS=true')) process.exitCode = 3;
    }
  `;
  const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', script], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PGLITE_DATA_DIR: databasePath,
      ALLOW_SCHEMA_MIGRATIONS: 'false',
      INITIAL_ADMIN_EMAIL: '',
      INITIAL_ADMIN_PASSWORD: ''
    }
  });

  assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`);
  assert.deepEqual(fs.readdirSync(databasePath), []);
});

test('invalid production database path refuses before creating the path', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sdinfinova-startup-invalid-path-'));
  const databasePath = path.join(root, 'must-not-create');
  const script = `
    const { initDatabase } = await import('./src/server/db.ts');
    try { await initDatabase(); process.exitCode = 2; }
    catch (error) {
      if (!String(error?.message).includes('PGLITE_DATA_DIR must be an absolute path to an existing persistent volume')) process.exitCode = 3;
    }
  `;
  const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', script], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PGLITE_DATA_DIR: databasePath,
      ALLOW_SCHEMA_MIGRATIONS: 'true',
      INITIAL_ADMIN_EMAIL: 'owner@example.test',
      INITIAL_ADMIN_PASSWORD: 'isolated-test-password-over-sixteen'
    }
  });

  assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`);
  assert.equal(fs.existsSync(databasePath), false);
});

test('missing initial administrator configuration refuses before initializing an empty production database', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sdinfinova-startup-no-admin-'));
  const databasePath = path.join(root, 'database');
  fs.mkdirSync(databasePath);
  assert.deepEqual(fs.readdirSync(databasePath), []);

  const script = `
    const { initDatabase } = await import('./src/server/db.ts');
    try { await initDatabase(); process.exitCode = 2; }
    catch (error) {
      if (!String(error?.message).includes('valid initial administrator configuration')) process.exitCode = 3;
    }
  `;
  const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', script], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PGLITE_DATA_DIR: databasePath,
      ALLOW_SCHEMA_MIGRATIONS: 'true',
      INITIAL_ADMIN_EMAIL: '',
      INITIAL_ADMIN_PASSWORD: ''
    }
  });

  assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`);
  assert.deepEqual(fs.readdirSync(databasePath), []);
});

test('authorized production initialization succeeds against a disposable database directory', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sdinfinova-startup-authorized-'));
  const databasePath = path.join(root, 'database');
  fs.mkdirSync(databasePath);
  const script = `
    const { initDatabase, pg } = await import('./src/server/db.ts');
    await initDatabase();
    const services = await pg.query('SELECT COUNT(*)::int AS count FROM services');
    if (services.rows[0].count !== 8) process.exitCode = 4;
    delete process.env.INITIAL_ADMIN_EMAIL;
    delete process.env.INITIAL_ADMIN_PASSWORD;
    await initDatabase();
    await pg.close();
  `;
  const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', script], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PGLITE_DATA_DIR: databasePath,
      ALLOW_SCHEMA_MIGRATIONS: 'true',
      INITIAL_ADMIN_EMAIL: 'owner@example.test',
      INITIAL_ADMIN_PASSWORD: 'isolated-test-password-over-sixteen'
    }
  });

  assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`);
});
