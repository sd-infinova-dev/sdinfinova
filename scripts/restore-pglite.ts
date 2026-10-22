import { spawnSync } from 'node:child_process';
import { PGlite } from '@electric-sql/pglite';
import { lstat, mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readDatabaseDigest } from '../src/server/backupDigest';

type RestoreArgs = {
  archive: string;
  originalDatabase: string;
  restoreDirectory: string;
  reexportArchive: string;
  digestScratchRoot: string;
  confirmedDestination: string;
};

type RestoreDb = {
  exec(sql: string): Promise<unknown>;
  close(): Promise<void>;
  dumpDataDir(compression: 'gzip'): Promise<Blob>;
};

export type RestoreDependencies = {
  projectRoot?: string;
  platform?: NodeJS.Platform;
  getPgliteVersion?: () => Promise<string>;
  inspectPath?: (path: string, allowMissingLeaf: boolean) => Promise<{ physicalPath: string; device: number; exists: boolean; isDirectory: boolean; isFile: boolean; links: number }>;
  openArchive?: (archive: string, destination: string, bytes: Uint8Array) => Promise<RestoreDb>;
  verifyDatabase?: (db: RestoreDb) => Promise<unknown>;
};

export type RestoreResult = { exitCode: number; stdout?: string; stderr?: string };

const fail = (message: string): never => { throw new Error(message); };
const defaultProjectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv: string[]): RestoreArgs {
  const names = new Map<string, string>();
  const supported = new Map([
    ['--archive', 'archive'], ['--original-database', 'originalDatabase'],
    ['--restore-directory', 'restoreDirectory'], ['--reexport-archive', 'reexportArchive'],
    ['--digest-scratch-root', 'digestScratchRoot'], ['--confirm-restore-to', 'confirmedDestination'],
  ]);
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!supported.has(key) || names.has(key)) fail('Unknown or duplicate argument');
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) fail('Missing argument value');
    names.set(key, value);
    i += 1;
  }
  const values = Object.fromEntries([...supported].map(([arg, field]) => [field, names.get(arg)])) as Record<keyof RestoreArgs, string | undefined>;
  if (Object.values(values).some((value) => !value)) fail('Required arguments missing');
  if (values.confirmedDestination !== values.restoreDirectory) fail('Destination confirmation must exactly match restore directory');
  return values as RestoreArgs;
}

function isWithin(parent: string, candidate: string): boolean {
  const rel = relative(parent, candidate);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

function assertDisjoint(paths: Array<[string, string]>): void {
  for (let i = 0; i < paths.length; i += 1) {
    for (let j = i + 1; j < paths.length; j += 1) {
      const [left, leftName] = paths[i];
      const [right, rightName] = paths[j];
      if (isWithin(left, right) || isWithin(right, left)) fail(`Unsafe overlapping paths: ${leftName} and ${rightName}`);
    }
  }
}

class ReparsePointRejectedError extends Error {}

type PowerShellResult = { error?: Error | null; status: number | null; stdout: string; stderr: string };
type PowerShellRunner = (script: string) => PowerShellResult;

const runPowerShell: PowerShellRunner = (script) => spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
  encoding: 'utf8', windowsHide: true, timeout: 60000,
}) as PowerShellResult;

function powershellPhysicalPath(target: string, runner: PowerShellRunner = runPowerShell): string {
  const escaped = target.replace(/'/g, "''");
  const script = `$ErrorActionPreference='Stop'; try { $target='${escaped}'; $full=[IO.Path]::GetFullPath($target); $root=[IO.Path]::GetPathRoot($full); $cursor=$root; $tail=$full.Substring($root.Length).Split([IO.Path]::DirectorySeparatorChar,[StringSplitOptions]::RemoveEmptyEntries); for($i=0;$i -lt $tail.Length;$i++){ $next=Join-Path $cursor $tail[$i]; try { $attributes=[IO.File]::GetAttributes($next) } catch [System.IO.FileNotFoundException] { if($i -lt $tail.Length-1){ [Console]::Error.WriteLine('PATH_COMPONENT_MISSING'); exit 18 }; break } catch [System.IO.DirectoryNotFoundException] { if($i -lt $tail.Length-1){ [Console]::Error.WriteLine('PATH_COMPONENT_MISSING'); exit 18 }; break }; if(($attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){ [Console]::Error.WriteLine('REPARSE_POINT_REJECTED'); exit 17 }; $cursor=$next }; $resolved=(Resolve-Path -LiteralPath $cursor -ErrorAction Stop).ProviderPath; [Console]::Out.WriteLine('PHYSICAL_PATH:' + $resolved) } catch { [Console]::Error.WriteLine('PATH_INSPECTION_FAILED'); exit 1 }`;
  const result = runner(script);
  if (result.status === 17 && result.stderr.includes('REPARSE_POINT_REJECTED')) throw new ReparsePointRejectedError('Windows reparse point rejected');
  if (result.status === 18 && result.stderr.includes('PATH_COMPONENT_MISSING')) fail('A required parent path component does not exist');
  if (result.error?.name === 'Timeout' || (result.error as NodeJS.ErrnoException | undefined)?.code === 'ETIMEDOUT') fail('PowerShell path validation timed out');
  if (result.error || result.status !== 0 || !result.stdout.trim()) fail('PowerShell path validation failed');
  const line = result.stdout.trim().split(/\r?\n/).at(-1) || '';
  if (!line.startsWith('PHYSICAL_PATH:') || line.length === 'PHYSICAL_PATH:'.length) fail('Windows physical path was not returned');
  return line.slice('PHYSICAL_PATH:'.length);
}

/** Uses the native PowerShell guard directly; it performs metadata reads only. */
export async function runPathCheckOnly(argv: string[], runner?: PowerShellRunner): Promise<RestoreResult> {
  try {
    if (process.platform !== 'win32') fail('Native Windows path check is available only on Windows');
    const allowed = new Set(['--path-check-only', '--path', '--expect']);
    if (argv[0] !== '--path-check-only') fail('Path-check-only mode must be the first argument');
    const options = new Map<string, string>();
    for (let i = 0; i < argv.length; i += 1) {
      const key = argv[i];
      if (!allowed.has(key) || options.has(key)) fail('Unknown or duplicate path-check argument');
      if (key === '--path-check-only') { options.set(key, ''); continue; }
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) fail('Missing path-check argument value');
      options.set(key, value);
      i += 1;
    }
    const target = options.get('--path') || '';
    const expected = options.get('--expect');
    if (!isAbsolute(target) || (expected !== 'accepted' && expected !== 'reparse-rejected')) fail('Path-check requires an absolute path and a supported expectation');
    const physicalPath = powershellPhysicalPath(target, runner);
    if (expected === 'reparse-rejected') fail('Unexpected acceptance: path is not a rejected reparse point');
    if (!physicalPath) fail('Native Windows guard returned no physical path');
    return { exitCode: 0, stdout: 'PATH_ACCEPTED_BY_NATIVE_WINDOWS_GUARD' };
  } catch (error) {
    if (error instanceof ReparsePointRejectedError && argv.includes('--expect') && argv[argv.indexOf('--expect') + 1] === 'reparse-rejected') {
      return { exitCode: 0, stdout: 'REPARSE_POINT_REJECTED_BY_NATIVE_WINDOWS_GUARD' };
    }
    const reason = error instanceof Error ? error.message : 'unknown validation error';
    return { exitCode: 1, stderr: `PATH_CHECK_FAILED (${reason}); no files or directories were created` };
  }
}

export async function assertNoSymbolicLinkComponents(absolute: string, allowMissingLeaf: boolean): Promise<boolean> {
  const parsed = parse(absolute);
  const segments = absolute.slice(parsed.root.length).split(/[\\/]+/).filter(Boolean);
  let cursor = parsed.root;
  let missing = false;
  for (let i = 0; i < segments.length; i += 1) {
    cursor = join(cursor, segments[i]);
    let info;
    try { info = await lstat(cursor); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || !allowMissingLeaf) throw error;
      missing = true;
      if (i !== segments.length - 1) fail('A missing parent directory cannot be verified');
      break;
    }
    if (info.isSymbolicLink()) fail('Symbolic links and junctions are not permitted in verified paths');
  }
  return missing;
}

export async function inspectRestorePath(input: string, allowMissingLeaf: boolean) {
  const absolute = resolve(input);
  if (!isAbsolute(input)) fail('All paths must be absolute');
  const missing = await assertNoSymbolicLinkComponents(absolute, allowMissingLeaf);
  if (process.platform === 'win32') {
    const verifiedPhysical = powershellPhysicalPath(missing ? dirname(absolute) : absolute);
    const physicalPath = missing ? join(verifiedPhysical, basename(absolute)) : verifiedPhysical;
    const nearest = missing ? await stat(dirname(absolute)) : await stat(absolute);
    return { physicalPath: resolve(physicalPath), device: nearest.dev, exists: !missing, isDirectory: !missing && nearest.isDirectory(), isFile: !missing && nearest.isFile(), links: !missing ? nearest.nlink : 0 };
  }
  if (missing) {
    const parentPath = await realpath(dirname(absolute));
    const parentStat = await stat(parentPath);
    return { physicalPath: join(parentPath, basename(absolute)), device: parentStat.dev, exists: false, isDirectory: false, isFile: false, links: 0 };
  }
  const physicalPath = await realpath(absolute);
  const info = await stat(absolute);
  return { physicalPath, device: info.dev, exists: true, isDirectory: info.isDirectory(), isFile: info.isFile(), links: info.nlink };
}

async function validate(args: RestoreArgs, inspect: NonNullable<RestoreDependencies['inspectPath']>) {
  const [archive, original, destination, reexport, scratch] = await Promise.all([
    inspect(args.archive, false), inspect(args.originalDatabase, false), inspect(args.restoreDirectory, true),
    inspect(args.reexportArchive, true), inspect(args.digestScratchRoot, true),
  ]);
  if (!archive.isFile || archive.links > 1) fail('Archive must be a regular file without hard links');
  if (!original.isDirectory) fail('Original database reference must be an existing directory');
  if (destination.exists || reexport.exists || scratch.exists) fail('Restore and scratch destinations must all be new');
  const paths: Array<[string, string]> = [
    [archive.physicalPath, 'archive'], [original.physicalPath, 'original database'],
    [destination.physicalPath, 'restore destination'], [reexport.physicalPath, 're-export archive'],
    [scratch.physicalPath, 'digest scratch root'],
  ];
  assertDisjoint(paths);
  if (destination.device === original.device || destination.device === archive.device || destination.device === reexport.device || destination.device === scratch.device) {
    fail('Restore destination must be on a distinct verified volume');
  }
  if (reexport.device === original.device || reexport.device === archive.device || scratch.device === original.device || scratch.device === archive.device) {
    fail('Re-export and digest scratch must be physically separate from protected sources');
  }
  return {
    archive: archive.physicalPath, original: original.physicalPath, originalDevice: original.device,
    destination: destination.physicalPath, reexport: reexport.physicalPath, scratch: scratch.physicalPath,
  };
}

async function revalidateImmediatelyBeforeImport(
  args: RestoreArgs,
  inspect: NonNullable<RestoreDependencies['inspectPath']>,
  expected: Awaited<ReturnType<typeof validate>>,
): Promise<void> {
  const [archive, original, destination, reexport, scratch, databasePath] = await Promise.all([
    inspect(args.archive, false), inspect(args.originalDatabase, false), inspect(args.restoreDirectory, false),
    inspect(args.reexportArchive, true), inspect(args.digestScratchRoot, true),
    inspect(join(args.restoreDirectory, 'database'), true),
  ]);
  if (!archive.isFile || archive.links > 1 || !original.isDirectory || !destination.isDirectory || reexport.exists || scratch.exists || databasePath.exists) {
    fail('Path state changed before import');
  }
  if (archive.physicalPath !== expected.archive || original.physicalPath !== expected.original ||
      destination.physicalPath !== expected.destination || reexport.physicalPath !== expected.reexport ||
      scratch.physicalPath !== expected.scratch || databasePath.physicalPath !== join(expected.destination, 'database')) {
    fail('Physical path identity changed before import');
  }
  assertDisjoint([
    [archive.physicalPath, 'archive'], [original.physicalPath, 'original database'],
    [destination.physicalPath, 'restore destination'], [reexport.physicalPath, 're-export archive'],
    [scratch.physicalPath, 'digest scratch root'],
  ]);
  assertDisjoint([
    [databasePath.physicalPath, 'restore database path'], [archive.physicalPath, 'archive'],
    [original.physicalPath, 'original database'], [reexport.physicalPath, 're-export archive'],
    [scratch.physicalPath, 'digest scratch root'],
  ]);
  if (destination.device === original.device || destination.device === archive.device || destination.device === reexport.device || destination.device === scratch.device ||
      reexport.device === original.device || reexport.device === archive.device || scratch.device === original.device || scratch.device === archive.device) {
    fail('Physical separation changed before import');
  }
}

const defaultOpenArchive: NonNullable<RestoreDependencies['openArchive']> = async (_archive, destination, bytes) => {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return PGlite.create({ dataDir: destination, loadDataDir: new Blob([copy.buffer]) });
};

export async function runPgliteRestoreWrapper(argv: string[], dependencies: RestoreDependencies = {}): Promise<RestoreResult> {
  let db: RestoreDb | undefined;
  try {
    if ((dependencies.platform ?? process.platform) !== 'win32') fail('Restore wrapper is Windows-only');
    const args = parseArgs(argv);
    const projectRoot = dependencies.projectRoot ?? defaultProjectRoot;
    const getVersion = dependencies.getPgliteVersion ?? (async () => {
      const pkg = JSON.parse(await readFile(join(projectRoot, 'node_modules', '@electric-sql', 'pglite', 'package.json'), 'utf8')) as { version?: string };
      return pkg.version ?? '';
    });
    if (await getVersion() !== '0.5.10') fail('Wrapper requires installed PGlite 0.5.10');
    const inspect = dependencies.inspectPath ?? inspectRestorePath;
    const paths = await validate(args, inspect);
    const archiveBytes = await readFile(paths.archive);
    if (!archiveBytes.length) fail('Archive is empty');

    // Exclusive creation occurs only after every input and destination has passed physical-path checks.
    await mkdir(paths.destination);
    const postCreate = await inspect(paths.destination, false);
    if (!postCreate.isDirectory || postCreate.physicalPath !== paths.destination || postCreate.device === paths.originalDevice) {
      fail('New restore destination failed post-create physical isolation verification');
    }

    // Revalidation narrows the race window; it cannot eliminate hostile concurrent path replacement.
    await revalidateImmediatelyBeforeImport(args, inspect, paths);
    db = await (dependencies.openArchive ?? defaultOpenArchive)(paths.archive, join(paths.destination, 'database'), archiveBytes);
    await (dependencies.verifyDatabase ?? readDatabaseDigest)(db as never);
    const exported = await db.dumpDataDir('gzip');
    const bytes = new Uint8Array(await exported.arrayBuffer());
    if (!bytes.length) fail('Restored database re-export is empty');
    await db.close();
    db = undefined;
    await writeFile(paths.reexport, bytes, { flag: 'wx' });
    return {
      exitCode: 0,
      stdout: 'RESTORE_CANDIDATE_READY_FOR_SEPARATE_ARCHIVE_COMPARISON; this is not proof of complete production recovery',
    };
  } catch {
    if (db) {
      try { await db.close(); } catch { /* Retain all new scratch data for the operator. */ }
    }
    return { exitCode: 1, stderr: 'RESTORE_WRAPPER_FAILED; scratch data retained' };
  }
}

/** The executable CLI is deliberately limited to metadata-only path checks. */
export async function runRestoreCli(argv: string[]): Promise<RestoreResult> {
  if (argv[0] === '--path-check-only') return runPathCheckOnly(argv);
  return { exitCode: 1, stderr: 'RESTORE_DISABLED; executable CLI supports path checks only' };
}

async function main() {
  const argv = process.argv.slice(2);
  const result = await runRestoreCli(argv);
  if (result.stdout) console.log(result.stdout);
  if (result.stderr) console.error(result.stderr);
  process.exitCode = result.exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) void main();
