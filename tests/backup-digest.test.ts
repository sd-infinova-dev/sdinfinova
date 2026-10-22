import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile, link, stat, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { runBackupDigestCli } from '../scripts/verify-backup-digest';
import {
  assertScratchIsolation,
  canonicalizeCell,
  compareDatabaseDigests,
  compareSnapshotReaders,
  createDatabaseDigest,
  digestTable,
  readDatabaseDigest,
  type DigestTable,
} from '../src/server/backupDigest';

function table(rows: Record<string, unknown>[]): DigestTable {
  return {
    name: 'projects',
    columns: [
      { name: 'id', dataType: 'text', udtName: 'text', nullable: 'NO', defaultValue: null, ordinal: 1 },
      { name: 'title', dataType: 'text', udtName: 'text', nullable: 'NO', defaultValue: null, ordinal: 2 },
      { name: 'created_at', dataType: 'timestamp with time zone', udtName: 'timestamptz', nullable: 'YES', defaultValue: null, ordinal: 3 },
      { name: 'metadata', dataType: 'jsonb', udtName: 'jsonb', nullable: 'YES', defaultValue: null, ordinal: 4 },
    ],
    primaryKey: ['id'],
    constraints: ['PRIMARY KEY (id)'],
    indexes: ['CREATE UNIQUE INDEX projects_pkey ON public.projects USING btree (id)'],
    rows,
  };
}

test('canonical cells distinguish nulls and normalize numeric representations', () => {
  assert.equal(canonicalizeCell('text', null), '["null"]');
  assert.notEqual(canonicalizeCell('text', null), canonicalizeCell('text', 'null'));
  assert.equal(canonicalizeCell('numeric', '1.2300'), canonicalizeCell('numeric', '123e-2'));
  assert.equal(canonicalizeCell('numeric', '-0.00'), canonicalizeCell('numeric', '0'));
  assert.notEqual(canonicalizeCell('numeric', '9007199254740992'), canonicalizeCell('numeric', '9007199254740993'));
});

test('canonical cells normalize timezone dates and preserve local timestamps', () => {
  assert.equal(
    canonicalizeCell('timestamp with time zone', '2026-10-22 06:15:00+05:45'),
    canonicalizeCell('timestamp with time zone', '2026-10-22T00:30:00.000Z'),
  );
  assert.equal(
    canonicalizeCell('timestamp without time zone', '2026-10-22 00:30:00.120000'),
    canonicalizeCell('timestamp without time zone', '2026-10-22T00:30:00.12'),
  );
  assert.notEqual(
    canonicalizeCell('timestamp with time zone', '2026-10-22 00:30:00.000001+00'),
    canonicalizeCell('timestamp with time zone', '2026-10-22 00:30:00.000002+00'),
  );
  assert.equal(
    canonicalizeCell('timestamp with time zone', '2026-10-22 06:15:00.000001+05:45'),
    canonicalizeCell('timestamp with time zone', '2026-10-22T00:30:00.000001Z'),
  );
  assert.throws(() => canonicalizeCell('date', '2026-02-30'), /Invalid date/);
});

test('canonical JSON ignores object key order but preserves arrays and exact numbers', () => {
  assert.equal(
    canonicalizeCell('jsonb', '{"z":1.00,"a":{"y":2,"x":true}}'),
    canonicalizeCell('jsonb', '{"a":{"x":true,"y":2.0},"z":1}'),
  );
  assert.notEqual(canonicalizeCell('jsonb', '[1,2]'), canonicalizeCell('jsonb', '[2,1]'));
  assert.notEqual(canonicalizeCell('jsonb', '9007199254740992'), canonicalizeCell('jsonb', '9007199254740993'));
  assert.throws(() => canonicalizeCell('jsonb', '{"x":1,"x":2}'), /Duplicate/);
  assert.throws(() => canonicalizeCell('jsonb', '{broken'), /Invalid|Unsupported/);
});

test('binary values are canonicalized and malformed binary fails closed', () => {
  assert.equal(canonicalizeCell('bytea', '\\x00ABff'), canonicalizeCell('bytea', '\\x00abFF'));
  assert.throws(() => canonicalizeCell('bytea', '\\x0g'), /binary/);
});

test('record digest changes for edited or missing records and ignores input row order', () => {
  const one = { id: 'p1', title: 'Project One', created_at: '2026-01-01 00:00:00+00', metadata: '{"a":1,"b":2}' };
  const two = { id: 'p2', title: 'Project Two', created_at: null, metadata: null };
  const baseline = createDatabaseDigest([table([one, two])]);
  const reordered = createDatabaseDigest([table([two, one])]);
  const edited = createDatabaseDigest([table([one, { ...two, title: 'Changed' }])]);
  const missing = createDatabaseDigest([table([one])]);
  assert.equal(compareDatabaseDigests(baseline, reordered).matches, true);
  assert.equal(compareDatabaseDigests(baseline, edited).matches, false);
  assert.equal(compareDatabaseDigests(baseline, missing).matches, false);
  const preciseA = createDatabaseDigest([table([{ id: 'p-precision', title: 'Same', created_at: '2026-01-01 00:00:00.000001+00', metadata: null }])]);
  const preciseB = createDatabaseDigest([table([{ id: 'p-precision', title: 'Same', created_at: '2026-01-01 00:00:00.000002+00', metadata: null }])]);
  assert.equal(compareDatabaseDigests(preciseA, preciseB).matches, false);
});

test('migration ledger and schema metadata participate in database comparison', () => {
  const migrations: DigestTable = {
    name: 'schema_migrations',
    columns: [{ name: 'version', dataType: 'text', udtName: 'text', nullable: 'NO', defaultValue: null, ordinal: 1 }],
    primaryKey: ['version'], constraints: ['PRIMARY KEY (version)'], indexes: [], rows: [{ version: '001_initial_schema' }],
  };
  const first = createDatabaseDigest([table([]), migrations]);
  const changedMigration: DigestTable = { ...migrations, rows: [{ version: '002_other_schema' }] };
  const other = createDatabaseDigest([table([]), changedMigration]);
  assert.equal(compareDatabaseDigests(first, other).migrationMatches, false);
  const changedSchema = createDatabaseDigest([{ ...table([]), columns: table([]).columns.slice(0, 3) }, migrations]);
  assert.equal(compareDatabaseDigests(first, changedSchema).schemaMatches, false);
  const withPolicy = createDatabaseDigest([{ ...table([]), policies: ['policy-a'] }, migrations]);
  assert.equal(compareDatabaseDigests(first, withPolicy).schemaMatches, false);
  const withSequence = createDatabaseDigest([table([]), migrations], [{ kind: 'sequence', name: 'project_id_seq', definition: 'increment=1,last=4' }]);
  assert.equal(compareDatabaseDigests(first, withSequence).schemaMatches, false);
  const withRoutine = createDatabaseDigest([table([]), migrations], [{ kind: 'routine', name: 'test_fn()', definition: 'CREATE FUNCTION test_fn() RETURNS integer ...' }]);
  assert.equal(compareDatabaseDigests(first, withRoutine).schemaMatches, false);
  const withRls = createDatabaseDigest([{ ...table([]), rowSecurity: { enabled: true, forced: false } }, migrations]);
  assert.equal(compareDatabaseDigests(first, withRls).schemaMatches, false);
  const withTrigger = createDatabaseDigest([{ ...table([]), triggers: ['trigger-a|function=body-a'] }, migrations]);
  assert.equal(compareDatabaseDigests(first, withTrigger).schemaMatches, false);
});

test('unsupported types and incomplete rows fail closed', () => {
  assert.throws(() => canonicalizeCell('USER-DEFINED', 'secret-enum'), /Unsupported database type/);
  assert.throws(() => digestTable(table([{ id: 'p1' }])), /Incomplete database row/);
});

test('query failure rolls back and returns no partial digest', async () => {
  const calls: string[] = [];
  const db = {
    async exec(sql: string) { calls.push(sql); },
    async query() { throw new Error('synthetic query failure'); },
  };
  await assert.rejects(readDatabaseDigest(db), /synthetic query failure/);
  assert.equal(calls[0], 'BEGIN READ ONLY');
  assert.equal(calls.includes('ROLLBACK'), true);
});

test('database reader hashes all public tables in a read-only transaction', async () => {
  const statements: string[] = [];
  let unsupportedViewPresent = false;
  const db = {
    async exec(sql: string) { statements.push(sql); },
    async query<T>(sql: string) {
      if (sql.includes('information_schema.tables')) return { rows: [{ table_name: 'schema_migrations' }, { table_name: 'projects' }] as T[] };
      if (sql.includes('information_schema.columns')) return { rows: [
        { table_name: 'schema_migrations', name: 'version', dataType: 'text', udtName: 'text', nullable: 'NO', defaultValue: null, ordinal: 1 },
        { table_name: 'projects', name: 'id', dataType: 'text', udtName: 'text', nullable: 'NO', defaultValue: null, ordinal: 1 },
        { table_name: 'projects', name: 'title', dataType: 'text', udtName: 'text', nullable: 'NO', defaultValue: null, ordinal: 2 },
      ] as T[] };
      if (sql.includes('key_column_usage')) return { rows: [
        { table_name: 'schema_migrations', column_name: 'version', ordinal_position: 1 },
        { table_name: 'projects', column_name: 'id', ordinal_position: 1 },
      ] as T[] };
      if (sql.includes('pg_constraint')) return { rows: [{ table_name: 'projects', definition: 'PRIMARY KEY (id)' }] as T[] };
      if (sql.includes('pg_indexes')) return { rows: [{ tablename: 'projects', indexdef: 'CREATE UNIQUE INDEX projects_pkey ON public.projects USING btree (id)' }] as T[] };
      if (sql.includes('relrowsecurity')) return { rows: [{ table_name: 'schema_migrations', enabled: false, forced: false }, { table_name: 'projects', enabled: false, forced: false }] as T[] };
      if (sql.includes('pg_policies')) return { rows: [] as T[] };
      if (sql.includes('pg_trigger')) return { rows: [] as T[] };
      if (sql.includes('pg_sequences')) return { rows: [] as T[] };
      if (sql.includes("p.prokind IN ('f', 'p')")) return { rows: [] as T[] };
      if (sql.includes("p.prokind NOT IN ('f', 'p')")) return { rows: [] as T[] };
      if (sql.includes("t.typtype IN ('b', 'c', 'd', 'e', 'r', 'm')")) return { rows: [] as T[] };
      if (sql.includes("c.relkind IN ('v', 'm', 'f')")) return { rows: (unsupportedViewPresent ? [{ name: 'unexpected_view', kind: 'v' }] : []) as T[] };
      if (sql.includes('count(*)')) return { rows: [{ row_count: '1' }] as T[] };
      if (sql.includes('public."schema_migrations"')) return { rows: [{ c0: '001_initial_schema' }] as T[] };
      if (sql.includes('public."projects"')) return { rows: [{ c0: 'synthetic-project', c1: 'Synthetic Project' }] as T[] };
      throw new Error('unexpected synthetic query');
    },
  };
  const digest = await readDatabaseDigest(db);
  assert.equal(Object.keys(digest.tables).length, 2);
  assert.equal(digest.tables.projects.count, 1);
  assert.notEqual(digest.migrationSha256, null);
  assert.deepEqual(statements, ['BEGIN READ ONLY', "SET LOCAL TIME ZONE 'UTC'; SET LOCAL DateStyle TO ISO, YMD", 'ROLLBACK']);
  unsupportedViewPresent = true;
  await assert.rejects(readDatabaseDigest(db), /Unsupported public schema object/);
});

test('schema catalog captures RLS, policies, triggers, and detects their changes', async () => {
  const db = await PGlite.create();
  try {
    await db.exec(`
      CREATE TABLE public.schema_migrations (version text PRIMARY KEY);
      INSERT INTO public.schema_migrations VALUES ('synthetic-001');
      CREATE TABLE public.projects (id text PRIMARY KEY, created_at timestamptz);
      INSERT INTO public.projects VALUES ('synthetic-project', '2026-10-22 00:30:00.000001+00');
      CREATE SEQUENCE public.synthetic_seq START 7;
      ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
      CREATE POLICY synthetic_policy ON public.projects USING (id <> 'blocked');
      CREATE FUNCTION public.synthetic_trigger_fn() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
      CREATE TRIGGER synthetic_trigger BEFORE INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION public.synthetic_trigger_fn();
    `);
    const digest = await readDatabaseDigest(db);
    assert.equal(digest.tables.projects.count, 1);
    assert.equal(digest.tables.projects.sha256.length, 64);
    const catalog = await db.query<{ rls: boolean; forced: boolean; policy: string | null; trigger_def: string | null }>(`
      SELECT c.relrowsecurity AS rls, c.relforcerowsecurity AS forced,
        (SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='projects' LIMIT 1) AS policy,
        (SELECT pg_get_triggerdef(t.oid, true) FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal LIMIT 1) AS trigger_def
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname='projects'
    `);
    assert.deepEqual(catalog.rows[0], {
      rls: true,
      forced: false,
      policy: 'synthetic_policy',
      trigger_def: 'CREATE TRIGGER synthetic_trigger BEFORE INSERT ON projects FOR EACH ROW EXECUTE FUNCTION synthetic_trigger_fn()',
    });
    assert.deepEqual(digest.schemaObjects.map((object) => object.kind).sort(), ['routine', 'sequence']);

    await db.exec('ALTER TABLE public.projects FORCE ROW LEVEL SECURITY');
    const forcedRlsDigest = await readDatabaseDigest(db);
    assert.notEqual(digest.schemaSha256, forcedRlsDigest.schemaSha256, 'forced RLS change must affect schema digest');
    assert.equal((await db.query<{ forced: boolean }>("SELECT relforcerowsecurity AS forced FROM pg_class WHERE relname='projects'")).rows[0].forced, true);

    await db.exec("ALTER POLICY synthetic_policy ON public.projects USING (id <> 'changed')");
    const policyDigest = await readDatabaseDigest(db);
    assert.notEqual(forcedRlsDigest.schemaSha256, policyDigest.schemaSha256, 'policy change must affect schema digest');

    await db.exec('DROP TRIGGER synthetic_trigger ON public.projects; CREATE TRIGGER synthetic_trigger AFTER INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION public.synthetic_trigger_fn()');
    const triggerDigest = await readDatabaseDigest(db);
    assert.notEqual(policyDigest.schemaSha256, triggerDigest.schemaSha256, 'trigger definition change must affect schema digest');

    await db.exec('CREATE VIEW public.synthetic_view AS SELECT id FROM public.projects');
    await assert.rejects(readDatabaseDigest(db), /Unsupported public schema object/);
  } finally {
    await db.close();
  }
});

test('required schema metadata inspection failures fail closed', async () => {
  const db = await PGlite.create();
  try {
    await db.exec('CREATE TABLE public.schema_migrations (version text PRIMARY KEY); CREATE TABLE public.projects (id text PRIMARY KEY)');
    const failingReader = {
      exec: (sql: string) => db.exec(sql),
      query: <T = Record<string, unknown>>(sql: string) => {
        if (sql.includes('pg_policies')) throw new Error('synthetic policy catalog failure');
        return db.query<T>(sql);
      },
    };
    await assert.rejects(readDatabaseDigest(failingReader), /synthetic policy catalog failure/);
  } finally {
    await db.close();
  }
});

test('snapshot comparison fails closed and does not read the second side after a partial first read', async () => {
  let secondRead = false;
  await assert.rejects(compareSnapshotReaders(
    async () => { throw new Error('synthetic incomplete snapshot'); },
    async () => { secondRead = true; return createDatabaseDigest([table([])]); },
  ), /synthetic incomplete/);
  assert.equal(secondRead, false);
});

test('invalid cell canonicalization never yields a success digest', () => {
  assert.throws(() => createDatabaseDigest([{
    ...table([{ id: 'p1', title: 'ok', created_at: null, metadata: null }]),
    columns: [{ name: 'payload', dataType: 'USER-DEFINED', udtName: 'unknown', nullable: 'NO', defaultValue: null, ordinal: 1 }],
    rows: [{ payload: 'synthetic' }],
  }]), /Unsupported database type/);
});

test('scratch verifier path must be separate from repository, original database, and archive locations', () => {
  const safe = {
    projectRoot: 'D:\\repo',
    scratchRoot: 'G:\\verify\\run-1',
    originalDatabase: 'D:\\data\\postgres',
    archiveDirectories: ['E:\\backup', 'F:\\restore'],
  };
  assert.doesNotThrow(() => assertScratchIsolation(safe));
  assert.throws(() => assertScratchIsolation({ ...safe, scratchRoot: 'D:\\repo\\verify' }), /outside the repository/);
  assert.throws(() => assertScratchIsolation({ ...safe, scratchRoot: 'D:\\data\\postgres\\verify' }), /original database/);
  assert.throws(() => assertScratchIsolation({ ...safe, scratchRoot: 'E:\\backup\\verify' }), /archive location/);
  assert.throws(() => assertScratchIsolation({ ...safe, archiveDirectories: ['D:\\data\\postgres\\archives'] }), /outside the original/);
});

async function cliFixture() {
  const root = await mkdtemp(join(tmpdir(), 'sd infinova digest cli '));
  const archiveDir = join(root, 'archives');
  const scratchParent = join(root, 'scratch parent');
  const originalDatabase = join(root, 'original database reference');
  await Promise.all([mkdir(archiveDir), mkdir(scratchParent), mkdir(originalDatabase)]);
  const sourceArchive = join(archiveDir, 'source.synthetic');
  const restoredArchive = join(archiveDir, 'restored.synthetic');
  const scratchRoot = join(scratchParent, 'new scratch');
  await writeFile(sourceArchive, 'synthetic-source-archive');
  await writeFile(restoredArchive, 'synthetic-restored-archive');
  const argv = ['--source-archive', sourceArchive, '--restored-archive', restoredArchive, '--scratch-root', scratchRoot, '--original-database', originalDatabase];
  return { root, archiveDir, sourceArchive, restoredArchive, scratchRoot, originalDatabase, argv };
}

function fakeHandle() {
  return { async exec() {}, async query() { return { rows: [] }; }, async close() {} };
}

function syntheticCliDependencies(overrides: Parameters<typeof runBackupDigestCli>[1] = {}) {
  const snapshot = createDatabaseDigest([table([]), {
    name: 'schema_migrations', columns: [{ name: 'version', dataType: 'text', udtName: 'text', nullable: 'NO', defaultValue: null, ordinal: 1 }],
    primaryKey: ['version'], constraints: [], indexes: [], rows: [{ version: 'synthetic-001' }],
  }]);
  return {
    projectRoot: process.cwd(),
    getPgliteVersion: async () => '0.5.10',
    openArchive: async () => fakeHandle(),
    readDigest: async () => snapshot,
    ...overrides,
  };
}

async function assertNoSuccessMarker(root: string, result: { stdout?: string }) {
  assert.equal(result.stdout?.includes('ARCHIVE_CONTENTS_MATCH') ?? false, false);
  assert.equal(result.stdout?.includes('RESTORE_VERIFIED') ?? false, false);
  assert.equal(result.stdout?.includes('BACKUP_VERIFIED') ?? false, false);
  const entries = await readdir(root, { recursive: true });
  assert.equal(entries.some((entry) => /BACKUP_VERIFIED|RESTORE_VERIFIED|DIGEST_MATCH/.test(String(entry))), false);
}

async function makeSyntheticPgliteArchive(title: string, migration: string): Promise<Uint8Array> {
  const db = new PGlite();
  await db.waitReady;
  try {
    await db.exec(`
      CREATE TABLE public.schema_migrations (version text PRIMARY KEY);
      INSERT INTO public.schema_migrations VALUES ('${migration}');
      CREATE TABLE public.projects (id text PRIMARY KEY, title text NOT NULL);
      INSERT INTO public.projects VALUES ('synthetic-project-1', '${title}');
    `);
    const archive = await db.dumpDataDir('gzip');
    return new Uint8Array(await archive.arrayBuffer());
  } finally {
    await db.close();
  }
}

test('real PGlite archive comparison matches complete synthetic records and detects record and migration changes', async (t) => {
  const f = await cliFixture();
  t.after(async () => rm(f.root, { recursive: true, force: true }));
  const sourceBytes = await makeSyntheticPgliteArchive('Synthetic title', 'synthetic-migration-001');
  const matchingBytes = await makeSyntheticPgliteArchive('Synthetic title', 'synthetic-migration-001');
  await writeFile(f.sourceArchive, sourceBytes, { flag: 'w' });
  await writeFile(f.restoredArchive, matchingBytes, { flag: 'w' });

  const dependencies = { projectRoot: process.cwd(), getPgliteVersion: async () => '0.5.10' };
  const match = await runBackupDigestCli(f.argv, dependencies);
  assert.equal(match.exitCode, 0, match.stderr);
  assert.match(match.stdout || '', /^ARCHIVE_CONTENTS_MATCH/);
  assert.match(match.stdout || '', /does not prove that a restore occurred/);

  const changedBytes = await makeSyntheticPgliteArchive('Changed synthetic title', 'synthetic-migration-002');
  await writeFile(f.restoredArchive, changedBytes, { flag: 'w' });
  const mismatchArgs = [...f.argv];
  mismatchArgs[5] = join(f.root, 'scratch parent', 'new mismatch scratch');
  const mismatch = await runBackupDigestCli(mismatchArgs, dependencies);
  assert.equal(mismatch.exitCode, 2);
  assert.match(mismatch.stdout || '', /^ARCHIVE_CONTENTS_MISMATCH/);
  assert.match(mismatch.stdout || '', /projects/);
  assert.match(mismatch.stdout || '', /schema_migrations/);
});

test('CLI rejects missing and duplicate arguments before creating scratch state', async (t) => {
  const f = await cliFixture();
  t.after(async () => rm(f.root, { recursive: true, force: true }));
  const missing = await runBackupDigestCli([], syntheticCliDependencies());
  assert.notEqual(missing.exitCode, 0);
  const duplicate = await runBackupDigestCli([...f.argv, '--scratch-root', f.scratchRoot], syntheticCliDependencies());
  assert.notEqual(duplicate.exitCode, 0);
  await assertNoSuccessMarker(f.root, missing);
  await assertNoSuccessMarker(f.root, duplicate);
  assert.equal(await stat(f.scratchRoot).then(() => true, () => false), false);
});

test('CLI rejects identical and hard-linked archive inputs', async (t) => {
  const f = await cliFixture();
  t.after(async () => rm(f.root, { recursive: true, force: true }));
  const samePath = [...f.argv];
  samePath[3] = samePath[1];
  const same = await runBackupDigestCli(samePath, syntheticCliDependencies());
  assert.notEqual(same.exitCode, 0);
  await assertNoSuccessMarker(f.root, same);
  const hardLink = join(f.archiveDir, 'source-hardlink.synthetic');
  try { await link(f.sourceArchive, hardLink); } catch (error) {
    if (['EPERM', 'EACCES', 'ENOTSUP', 'EXDEV'].includes((error as NodeJS.ErrnoException).code || '')) { t.skip('Hard links are unavailable on this test volume'); return; }
    throw error;
  }
  const hardLinkedArgs = [...f.argv];
  hardLinkedArgs[3] = hardLink;
  const linked = await runBackupDigestCli(hardLinkedArgs, syntheticCliDependencies());
  assert.notEqual(linked.exitCode, 0);
  await assertNoSuccessMarker(f.root, linked);
});

test('CLI rejects scratch paths within the original database reference', async (t) => {
  const f = await cliFixture();
  t.after(async () => rm(f.root, { recursive: true, force: true }));
  const unsafe = [...f.argv];
  unsafe[5] = join(f.originalDatabase, 'scratch');
  const result = await runBackupDigestCli(unsafe, syntheticCliDependencies());
  assert.notEqual(result.exitCode, 0);
  await assertNoSuccessMarker(f.root, result);
});

test('CLI rejects synthetic corrupt archives and importer failures without a success marker', async (t) => {
  const f = await cliFixture();
  t.after(async () => rm(f.root, { recursive: true, force: true }));
  const result = await runBackupDigestCli(f.argv, syntheticCliDependencies({
    openArchive: async (_path, _dir, bytes) => {
      if (new TextDecoder().decode(bytes).includes('synthetic')) throw new Error('synthetic corrupt archive');
      return fakeHandle();
    },
  }));
  assert.notEqual(result.exitCode, 0);
  await assertNoSuccessMarker(f.root, result);
});

test('CLI real PGlite importer rejects a corrupt synthetic archive without success output', async (t) => {
  const f = await cliFixture();
  t.after(async () => rm(f.root, { recursive: true, force: true }));
  const deps = syntheticCliDependencies();
  const result = await runBackupDigestCli(f.argv, {
    projectRoot: deps.projectRoot,
    getPgliteVersion: deps.getPgliteVersion,
    readDigest: deps.readDigest,
  });
  assert.notEqual(result.exitCode, 0);
  assert.equal(result.stderr, 'VERIFY_FAILED no complete archive-content comparison was produced');
  await assertNoSuccessMarker(f.root, result);
  assert.equal(await stat(f.scratchRoot).then(() => true, () => false), true, 'only the synthetic scratch root may have been created');
});

test('CLI rejects missing archive files before opening a database', async (t) => {
  const f = await cliFixture();
  t.after(async () => rm(f.root, { recursive: true, force: true }));
  const args = [...f.argv];
  args[1] = join(f.archiveDir, 'missing.synthetic');
  let opened = false;
  const result = await runBackupDigestCli(args, syntheticCliDependencies({ openArchive: async () => { opened = true; return fakeHandle(); } }));
  assert.notEqual(result.exitCode, 0);
  assert.equal(opened, false);
  await assertNoSuccessMarker(f.root, result);
});

test('CLI mismatch returns nonzero and reports archive mismatch only', async (t) => {
  const f = await cliFixture();
  t.after(async () => rm(f.root, { recursive: true, force: true }));
  const snapshot = createDatabaseDigest([table([]), {
    name: 'schema_migrations', columns: [{ name: 'version', dataType: 'text', udtName: 'text', nullable: 'NO', defaultValue: null, ordinal: 1 }],
    primaryKey: ['version'], constraints: [], indexes: [], rows: [{ version: 'synthetic-002' }],
  }]);
  let readCount = 0;
  const result = await runBackupDigestCli(f.argv, syntheticCliDependencies({ readDigest: async () => (++readCount === 1
    ? createDatabaseDigest([table([]), { name: 'schema_migrations', columns: [{ name: 'version', dataType: 'text', udtName: 'text', nullable: 'NO', defaultValue: null, ordinal: 1 }], primaryKey: ['version'], constraints: [], indexes: [], rows: [{ version: 'synthetic-001' }] }])
    : snapshot) }));
  assert.equal(result.exitCode, 2);
  assert.match(result.stdout || '', /^ARCHIVE_CONTENTS_MISMATCH/);
  await assertNoSuccessMarker(f.root, result);
});

test('CLI close/cleanup failures return nonzero and never claim archive equality', async (t) => {
  const f = await cliFixture();
  t.after(async () => rm(f.root, { recursive: true, force: true }));
  const result = await runBackupDigestCli(f.argv, syntheticCliDependencies({
    openArchive: async () => ({ ...fakeHandle(), async close() { throw new Error('synthetic close failure'); } }),
  }));
  assert.notEqual(result.exitCode, 0);
  await assertNoSuccessMarker(f.root, result);
});

test('successful CLI output claims archive equality only and cannot mark backup complete', async (t) => {
  const f = await cliFixture();
  t.after(async () => rm(f.root, { recursive: true, force: true }));
  const result = await runBackupDigestCli(f.argv, syntheticCliDependencies());
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout || '', /^ARCHIVE_CONTENTS_MATCH/);
  assert.match(result.stdout || '', /does not prove that a restore occurred/);
  const entries = await readdir(f.root, { recursive: true });
  assert.equal(entries.some((entry) => /BACKUP_VERIFIED|RESTORE_VERIFIED/.test(String(entry))), false);
});
