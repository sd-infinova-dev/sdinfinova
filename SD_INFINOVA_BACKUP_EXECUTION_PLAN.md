# SD Infinova — Existing Data Backup and Isolated Restore Plan

> **RESTORE IS DISABLED — DO NOT EXECUTE ANY RESTORE/IMPORT COMMANDS IN THIS DOCUMENT.** A candidate wrapper now exists at `scripts/restore-pglite.ts`, including a native PowerShell path-only mode and a synthetic valid-archive round-trip test. These checks do not establish the intended host's physical volume mapping, provider storage independence, ACL immutability, or behavior for every Windows reparse-point type. Keep restoration blocked pending review of the test results and independent provider/operator confirmation.

**Prepared:** 2026-10-22 (Asia/Kathmandu)  
**Project:** `D:\SD Infinova\sdinfinova`  
**Verdict:** **NOT READY**. This is a plan, not a completed backup or restore. The existing database was not opened, and no files were copied.

**Execution-safety review (2026-10-22):** reviewed the CMD/PowerShell blocks and installed package API declarations. The digest verifier and tests have since been revised for timestamp precision, schema features, CLI failure paths, and archive-only result wording. They have not been run against a real backup or restore. Owner confirmation of all paths/writers and destination encryption remains required; the full backup procedure remains NOT READY.

## Scope and safety result

This review was limited to the prior preservation and backup reports, source code, installed package declarations, package version metadata, Git status, and environment-variable **names**, plus synthetic temporary PGlite/archive tests. No application/server was started, no real database or media was opened, no production path or secret value was accessed, and no real migration, seed, backup, restore, credential operation, installation, or deployment was run. Existing staged/unstaged/untracked changes were preserved.

**Synthetic verification record (2026-10-22):** `npm.cmd exec -- tsx --test tests/backup-digest.test.ts tests/restore-pglite.test.ts` passed **38/38** tests. This included temporary synthetic PGlite archive comparison/import/export, schema and record mismatch cases, failure paths, native PowerShell acceptance for an ordinary file/directory, and native junction rejection. Directory symbolic-link creation was unavailable; mount points and other reparse types were not tested. Injected failure tests do not replace those native checks. `npm.cmd run lint` passed (`tsc --noEmit`); `git diff --check` passed. These are code/test results only: they do not constitute a real backup, restore, or production recovery.

| Resource                                  | Finding                                                                                                                                                                                                                                                            | Status                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Engine                                    | PGlite (embedded PostgreSQL), installed `@electric-sql/pglite@0.5.10`; `package.json` declares `^0.5.10`. `npm.cmd ls @electric-sql/pglite --depth=0` returned 0.                                                                                                  | Confirmed from package metadata                                               |
| Workspace database candidate              | Source fallback resolves to `D:\SD Infinova\sdinfinova\data\postgres` when `PGLITE_DATA_DIR` is unset. Earlier metadata-only enumeration found this directory.                                                                                                     | Candidate path only; active path and DB contents NOT VERIFIED                 |
| Production database path                  | Production source requires an absolute existing `PGLITE_DATA_DIR` before initialization. Current host/process configuration is unavailable.                                                                                                                        | NOT VERIFIED                                                                  |
| Upload implementation                     | `src/server/api.ts` resolves one local directory from `UPLOADS_DIR`, falling back to `path.join(process.cwd(), 'public/uploads')`; `/uploads` serves that same directory (`server.ts`).                                                                            | Confirmed from source                                                         |
| Workspace uploads candidate               | `public\uploads` is only the fallback when process CWD is the project root. Prior metadata check found it empty.                                                                                                                                                   | Candidate only; active media directory NOT VERIFIED                           |
| `.env` and current process names          | Prior safe name-only inspection found `.env` has `PORT` and `PGLITE_IN_MEMORY`; no `PGLITE_DATA_DIR` or `UPLOADS_DIR` keys. This turn’s first attempted CMD inline Node check failed to parse, so it supplied no new environment evidence. No values were printed. | Prior report evidence only; effective host/runtime configuration NOT VERIFIED |
| Backup / restore                          | None made or tested.                                                                                                                                                                                                                                               | NOT VERIFIED                                                                  |
| Host persistent storage / writer topology | Provider is not selected in available project documentation.                                                                                                                                                                                                       | NOT VERIFIED                                                                  |

## Line-by-line execution-safety findings

| Plan location / command                   | Review                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Safe correction or remaining gate                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CMD backup procedure` preflight          | CMD quoting of paths with spaces is valid because path assignments and uses are quoted. The original conditional `(...)` examples were fragile when pasted interactively.                                                                                                                                                                                                                                                                                                                                                                                                                                   | The backup commands now use labels and `goto`; save and review the block as a `.cmd` script and run it as a batch file. Never paste a partial block into an unrelated shell.                                                                                                                                                                            |
| `PGlite backup method` and export command | Installed declarations confirm `create(options)`, `dumpDataDir('gzip')`, `loadDataDir`, and `close()`. No database was instantiated to test lifecycle.                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Use export only after all-writer shutdown is established. Export writes a new archive using exclusive `wx`, checks the source `PG_VERSION`, and rejects source/destination overlap.                                                                                                                                                                     |
| Export completion marker                  | The former command could leave a partial archive without distinguishing it from a completed export.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | The corrected export writes its completion metadata only after dump bytes are written, hashed, and `close()` succeeds. The marker is explicitly database-export-only; `INCOMPLETE.txt` remains until media checks and isolated restore pass. A full `BACKUP_VERIFIED.txt` is a separate owner-approved final step.                                      |
| New/off-host/encrypted destination        | A new directory check alone cannot prove encryption or that a different drive is off-host.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Require an owner attestation before directory creation. A separate drive letter alone does not pass. Confirm encryption and off-host status with the destination provider; CMD cannot universally prove either.                                                                                                                                         |
| Media source enumeration/copy             | The source code supports one configured local path, but active and historical media sources are unknown. The original command copied one candidate only and did not compare counts.                                                                                                                                                                                                                                                                                                                                                                                                                         | Resolve every active/local/external media source first. Copy each local source into its own numbered destination; export external stores separately. Compare file count plus relative path, size, and SHA-256 for every pair. Unknown or unmatched sources mean incomplete backup.                                                                      |
| Restore path / import command             | `scripts/restore-pglite.ts` requires absolute paths, checks every existing path component, rejects symlinks/junctions and hard-linked archives, uses PowerShell to reject Windows reparse points and resolve physical paths, rejects overlaps and same-volume restore targets, requires exact destination confirmation, creates a new destination exclusively, and revalidates immediately before import. Synthetic native Windows tests exercise ordinary paths and junction rejection. Directory symbolic-link creation was unavailable; mount points and provider-specific reparse tags were not tested. | **Blocked.** Do not run any restore command until the owner reviews the native test results, confirms access-restricted destination parent/provider storage independence, and resolves unsupported reparse-type checks.                                                                                                                                 |
| Integrity comparison                      | Earlier inline queries showed counts and aggregates only; they did not compare full application records.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `scripts/verify-backup-digest.ts` now compares full-record SHA-256 digests, schema, constraints/indexes, and migration records from the source snapshot archive and a re-export of the isolated restored database. Synthetic tests pass; real backup/restore comparison remains **NOT VERIFIED**, and no full-backup marker is allowed until it passes. |
| Writers/open handles                      | `tasklist` or process exit alone cannot prove no other process/replica has an open PGlite file.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Identify all writers via service/deployment topology, stop each through its owner, verify PIDs exited, and have the host administrator inspect open handles/provider mounts with an approved tool. If any writer or handle remains uncertain, stop.                                                                                                     |
| Destructive commands                      | No delete, move, rename, clean, overwrite, migration, or production restore command was run. The executable restore CLI is disabled. Backup/export instructions are future owner-gated procedures.                                                                                                                                                                                                                                                                                                                                                                                                          | Keep every destination new and separate. On any failure, retain partial output for owner review; never reuse or overwrite it.                                                                                                                                                                                                                           |

**Review disposition:** corrections improve static execution safety, but environment/provider confirmation, a full content-digest verifier, and external writer/handle verification remain gates. No command block in this plan was executed.

### Git preservation

At this review, `git status --short --untracked-files=all` showed `package-lock.json` staged as added, the existing tracked source/config modifications, prior reports/tests and several untracked root entries. No Git operation modified this state. See the terminal status output in the working session; this plan deliberately does not repeat or stage those paths. The lockfile is not data. A complete secret audit of Git history was not performed.

## PGlite backup method

The installed package is `@electric-sql/pglite@0.5.10`. Its installed declaration exposes `dumpDataDir(compression?: DumpTarCompressionOptions): Promise<File | Blob>`, `PGlite.create(dataDir?, options?)`, `PGlite.create(options?)`, `close(): Promise<void>`, and the `loadDataDir?: Blob | File` option (`node_modules/@electric-sql/pglite/dist/pglite-C1eAkqkG.d.ts:506,525,539,969-980,1102`). The inline examples below use Node's `Blob`, `File`-compatible input, `PGlite.create({dataDir, loadDataDir})`, and `await db.close()`. Upstream documents the dump as a tarball to reload using `loadDataDir`, and warns it is intended for PGlite rather than arbitrary PostgreSQL versions. References: [PGlite API, constructor and `loadDataDir`](https://github.com/electric-sql/pglite/blob/main/docs/docs/api.md#main-constructor), [PGlite `close` and `dumpDataDir`](https://github.com/electric-sql/pglite/blob/main/docs/docs/api.md#dumpdatadir). The upstream page is current documentation, not version-pinned 0.5.10 documentation; installed declarations confirm the local API shapes. No runtime API test was performed.

**Recommendation:** use PGlite’s `dumpDataDir()` export as the primary database backup format, then restore it only through `loadDataDir` into a new, empty disposable data directory. Do not treat the archive as a native PostgreSQL `pg_dump` file.

The project has no repository backup utility. No PGlite documentation was found in this inspection that explicitly certifies arbitrary cold directory copying as the preferred backup method. A cold filesystem copy can be retained as a secondary snapshot only after the actual writer is gracefully stopped and PGlite has closed; never copy a live directory. For a verifiable first backup, prefer the documented export API and a tested `loadDataDir` restore. Do not open the real path with a second PGlite instance while the app is running. Opening it in a one-shot maintenance process can perform engine recovery/bookkeeping; authorize that maintenance window and use the matching installed package before executing the procedure below.

## Find every actual media source without guessing

The current code supports a single local `UPLOADS_DIR`, but that does not prove where existing media is located. `UPLOADS_DIR` may differ by host, service manager, deployment revision, process working directory, or secret/config store. Media may also exist in a prior upload location or external provider not represented by current source. The repo’s default folder being empty is not evidence that no production media exists.

Before backup, the service owner must:

1. Identify every application/service/process that can open this data directory, including scheduled tasks, maintenance jobs, background workers, and another host/replica. Identify it by the service manager and deployment topology, not by counting `node.exe` processes. Gracefully stop every authorized writer through its owner/service manager, then verify the owning process IDs have exited and the service manager reports stopped. A process-list command such as `tasklist` alone does **not** prove that no process has an open handle to a database file. If the host is Windows, have the administrator verify open handles with an approved handle-inspection tool (for example, Microsoft Sysinternals Handle if already approved/available) or an equivalent provider-level method; do not install tools as part of this procedure. If any handle, writer, or remote replica cannot be ruled out, do not export/copy.
2. Resolve the **effective** `PGLITE_DATA_DIR`, `UPLOADS_DIR`, and process working directory from the owner-controlled runtime configuration. Record resolved paths in a restricted backup manifest; do not paste secret values into a terminal transcript or report. The environment-variable name inspection alone cannot reveal a provider secret-store value or a running process’s effective configuration.
3. On a restored database copy, reconcile `media_assets.filename`/`url` and project/blog image references with files in candidate media locations. Do not infer the active directory from the default. Preserve all candidate media sources until the owner confirms reconciliation.
4. If records reference files outside the configured upload directory (for example `/assets/...`), identify whether those are versioned public assets or external URLs. Include any required non-Git asset store in the recovery scope.

If the effective source paths or service writer cannot be established, stop. Do not run the backup command with the workspace fallback as a guess.

## Safe to do now vs. gated actions

### Safe now

- Review code/docs and lockfile metadata without starting the app.
- Ask the hosting/data owner to identify the runtime paths, provider, writer, and approved off-host destination.
- Select a new encrypted destination on a separate volume/account and a unique backup ID; check only that it does not already exist.
- Prepare a maintenance window, access controls, retention, and a named recovery operator.

### Wait until exact paths and writer are confirmed

- Stop the correct app cleanly through its service manager and verify it exited. Do not use `taskkill /IM node.exe`.
- Run the PGlite export only with the confirmed source path, using the installed 0.5.10 package and no app imports. It opens the source engine; it does not call application migrations or seeds, but the storage owner must accept engine recovery/bookkeeping risk.
- Copy all confirmed media sources while application writes remain stopped. Keep writes stopped until export and copies are verified to represent one maintenance snapshot.
- Restore the export to a distinct empty location and perform read-only checks against that disposable copy.

## CMD backup procedure (operator-run later; NOT RUN)

Use an approved encrypted **off-host** destination for `BACKUP_ROOT`; a different drive letter on the same computer is not off-host. The `E:` path below is illustrative only and is not evidence of encryption or off-host storage. Confirm encryption and access controls with the storage/provider owner before proceeding; `manage-bde -status` can help inspect BitLocker for a local Windows volume but cannot prove that a mapped/cloud destination is encrypted. Replace all source paths with runtime-owner-confirmed paths. Use a fresh unique timestamp and stop if any destination exists. Combine the consecutive CMD backup blocks (preflight, export, and media copy) into one reviewed `.cmd` file so environment variables, labels, and failure branches remain in scope; run that file from CMD. Likewise combine the restore setup and import blocks into one separate reviewed `.cmd`. Do not paste a partial block into an interactive prompt. Do not place any backup under the repo, DB, or media source.

```cmd
cd /d "D:\SD Infinova\sdinfinova"
set "DB_SOURCE=D:\REPLACE\WITH\CONFIRMED\PGLITE_DATA_DIR"
set "MEDIA_SOURCE_01=D:\REPLACE\WITH\CONFIRMED\UPLOADS_DIR"
set "BACKUP_ROOT=E:\SDInfinovaBackups\sdinfinova\20261022-REPLACE-WITH-NEW-TIME"
if exist "%BACKUP_ROOT%" goto :destination_exists
if not exist "%DB_SOURCE%\PG_VERSION" goto :bad_db_source
if not exist "%MEDIA_SOURCE_01%\NUL" goto :bad_media_source
rem Owner must already have attested this destination is encrypted and off-host.
set /p "BACKUP_APPROVAL=Type APPROVED after confirming paths, stopped writers, off-host destination, and encryption: "
if /I not "%BACKUP_APPROVAL%"=="APPROVED" goto :not_approved
mkdir "%BACKUP_ROOT%"
if errorlevel 1 goto :mkdir_failed
>"%BACKUP_ROOT%\INCOMPLETE.txt" echo Backup is incomplete until restore drill and verification pass.
if errorlevel 1 goto :marker_failed
goto :preflight_done
:destination_exists
echo STOP: destination already exists; choose a new backup ID.
exit /b 1
:bad_db_source
echo STOP: existing PGlite PG_VERSION marker not found at confirmed source.
exit /b 1
:bad_media_source
echo STOP: confirmed media source directory not found.
exit /b 1
:not_approved
echo STOP: owner approval not supplied.
exit /b 1
:mkdir_failed
echo STOP: could not create new backup directory.
exit /b 1
:marker_failed
echo STOP: could not mark backup incomplete; do not continue.
exit /b 1
:preflight_done
```

The following export is intentionally a separate step. First confirm the correct application writer is stopped and the source path was approved. This command is a template; review it before use. It refuses if the archive/manifest exists, verifies `PG_VERSION`, and checks the archive destination is inside the new backup root and disjoint from the source before calling PGlite, reducing (but not eliminating) a path mistake. `PGlite.create` opens the real directory; it must not be run during this audit or while another writer is active. It does not import `server.ts`, call `initDatabase`, run migrations, or run application seeding. Its `database-export.complete.json` and success text mean only that the database archive was fully written, hashed, and the PGlite handle closed. They do **not** mean the media copy or full backup is verified. Preserve the `INCOMPLETE.txt` marker until the separate restore and all integrity checks pass; only then may the owner create a distinct `BACKUP_VERIFIED.txt` after approval.

```cmd
set "PGLITE_DATA_DIR=%DB_SOURCE%"
set "DB_ARCHIVE=%BACKUP_ROOT%\pglite-data.tar.gz"
if exist "%DB_ARCHIVE%" goto :archive_exists
node --input-type=module -e "import { PGlite } from '@electric-sql/pglite'; import { createHash } from 'node:crypto'; import { existsSync } from 'node:fs'; import { readFile, writeFile } from 'node:fs/promises'; import { isAbsolute, join, relative, resolve, sep } from 'node:path'; const rawSrc=process.env.PGLITE_DATA_DIR, rawOut=process.env.DB_ARCHIVE, rawRoot=process.env.BACKUP_ROOT; if(!rawSrc||!rawOut||!rawRoot) throw new Error('Required path configuration missing'); const src=resolve(rawSrc), out=resolve(rawOut), root=resolve(rawRoot); const inside=(a,b)=>{const r=relative(a,b);return r===''||(!r.startsWith('..'+sep)&&r!=='..'&&!isAbsolute(r))}; if(!existsSync(join(src,'PG_VERSION'))) throw new Error('PG_VERSION marker missing'); if(!inside(root,out)||inside(src,out)||inside(out,src)) throw new Error('Unsafe source/destination path overlap'); if(existsSync(out)||existsSync(join(root,'source-aggregate-manifest.json'))||existsSync(join(root,'database-export.complete.json'))) throw new Error('An export destination artifact already exists'); const db=await PGlite.create(src); let complete; try { await db.exec('BEGIN READ ONLY'); const tables=['schema_migrations','admin_users','admin_sessions','projects','services','blog_posts','contact_inquiries','media_assets','site_settings','page_views']; const counts={}; for(const t of tables){const r=await db.query('SELECT count(*)::int AS n FROM public.'+t);counts[t]=r.rows[0].n} const migrations=await db.query('SELECT version FROM public.schema_migrations ORDER BY version'); const admins=await db.query('SELECT role,must_change_password,count(*)::int AS n FROM public.admin_users GROUP BY role,must_change_password ORDER BY role,must_change_password'); await db.exec('ROLLBACK'); await writeFile(join(root,'source-aggregate-manifest.json'),JSON.stringify({pglite:'0.5.10',counts,migrations:migrations.rows.map(x=>x.version),adminState:admins.rows}),{flag:'wx'}); const tar=await db.dumpDataDir('gzip'); await writeFile(out,new Uint8Array(await tar.arrayBuffer()),{flag:'wx'}); const bytes=await readFile(out); complete={archive:'pglite-data.tar.gz',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}; } finally { await db.close(); } await writeFile(join(root,'database-export.complete.json'),JSON.stringify(complete),{flag:'wx'}); console.log('PGLITE_EXPORT_COMPLETE');"
if errorlevel 1 goto :export_failed
goto :export_done
:archive_exists
echo STOP: archive already exists; choose a new backup ID.
exit /b 1
:export_failed
echo STOP: PGlite export failed or incomplete. Keep INCOMPLETE marker and all files; do not retry into this destination.
exit /b 1
:export_done
```

Then copy each confirmed active media source to its own new numbered subdirectory and check each `robocopy` result immediately. Example for source 01 follows; repeat for 02, 03, and every other confirmed local media directory, and separately export any external object store. If any required source cannot be enumerated or snapshotted, the backup is incomplete. Do not use `/MIR`, `/PURGE`, or overwrite flags.

```cmd
mkdir "%BACKUP_ROOT%\media-01"
if errorlevel 1 goto :media_dir_failed
robocopy "%MEDIA_SOURCE_01%" "%BACKUP_ROOT%\media-01" /E /COPY:DAT /DCOPY:DAT /R:2 /W:2 /XJ
if errorlevel 8 goto :media_copy_failed
certutil -hashfile "%DB_ARCHIVE%" SHA256
if errorlevel 1 goto :archive_hash_failed
goto :media_copy_done
:media_dir_failed
echo STOP: unable to create media destination.
exit /b 1
:media_copy_failed
echo STOP: media copy failed; preserve source and investigate.
exit /b 1
:archive_hash_failed
echo STOP: archive hash failed.
exit /b 1
:media_copy_done
```

Robocopy codes 0–7 mean the file operation completed (including differences/copies); 8 or greater is failure. Record its actual code before subsequent commands. Hash the media source and destination by relative path, file length, and SHA-256 with the PowerShell routine below. It emits no file contents. Save the resulting manifest and source/destination path record inside the access-controlled backup folder (or its restricted metadata store), not in Git. If paths or filenames are considered sensitive, protect the manifest equivalently to the backup.

For each confirmed source, use a distinct destination (`media-01`, `media-02`, etc.) and run this pattern, which checks both file count and sorted relative-path/length/SHA-256 manifests. A count/hash mismatch must stop verification; preserve all copies and do not write a verified marker.

```powershell
$source = 'D:\REPLACE\WITH\CONFIRMED\UPLOADS_DIR'
$destination = "$env:BACKUP_ROOT\media-01"
function Get-TreeManifest([string]$Root) {
  $base = (Resolve-Path -LiteralPath $Root).Path.TrimEnd('\')
  Get-ChildItem -LiteralPath $base -File -Recurse -Force | ForEach-Object {
    $relative = $_.FullName.Substring($base.Length).TrimStart('\')
    $hash = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
    "$relative|$($_.Length)|$hash"
  } | Sort-Object
}
$src = @(Get-TreeManifest $source)
$dst = @(Get-TreeManifest $destination)
if ($src.Count -ne $dst.Count) { throw 'MEDIA_FILE_COUNT_MISMATCH; preserve all copies' }
if (@(Compare-Object $src $dst).Count -ne 0) { throw 'MEDIA_HASH_MISMATCH; preserve all copies' }
'MEDIA_FILE_COUNT_AND_HASH_MATCH'
```

Repeat for **every** confirmed media directory and external media export. The prior `$env:MEDIA_SOURCE` snippet cannot be used as written because the procedure sets `MEDIA_SOURCE` in CMD, not in the separate PowerShell process; pass the resolved path explicitly as above without printing secrets. A final `BACKUP_VERIFIED` marker must not be created until every source has a matching copy and the isolated restore passes.

For empty trees, verify the expected empty condition explicitly. Do not delete or alter any source because a mismatch occurs. A SHA-256 of `pglite-data.tar.gz` verifies the archive bytes for later transfer/copy comparison; only successful isolated import and logical checks demonstrate database recoverability. Retain the source unchanged and leave the app stopped until both database archive and media verification complete.

## Isolated restore drill — **BLOCKED; COMMANDS BELOW MUST NOT BE RUN**

### Restore wrapper status — executable restore is disabled

`scripts/restore-pglite.ts` contains a synthetic-tested restore function, but the executable CLI now accepts only `--path-check-only`. Any restore/import arguments return nonzero with `RESTORE_DISABLED`; the CLI does not create a restore destination or import an archive. Do not call `runPgliteRestoreWrapper()` from another script except the isolated synthetic tests. Re-enabling actual restore execution requires a separate reviewed change after the owner/provider gates below are satisfied. No restore command is provided here.

**Windows limitation:** Node path resolution plus a PowerShell `FileAttributes.ReparsePoint` walk cannot prove cloud-provider physical-volume identity, remote aliasing, ACL immutability, or protect against a privileged concurrent process replacing a parent between checks and import. The restore function revalidates paths immediately before import, which narrows but does not eliminate that race. Different volume identifiers are a local guard only. The owner must use an access-restricted, owner-controlled parent and independently confirm provider backing, encryption, off-host placement, and storage independence. If these cannot be established, fail closed and do not restore.

### Native Windows path-only validation (no restore)

The CLI mode below invokes the default PowerShell physical-path/reparse-point inspector directly. It performs metadata reads only. It cannot create a destination, open PGlite, import an archive, or enter the restore workflow. Run it only with disposable synthetic paths; never substitute real database, media, or backup paths.

```cmd
cd /d "D:\SD Infinova\sdinfinova"
node --import tsx scripts/restore-pglite.ts --path-check-only --path "C:\TEMP\synthetic\ordinary-file.txt" --expect accepted
node --import tsx scripts/restore-pglite.ts --path-check-only --path "C:\TEMP\synthetic\ordinary-directory" --expect accepted
node --import tsx scripts/restore-pglite.ts --path-check-only --path "C:\TEMP\synthetic\junction\child" --expect reparse-rejected
```

The operator must first prepare these paths under a new temporary test root, with an ordinary file/directory and a junction (and a symbolic link or other reparse type only where safely supported). Expected output is `PATH_ACCEPTED_BY_NATIVE_WINDOWS_GUARD` for ordinary paths and `REPARSE_POINT_REJECTED_BY_NATIVE_WINDOWS_GUARD` for a reparse path. An unexpected acceptance, malformed/relative path, PowerShell error, or timeout must return nonzero. Do not use the full restore command for path testing. Any test-path cleanup is a separate operator action after confirming the exact disposable path; no automatic cleanup is part of the wrapper.

Native test evidence (2026-10-22): the current Windows host accepted a synthetic ordinary directory and file and rejected a synthetic junction through the PowerShell guard. Directory symbolic-link creation was unavailable on this host. PowerShell error and timeout handling were tested with synthetic injected process results, not by forcing a native PowerShell timeout. Mount points, cloud placeholders, and other provider-specific reparse tags remain **NOT VERIFIED**. This path check does not prove volume independence or eliminate concurrent replacement races.

### Owner-controlled parent and race precautions

Before any future controlled restore, the owner must create/select the destination parent, verify its ACL restricts modification to the authorized operator/service, and prevent concurrent writers from changing its path components during the operation. The wrapper revalidates source archive, original reference, destination, output paths, and the new database child immediately before import, but path replacement by a privileged/concurrent process can still race validation and use. Separate `stat.dev` values do not prove independent physical backing. Require provider/operator confirmation of the actual volume mapping and off-host encrypted storage; if physical separation cannot be established independently, stop.

### Retired legacy restore instructions

The former inline CMD/PowerShell copy-and-import examples are withdrawn. They did not enforce the candidate wrapper's full path checks and must not be used. The executable restore CLI is disabled: it accepts only metadata-only `--path-check-only` requests; all restore/import arguments fail before destination creation or PGlite import. Do not invoke the exported restore function outside the synthetic test suite.

A future restore requires a separately reviewed re-enable change, owner authorization, an owner-controlled ACL-restricted parent, confirmed stopped writers, a verified encrypted off-host backup, provider confirmation of storage independence and PGlite single-writer semantics, and a separate new destination. The wrapper's revalidation narrows but cannot eliminate TOCTOU races. Retain failed scratch data for owner review; never overwrite or automatically clean recovery data.

Before any future test, verify every resolved source, archive, destination, output, and scratch path; reject any collision or reparse point; confirm capacity; and ensure all output destinations are new. Different volume IDs are only a local guard. If a path or physical-storage identity cannot be independently confirmed, stop.

## Full-record digest verifier (implemented; real-data verification NOT RUN)

`src/server/backupDigest.ts` implements deterministic SHA-256 digests. `scripts/verify-backup-digest.ts` accepts only two regular archive files and a new scratch destination; it does not accept a database-directory argument for either snapshot. The `--original-database` argument is resolved/stat’ed only for path-separation checks. The utility reads the source backup archive and the re-export produced from the isolated restored DB, then imports both archives into separate child directories under a new scratch root. It refuses an existing scratch root, a root in the repository, a root overlapping the original DB path, or a root overlapping either archive directory. It never writes a backup marker, archive, or report file. The only writes are the new PGlite scratch imports; these may contain the full sensitive data and must be on an approved access-controlled encrypted scratch volume. The tool does not delete scratch files; cleanup requires a separate owner-approved retention action.

Canonicalization and inclusion rules:

- Every ordinary/base table in `public` is included, including `schema_migrations`, `admin_users`, `admin_sessions`, `projects`, `services`, `blog_posts`, `contact_inquiries`, `media_assets`, `site_settings`, `page_views`, and `admin_activity_logs`. Any additional public base table is included automatically.
- Every public base table, column, primary key, nullability/default metadata, constraint definition, index definition, row, RLS enabled/forced flag, policy definition, and non-internal trigger plus trigger-function definition is included. Public sequence configuration/current state and public ordinary function/procedure definitions are included as schema objects. Public views/materialized views/foreign tables, aggregate/window routines, and standalone domain/enum/range/multirange types fail closed as unsupported. Application source inspection found no use of these unsupported object types. ACL/grants, object owners, extensions, non-public schemas, event triggers, collations, host configuration, and external services are excluded and require separate review. Row counts are checked against a separate `count(*)` result; mismatch fails closed.
- SQL casts cells to text before Node canonicalization. PostgreSQL timestamp strings normalize without passing fractional seconds through JavaScript `Date`, preserving sub-millisecond precision; timestamptz offsets normalize to UTC while timestamp without timezone retains wall time. A JavaScript `Date` cannot represent PostgreSQL sub-millisecond precision; callers must use database text values for lossless comparison. Null is distinct from text `null`; integer/numeric values normalize decimal exponent/trailing-zero forms; JSON/JSONB recursively sort object keys while preserving array order and exact JSON number lexemes; `bytea` is normalized to lowercase hex. Booleans have a canonical true/false value. Text remains exact.
- Any unsupported type/schema object, malformed cell/JSON, duplicate JSON key, missing migration ledger, missing cell, count mismatch, query/transaction error, archive-load failure, or unclean PGlite close fails without a success result. The CLI reports archive-content comparison only, plus table names on mismatch and aggregate table/row totals on equality. `ARCHIVE_CONTENTS_MATCH` explicitly does not prove that a restore occurred. It never prints record values, password hashes, session tokens, inquiry fields, or digest values.
- Excluded: non-public schemas, system catalogs, external/object-store media, filesystem metadata and secrets outside the database, and schema/security state not covered by the digest such as grants, ownership, extensions, event triggers, and collations. These can affect access control, runtime behavior, or recovery and must be checked separately in the authorized target environment. The source schema currently has no `bytea`; support is implemented for it. Arrays and unsupported PostgreSQL types fail closed rather than being silently coerced. This is a logical content/schema check, not a physical-file, media, backup-encryption, or application-migration test.
- The digest is an unkeyed SHA-256 integrity fingerprint, not an authentication signature. Protect both archives and test scratch data; do not publish digest details. Full-record reads and sorting materialize database rows and canonical row strings, while archive import reads the full archive into memory. Peak memory can be several times the uncompressed database size; there is no streaming implementation or established production-scale capacity figure. Before controlled testing, the operator must obtain archive and uncompressed database size estimates from an authorized copy, account for two imported scratch snapshots plus in-memory rows/canonical strings and runtime overhead, and confirm available RAM and free scratch capacity with a substantial reserve. Conduct a representative isolated rehearsal on synthetic or approved disposable data. Stop if capacity is uncertain; production-scale suitability is not established and chunked hashing/external sorting remains future work.

Schema-digest coverage includes all public base-table columns/defaults/nullability, primary keys, constraints, indexes, row-level-security enabled/forced flags, policy definitions, non-internal trigger definitions plus their function definitions, public sequence configuration/current state, and public ordinary functions/procedures. Public views/materialized views/foreign tables, aggregate/window routines, and standalone domain/enum/range/multirange types fail closed as unsupported. Application source inspection found no use of those unsupported objects. The digest does not cover ACL/grant state, ownership, extensions, non-public schemas, event triggers, collations, server configuration, or external services; these require separate schema/provider review. Static inspection of `src/server/db.ts` found ordinary tables, indexes, constraints, JSONB and timestamp fields, and no declared sequence, trigger, RLS policy, custom type, view, or routine. This is source evidence, not a read of the live database.

The CLI output `ARCHIVE_CONTENTS_MATCH` means only that the two supplied archives produced matching logical digests. It is not proof that the second archive came from an independently performed restore, and the CLI never writes a completion marker. The operator must retain independent evidence that the source archive was loaded into the approved new restore directory with `loadDataDir`, the restored clone passed checks, and the re-export was created from that clone after a successful close. Record operator, time, PGlite version, protected paths, command exit codes, and archive hashes in a restricted audit record. Verify provenance with a signed or independently protected manifest; enforce access controls, encryption at rest/in transit, off-host storage, and retention separately. SHA-256 alone does not authenticate origin or custody.

Future operator prerequisites: the app and every PGlite writer are stopped; the owner confirms all active media paths; the source archive and restored re-export are distinct protected files; installed PGlite is exactly `0.5.10`; the original database path is known; and new restore/re-export/scratch destinations have sufficient space, approved encryption/ACLs, and provider-confirmed storage independence. The synthetic-tested restore function re-exports only after import, digest traversal, and clean close, but its executable CLI is disabled. Re-enabling it and conducting a real isolated restore require a separate reviewed change and operator/provider approval.

Run later from CMD, substituting owner-confirmed paths. The original database path is passed only so the verifier can refuse a scratch overlap; the verifier performs no DB query against it. The `G:` scratch root must be new, encrypted, disposable, outside the project, original DB, backup root, and restore root. Quote each path containing spaces:

```cmd
cd /d "D:\SD Infinova\sdinfinova"
npm.cmd ls @electric-sql/pglite --depth=0
node --import tsx scripts\verify-backup-digest.ts --source-archive "E:\SDInfinovaBackups\sdinfinova\BACKUP-ID\pglite-data.tar.gz" --restored-archive "F:\SDInfinovaRestoreTest\RESTORE-ID\restored-database.tar.gz" --scratch-root "G:\SDInfinovaDigest\VERIFY-NEW-UNIQUE-ID" --original-database "D:\REPLACE\WITH\CONFIRMED\ORIGINAL\PGLITE_DATA_DIR"
```

Expected result is `ARCHIVE_CONTENTS_MATCH ...` only when every included table/schema/migration digest matches; `ARCHIVE_CONTENTS_MISMATCH` returns exit code 2, and load/query/canonicalization/path errors return exit code 1 with no match result. On any nonzero exit, retain all inputs and the scratch directory for investigation, do not mark complete, and do not rerun into that scratch path. A zero result verifies the two archive snapshots’ logical DB equality only; it does not prove that a restore occurred. The operator must still compare media hashes/references and independently attest the backup destination is encrypted/off-host before a separate owner-approved full-backup completion marker is written.

## Migration and credential precautions

- Current `initDatabase()` must be treated as a mutating operation: migration DDL and `seedInitialData()` can change tables/records after authorization. The current startup-safety patch is statically reviewed only; its automated tests do not prove real database recovery or migration safety.
- Do not start application or invoke `initDatabase()` for backup verification. Do not enable `ALLOW_SCHEMA_MIGRATIONS` on the real database until an off-host export and isolated restore pass, the migration SQL is reviewed, and the storage owner approves a maintenance window.
- There is no demonstrated down-migration/automatic rollback. Preserve the pre-migration archive and original target. Rollback must be a separately reviewed recovery operation into a separately prepared target after service stop; never overwrite the only original or restore over a live PGlite instance.
- Bootstrap/legacy administrator rotation has not been tested here. Use a fresh one-time host-managed secret only in isolated staging, validate login and session revocation, then remove temporary bootstrap values. Determine whether historical credentials were reused and rotate externally as appropriate. No credential was read or changed.

## Production storage requirements

The production host must supply a persistent, writable, access-controlled absolute PGlite directory and a paired durable media store. The provider must explicitly support PGlite’s filesystem/runtime and its locking behavior. Run one writer/one application instance for the shared PGlite directory unless the selected topology has been specifically validated; do not assume a network share, serverless scratch disk, or horizontally scaled local volume is durable or provides safe locking. Upload storage must persist across restart/redeploy and be snapshotted with the DB maintenance window. Backups must be encrypted, off-host, access-controlled, retained by policy, and periodically restored. Provider, actual volume, locking, durability, encryption, backup scheduler, RPO/RTO, and restore success are all **NOT VERIFIED**.

## Remaining external configuration / staging checks

1. Identify the real hosting provider/service manager, active process, release, effective DB/media paths, and whether media is local or external. Keep values confidential; report only approved paths and configuration presence.
2. Confirm persistent volume implementation, single-writer behavior, snapshot/export destination, encryption, retention, and monitoring with the provider.
3. Obtain owner authorization for a brief maintenance window; gracefully stop the correct writer and confirm it closed before opening the source for the one-off PGlite export.
4. Create the off-host `dumpDataDir` archive plus all confirmed media copies; compare media SHA-256 manifests and record archive hash, time, exact PGlite version, source release, operator, and exit codes in protected metadata.
5. Import only into a new disposable restore path and run the data/migration/admin/media checks above. Keep the original and backup unchanged.
6. Rehearse the application migration only against the isolated restore copy; document rollback as a separate-target recovery, not an overwrite.
7. Confirm production secret-manager configuration, administrator bootstrap/rotation, SMTP sandbox, HTTPS and cookies, CORS/proxy settings, media persistence after redeploy, health/readiness, alerting, and incident ownership in authorized staging.

## Exact CMD commands for review (read-only now)

These inspect Git and candidate directory existence only; they do not open database contents. Do not print `.env` or process environment values.

```cmd
cd /d "D:\SD Infinova\sdinfinova"
git status --short --branch
git diff --name-status
git diff --cached --name-status
git status --short --ignored -- .env data public\uploads
git ls-files | findstr /I /R "\.env data/ uploads/ \.db$ \.sqlite$ \.dump$"
if exist "data\postgres\PG_VERSION" (echo Workspace DB candidate has PG_VERSION marker) else (echo Workspace DB candidate marker NOT FOUND)
if exist "public\uploads\NUL" (echo Workspace uploads fallback directory exists) else (echo Workspace uploads fallback directory absent)
```

The export block is a future gated procedure. **All restore/import blocks are disabled and must not be executed** until an approved, tested wrapper enforces physical path separation and reparse-point rejection. Have the data owner review paths, destination, maintenance window, wrapper, and one-off restore utility before execution.

## Exact result and next safe step

**No backup or restore occurred.** Existing DB contents, schema/migration state, admin state, and data-to-file references remain **NOT VERIFIED** because the real database was deliberately not opened. Effective production paths, all active media locations, host durability/locking, and credential/configuration state also remain **NOT VERIFIED**. `npm.cmd ls` and source/declaration inspection confirmed installed PGlite `0.5.10` exposes `dumpDataDir`; no app process was started.

**Next safe step:** the authorized data owner identifies the active writer, effective storage paths, provider, and an encrypted off-host destination. Only after that does the owner schedule a maintenance window and perform the gated export/copy. Keep launch verdict **NOT READY** until the backup is hash-verified, a separate `loadDataDir` restore passes the integrity checks, and staging/recovery requirements are verified.
