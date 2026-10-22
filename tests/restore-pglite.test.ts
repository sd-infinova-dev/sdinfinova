import test from 'node:test';
import assert from 'node:assert/strict';
import { link, mkdtemp, mkdir, realpath, readdir, rm, symlink, writeFile, stat, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { assertNoSymbolicLinkComponents, runPathCheckOnly, runPgliteRestoreWrapper, runRestoreCli } from '../scripts/restore-pglite';

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'sd infinova isolated restore '));
  const archive = join(root, 'source.synthetic.tar.gz');
  const original = join(root, 'original-db-reference');
  const destination = join(root, 'new restore destination');
  const reexport = join(root, 'new output', 'restored.synthetic.tar.gz');
  const scratch = join(root, 'digest scratch');
  await Promise.all([mkdir(original), mkdir(join(root, 'new output'))]);
  await writeFile(archive, 'synthetic archive bytes', { flag: 'wx' });
  const argv = ['--archive', archive, '--original-database', original, '--restore-directory', destination,
    '--reexport-archive', reexport, '--digest-scratch-root', scratch, '--confirm-restore-to', destination];
  return { root, archive, original, destination, reexport, scratch, argv };
}

function testInspector(f: Awaited<ReturnType<typeof fixture>>) {
  return async (path: string, allowMissingLeaf: boolean) => {
    const absolute = resolve(path);
    let found = false;
    try { await stat(absolute); found = true; } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || !allowMissingLeaf) throw error;
    }
    await assertNoSymbolicLinkComponents(absolute, allowMissingLeaf);
    const physicalPath = found ? await realpath(absolute) : join(await realpath(dirname(absolute)), basename(absolute));
    const full = physicalPath.toLowerCase();
    const device = full.includes('source.synthetic') ? 11
      : full.includes('original-db-reference') ? 12
        : full.includes('new restore destination') ? 13
          : full.includes('new output') ? 14
            : full.includes('digest scratch') ? 15 : 16;
    const info = found ? await stat(absolute) : await stat(dirname(absolute));
    return { physicalPath, device, exists: found, isDirectory: found && info.isDirectory(), isFile: found && info.isFile(), links: found ? info.nlink : 0 };
  };
}

function dependencies(f: Awaited<ReturnType<typeof fixture>>, extras: Record<string, unknown> = {}) {
  return {
    projectRoot: process.cwd(),
    platform: 'win32',
    getPgliteVersion: async () => '0.5.10',
    inspectPath: testInspector(f),
    openArchive: async () => ({ async exec() {}, async close() {}, async dumpDataDir() { return new Blob(['synthetic re-export']); } }),
    verifyDatabase: async () => ({ synthetic: true }),
    ...extras,
  } as Parameters<typeof runPgliteRestoreWrapper>[1];
}

async function noSuccessOrMarker(f: Awaited<ReturnType<typeof fixture>>, result: { stdout?: string }) {
  assert.equal(Boolean(result.stdout?.includes('RESTORE_CANDIDATE_READY')), false);
  const paths = [f.reexport, f.scratch];
  for (const path of paths) {
    assert.equal(await stat(path).then(() => true, () => false), false, `failure must not create ${path}`);
  }
  const entries = await readdir(f.root, { recursive: true });
  assert.equal(entries.some((entry) => /BACKUP_VERIFIED|RESTORE_VERIFIED|RESTORE_COMPLETE/.test(String(entry))), false);
}

test('wrapper imports a synthetic archive only to a new physically isolated destination', async (t) => {
  const f = await fixture();
  t.after(async () => rm(f.root, { recursive: true, force: true }));
  let importedPath = '';
  const result = await runPgliteRestoreWrapper(f.argv, {
    projectRoot: process.cwd(), platform: 'win32', getPgliteVersion: async () => '0.5.10', inspectPath: testInspector(f),
    verifyDatabase: async () => ({ synthetic: true }),
    openArchive: async (_archive: string, destination: string) => {
      importedPath = destination;
      await mkdir(destination);
      return { async exec() {}, async close() {}, async dumpDataDir() { return new Blob(['synthetic re-export']); } };
    },
  });
  assert.equal(result.exitCode, 0, result.stderr);
  assert.match(result.stdout || '', /^RESTORE_CANDIDATE_READY_FOR_SEPARATE_ARCHIVE_COMPARISON/);
  assert.match(result.stdout || '', /not proof of complete production recovery/);
  assert.equal(await stat(f.reexport).then((x) => x.isFile()), true);
  assert.equal(await stat(join(f.destination, 'database')).then((x) => x.isDirectory()), true);
  assert.equal(importedPath, join(f.destination, 'database'));
  assert.equal(await stat(f.original).then((x) => x.isDirectory()), true);
});

test('overlapping and duplicate paths fail before import', async (t) => {
  const f = await fixture();
  t.after(async () => rm(f.root, { recursive: true, force: true }));
  let imports = 0;
  const deps = dependencies(f, { openArchive: async () => { imports += 1; throw new Error('must not import'); } });
  const overlapping = [...f.argv];
  overlapping[7] = f.archive;
  const result = await runPgliteRestoreWrapper(overlapping, deps);
  assert.notEqual(result.exitCode, 0);
  assert.equal(imports, 0);
  await noSuccessOrMarker(f, result);

  const hardLink = join(f.root, 'archive-hardlink.synthetic');
  try { await link(f.archive, hardLink); } catch (error) {
    if (['EPERM', 'EACCES', 'ENOTSUP', 'EXDEV'].includes((error as NodeJS.ErrnoException).code || '')) { t.skip('Hard links unavailable on this test volume'); return; }
    throw error;
  }
  const linkedArgs = [...f.argv];
  linkedArgs[1] = hardLink;
  const linked = await runPgliteRestoreWrapper(linkedArgs, deps);
  assert.notEqual(linked.exitCode, 0);
  assert.equal(imports, 0);
  await noSuccessOrMarker(f, linked);
});

test('pre-existing destination fails before import and is preserved', async (t) => {
  const f = await fixture();
  t.after(async () => rm(f.root, { recursive: true, force: true }));
  await mkdir(f.destination);
  await writeFile(join(f.destination, 'keep.txt'), 'synthetic existing data');
  let imports = 0;
  const result = await runPgliteRestoreWrapper(f.argv, dependencies(f, { openArchive: async () => { imports += 1; throw new Error('must not import'); } }));
  assert.notEqual(result.exitCode, 0);
  assert.equal(imports, 0);
  assert.equal(await stat(join(f.destination, 'keep.txt')).then((x) => x.isFile()), true);
  assert.equal(result.stdout, undefined);
});

test('junction or symbolic-link input is rejected before import where supported', async (t) => {
  const f = await fixture();
  t.after(async () => rm(f.root, { recursive: true, force: true }));
  const alias = join(f.root, 'archive-alias');
  try { await symlink(f.root, alias, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) {
    if (['EPERM', 'EACCES', 'ENOTSUP'].includes((error as NodeJS.ErrnoException).code || '')) { t.skip('Reparse-point creation unavailable on this test host'); return; }
    throw error;
  }
  let imports = 0;
  const args = [...f.argv];
  args[1] = join(alias, 'source.synthetic.tar.gz');
  const result = await runPgliteRestoreWrapper(args, {
    projectRoot: process.cwd(), getPgliteVersion: async () => '0.5.10',
    inspectPath: testInspector(f),
    openArchive: async () => { imports += 1; throw new Error('must not import'); },
  });
  assert.notEqual(result.exitCode, 0);
  assert.equal(imports, 0);
  assert.equal(result.stdout, undefined);
});

test('path-only mode calls the native Windows guard for ordinary files and directories', async (t) => {
  if (process.platform !== 'win32') { t.skip('Native PowerShell guard requires Windows'); return; }
  const root = await mkdtemp(join(process.cwd(), '.restore-native-path-check-'));
  const directory = join(root, 'ordinary directory');
  const archive = join(root, 'ordinary file.txt');
  const missingLeaf = join(directory, 'future-destination');
  const missingParent = join(root, 'missing-parent', 'child');
  t.after(async () => rm(root, { recursive: true, force: true }));
  await mkdir(directory);
  await writeFile(archive, 'synthetic only', { flag: 'wx' });
  for (const path of [directory, archive, missingLeaf]) {
    const result = await runPathCheckOnly(['--path-check-only', '--path', path, '--expect', 'accepted']);
    assert.equal(result.exitCode, 0, result.stderr);
    assert.equal(result.stdout, 'PATH_ACCEPTED_BY_NATIVE_WINDOWS_GUARD');
  }
  const missing = await runPathCheckOnly(['--path-check-only', '--path', missingParent, '--expect', 'accepted']);
  assert.notEqual(missing.exitCode, 0, 'missing parent components must fail closed');
  assert.equal(missing.stdout, undefined);
});

test('path-only mode rejects a Windows junction through the native PowerShell guard', async (t) => {
  if (process.platform !== 'win32') { t.skip('Native PowerShell guard requires Windows'); return; }
  const root = await mkdtemp(join(process.cwd(), '.restore-native-junction-check-'));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const target = join(root, 'junction target');
  const junction = join(root, 'junction alias');
  await mkdir(target);
  try { await symlink(target, junction, 'junction'); }
  catch (error) {
    if (['EPERM', 'EACCES', 'ENOTSUP'].includes((error as NodeJS.ErrnoException).code || '')) { t.skip('Junction creation unavailable'); return; }
    throw error;
  }
  const result = await runPathCheckOnly(['--path-check-only', '--path', join(junction, 'child'), '--expect', 'reparse-rejected']);
  assert.equal(result.exitCode, 0, result.stderr);
  assert.equal(result.stdout, 'REPARSE_POINT_REJECTED_BY_NATIVE_WINDOWS_GUARD');

  const symbolicLink = join(root, 'symbolic link');
  try { await symlink(target, symbolicLink, 'dir'); }
  catch (error) {
    if (['EPERM', 'EACCES', 'ENOTSUP'].includes((error as NodeJS.ErrnoException).code || '')) { t.diagnostic('Directory symbolic-link test unavailable on this host'); return; }
    throw error;
  }
  const symbolic = await runPathCheckOnly(['--path-check-only', '--path', join(symbolicLink, 'child'), '--expect', 'reparse-rejected']);
  assert.equal(symbolic.exitCode, 0, symbolic.stderr);
  assert.equal(symbolic.stdout, 'REPARSE_POINT_REJECTED_BY_NATIVE_WINDOWS_GUARD');
});

test('path-only mode fails closed on invalid paths, PowerShell errors, and timeouts', async (t) => {
  if (process.platform !== 'win32') { t.skip('Native PowerShell guard requires Windows'); return; }
  const invalid = await runPathCheckOnly(['--path-check-only', '--path', 'relative.txt', '--expect', 'accepted']);
  assert.notEqual(invalid.exitCode, 0);
  assert.equal(invalid.stdout, undefined);
  for (const runner of [
    () => ({ status: 1, stdout: '', stderr: 'synthetic error' }),
    () => ({ status: null, stdout: '', stderr: '', error: Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }) }),
  ]) {
    const result = await runPathCheckOnly(['--path-check-only', '--path', 'C:\\synthetic\\path', '--expect', 'accepted'], runner);
    assert.notEqual(result.exitCode, 0);
    assert.equal(result.stdout, undefined);
  }
});

test('executable restore CLI refuses restore arguments and cannot enter import workflow', async (t) => {
  const f = await fixture();
  t.after(async () => rm(f.root, { recursive: true, force: true }));
  const result = await runRestoreCli(f.argv);
  assert.notEqual(result.exitCode, 0);
  assert.match(result.stderr || '', /^RESTORE_DISABLED/);
  assert.equal(result.stdout, undefined);
  assert.equal(await stat(f.destination).then(() => true, () => false), false);
  assert.equal(await stat(f.reexport).then(() => true, () => false), false);
});

test('valid synthetic PGlite archive imports and re-exports for separate comparison', async (t) => {
  const f = await fixture();
  t.after(async () => rm(f.root, { recursive: true, force: true }));
  const source = new PGlite();
  await source.waitReady;
  await source.exec("CREATE TABLE public.schema_migrations (version text PRIMARY KEY); INSERT INTO public.schema_migrations VALUES ('synthetic-restore-001')");
  await source.exec('CREATE TABLE synthetic_restore_check (id integer PRIMARY KEY, value text NOT NULL)');
  await source.exec("INSERT INTO synthetic_restore_check VALUES (1, 'synthetic-only')");
  const archive = await source.dumpDataDir('gzip');
  await source.close();
  await writeFile(f.archive, new Uint8Array(await archive.arrayBuffer()), { flag: 'w' });

  const result = await runPgliteRestoreWrapper(f.argv, {
    projectRoot: process.cwd(), platform: 'win32', getPgliteVersion: async () => '0.5.10',
    inspectPath: testInspector(f),
  });
  assert.equal(result.exitCode, 0, result.stderr);
  assert.match(result.stdout || '', /^RESTORE_CANDIDATE_READY_FOR_SEPARATE_ARCHIVE_COMPARISON/);
  assert.match(result.stdout || '', /not proof of complete production recovery/);
  assert.equal(await stat(f.reexport).then((x) => x.isFile()), true);
  const reexportBytes = await readFile(f.reexport);
  assert.ok(reexportBytes.length > 0);
});

test('operator destination confirmation must match exactly before import', async (t) => {
  const f = await fixture();
  t.after(async () => rm(f.root, { recursive: true, force: true }));
  let imports = 0;
  const args = [...f.argv];
  args[11] = join(f.root, 'different destination');
  const result = await runPgliteRestoreWrapper(args, dependencies(f, { openArchive: async () => { imports += 1; throw new Error('must not import'); } }));
  assert.notEqual(result.exitCode, 0);
  assert.equal(imports, 0);
  await noSuccessOrMarker(f, result);
});

test('unavailable physical-path validation fails before creating a destination or importing', async (t) => {
  const f = await fixture();
  t.after(async () => rm(f.root, { recursive: true, force: true }));
  let imports = 0;
  const result = await runPgliteRestoreWrapper(f.argv, dependencies(f, {
    inspectPath: async () => { throw new Error('synthetic physical path guard unavailable'); },
    openArchive: async () => { imports += 1; throw new Error('must not import'); },
  }));
  assert.notEqual(result.exitCode, 0);
  assert.equal(imports, 0);
  await noSuccessOrMarker(f, result);
  assert.equal(await stat(f.destination).then(() => true, () => false), false);
});

test('missing or duplicate CLI arguments fail before any import or destination creation', async (t) => {
  const f = await fixture();
  t.after(async () => rm(f.root, { recursive: true, force: true }));
  let imports = 0;
  const deps = dependencies(f, { openArchive: async () => { imports += 1; throw new Error('must not import'); } });
  const missing = await runPgliteRestoreWrapper([], deps);
  const duplicate = await runPgliteRestoreWrapper([...f.argv, '--archive', f.archive], deps);
  assert.notEqual(missing.exitCode, 0);
  assert.notEqual(duplicate.exitCode, 0);
  assert.equal(imports, 0);
  await noSuccessOrMarker(f, missing);
  await noSuccessOrMarker(f, duplicate);
  assert.equal(await stat(f.destination).then(() => true, () => false), false);
});

test('corrupt archive, import failure, verification failure, and close failure never report success', async (t) => {
  const f = await fixture();
  t.after(async () => rm(f.root, { recursive: true, force: true }));
  await writeFile(f.archive, 'synthetic corrupt archive', { flag: 'w' });
  const corrupt = await runPgliteRestoreWrapper(f.argv, {
    projectRoot: process.cwd(), platform: 'win32', getPgliteVersion: async () => '0.5.10', inspectPath: testInspector(f),
  });
  assert.notEqual(corrupt.exitCode, 0);
  await noSuccessOrMarker(f, corrupt);
  assert.equal(await stat(f.destination).then(() => true, () => false), true, 'failed imported scratch must be retained for review');

  const failedImport = await runPgliteRestoreWrapper(f.argv, dependencies(f, { openArchive: async () => { throw new Error('synthetic import failure'); } }));
  assert.notEqual(failedImport.exitCode, 0);
  assert.equal(failedImport.stdout, undefined);
  await noSuccessOrMarker(f, failedImport);

  const f2 = await fixture();
  t.after(async () => rm(f2.root, { recursive: true, force: true }));
  const failedVerify = await runPgliteRestoreWrapper(f2.argv, dependencies(f2, { verifyDatabase: async () => { throw new Error('synthetic verification failure'); } }));
  assert.notEqual(failedVerify.exitCode, 0);
  assert.equal(failedVerify.stdout, undefined);
  assert.equal(await stat(f2.reexport).then(() => true, () => false), false);

  const f3 = await fixture();
  t.after(async () => rm(f3.root, { recursive: true, force: true }));
  const failedClose = await runPgliteRestoreWrapper(f3.argv, dependencies(f3, { openArchive: async (_archive: string, directory: string) => {
    await mkdir(directory, { recursive: true });
    return { async exec() {}, async close() { throw new Error('synthetic close failure'); }, async dumpDataDir() { return new Blob(['synthetic dump']); } };
  } }));
  assert.notEqual(failedClose.exitCode, 0);
  assert.equal(failedClose.stdout, undefined);
  assert.equal(await stat(f3.reexport).then(() => true, () => false), false);
  await noSuccessOrMarker(f3, failedClose);
});

test('physical path checker rejects symlink ancestors before accepting the target', async (t) => {
  const f = await fixture();
  t.after(async () => rm(f.root, { recursive: true, force: true }));
  const alias = join(f.root, 'linked-parent');
  try { await symlink(f.root, alias, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) {
    if (['EPERM', 'EACCES', 'ENOTSUP'].includes((error as NodeJS.ErrnoException).code || '')) { t.skip('Symlink creation unavailable on this test host'); return; }
    throw error;
  }
  await assert.rejects(assertNoSymbolicLinkComponents(join(alias, 'child'), true), /Symbolic links/);
});
