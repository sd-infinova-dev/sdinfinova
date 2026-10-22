import { PGlite } from '@electric-sql/pglite';
import { lstat, mkdir, readFile, realpath, stat } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertScratchIsolation, compareSnapshotReaders, readDatabaseDigest, type DatabaseDigest } from '../src/server/backupDigest';

type Args = { sourceArchive: string; restoredArchive: string; scratchRoot: string; originalDatabase: string };
type DatabaseHandle = {
  exec(sql: string): Promise<unknown>;
  query<T = Record<string, unknown>>(sql: string): Promise<{ rows: T[] }>;
  close(): Promise<void>;
};
type CliDependencies = {
  projectRoot?: string;
  getPgliteVersion?: () => Promise<string>;
  openArchive?: (archivePath: string, dataDir: string, bytes: Uint8Array) => Promise<DatabaseHandle>;
  readDigest?: (db: DatabaseHandle) => Promise<DatabaseDigest>;
};
export type CliResult = { exitCode: number; stdout?: string; stderr?: string };

const fail = (message: string): never => { throw new Error(message); };
const defaultProjectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function requireAbsent(target: string, message: string) {
  try {
    await lstat(target);
    fail(message);
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
  }
}

function parseArgs(argv: string[]): Args {
  const values = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!['--source-archive', '--restored-archive', '--scratch-root', '--original-database'].includes(key)) fail('Unknown argument');
    const value = argv[i + 1];
    if (!value || value.startsWith('--') || values.has(key)) fail('Missing or duplicate argument');
    values.set(key, value);
    i += 1;
  }
  const sourceArchive = values.get('--source-archive');
  const restoredArchive = values.get('--restored-archive');
  const scratchRoot = values.get('--scratch-root');
  const originalDatabase = values.get('--original-database');
  if (!sourceArchive || !restoredArchive || !scratchRoot || !originalDatabase) fail('Required arguments missing');
  return { sourceArchive: sourceArchive!, restoredArchive: restoredArchive!, scratchRoot: scratchRoot!, originalDatabase: originalDatabase! };
}

async function validateInputs(args: Args, projectRoot: string) {
  const [sourceInputStat, restoredInputStat] = await Promise.all([lstat(args.sourceArchive), lstat(args.restoredArchive)]);
  if (!sourceInputStat.isFile() || sourceInputStat.isSymbolicLink() || !restoredInputStat.isFile() || restoredInputStat.isSymbolicLink()) fail('Archive inputs must be regular files');
  const [sourceArchive, restoredArchive, sourceStat, restoredStat] = await Promise.all([
    realpath(args.sourceArchive), realpath(args.restoredArchive), stat(args.sourceArchive), stat(args.restoredArchive),
  ]);
  if (sourceArchive === restoredArchive || (sourceStat.ino !== 0 && sourceStat.dev === restoredStat.dev && sourceStat.ino === restoredStat.ino)) {
    fail('Archive inputs must be distinct physical files');
  }

  const scratchRequested = resolve(args.scratchRoot);
  await requireAbsent(scratchRequested, 'Scratch destination already exists; choose a new unique directory');
  const scratchParent = await realpath(dirname(scratchRequested));
  const scratchRoot = join(scratchParent, basename(scratchRequested));
  const resolvedProjectRoot = await realpath(projectRoot);
  const originalDatabase = await realpath(args.originalDatabase);
  if (!(await stat(originalDatabase)).isDirectory()) fail('Original database reference must be an existing directory');
  assertScratchIsolation({
    projectRoot: resolvedProjectRoot,
    scratchRoot,
    originalDatabase,
    archiveDirectories: [dirname(sourceArchive), dirname(restoredArchive)],
  });
  return { sourceArchive, restoredArchive, scratchRoot, originalDatabase };
}

async function digestArchive(
  archivePath: string,
  dataDir: string,
  openArchive: NonNullable<CliDependencies['openArchive']>,
  readDigest: NonNullable<CliDependencies['readDigest']>,
) {
  await requireAbsent(dataDir, 'Verifier scratch database directory already exists');
  const bytes = await readFile(archivePath);
  if (bytes.length === 0) fail('Archive is empty');
  const db = await openArchive(archivePath, dataDir, bytes);
  let digest: DatabaseDigest | undefined;
  let closeError: unknown;
  try {
    digest = await readDigest(db);
  } finally {
    try { await db.close(); } catch (error) { closeError = error; }
  }
  if (closeError) fail('PGlite scratch instance did not close cleanly');
  if (!digest) fail('Database digest is incomplete');
  return digest;
}

const defaultOpenArchive: NonNullable<CliDependencies['openArchive']> = async (_archivePath, dataDir, bytes) => {
  const safeBytes = new Uint8Array(bytes.length);
  safeBytes.set(bytes);
  return PGlite.create({ dataDir, loadDataDir: new Blob([safeBytes.buffer]) });
};

export async function runBackupDigestCli(argv: string[], dependencies: CliDependencies = {}): Promise<CliResult> {
  try {
    const args = parseArgs(argv);
    const projectRoot = dependencies.projectRoot ?? defaultProjectRoot;
    const getVersion = dependencies.getPgliteVersion ?? (async () => {
      const pkg = JSON.parse(await readFile(join(projectRoot, 'node_modules', '@electric-sql', 'pglite', 'package.json'), 'utf8')) as { version?: string };
      return pkg.version ?? '';
    });
    if (await getVersion() !== '0.5.10') fail('Verifier requires installed PGlite 0.5.10');
    const paths = await validateInputs(args, projectRoot);
    // Exclusive mkdir ensures this run cannot reuse or overwrite scratch state.
    await mkdir(paths.scratchRoot);
    const openArchive = dependencies.openArchive ?? defaultOpenArchive;
    const readDigest = dependencies.readDigest ?? readDatabaseDigest;
    const comparison = await compareSnapshotReaders(
      () => digestArchive(paths.sourceArchive, join(paths.scratchRoot, 'source-snapshot'), openArchive, readDigest),
      () => digestArchive(paths.restoredArchive, join(paths.scratchRoot, 'restored-snapshot'), openArchive, readDigest),
    );
    if (!comparison.matches) {
      return {
        exitCode: 2,
        stdout: `ARCHIVE_CONTENTS_MISMATCH tables=${comparison.mismatchedTables.join(',') || 'none'} schema=${comparison.schemaMatches ? 'match' : 'mismatch'} migration=${comparison.migrationMatches ? 'match' : 'mismatch'}`,
      };
    }
    return {
      exitCode: 0,
      stdout: `ARCHIVE_CONTENTS_MATCH tables=${comparison.tableCount} rows=${comparison.rowCount}; this comparison does not prove that a restore occurred`,
    };
  } catch {
    // Do not print paths, SQL, row values, or engine errors; partial reads never emit a match.
    return { exitCode: 1, stderr: 'VERIFY_FAILED no complete archive-content comparison was produced' };
  }
}

async function main() {
  const result = await runBackupDigestCli(process.argv.slice(2));
  if (result.stdout) console.log(result.stdout);
  if (result.stderr) console.error(result.stderr);
  process.exitCode = result.exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) void main();
