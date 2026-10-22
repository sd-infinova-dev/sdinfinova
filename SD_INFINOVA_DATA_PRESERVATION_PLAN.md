# SD Infinova Data Preservation and Staging Preparation

> **Update:** This document contains earlier reconnaissance; obsolete cold-copy and inline-import instructions have been withdrawn below. For the current PGlite-specific backup method, exact execution gates, native path-only checks, isolated restore design, and full-record digest verifier, see [SD_INFINOVA_BACKUP_EXECUTION_PLAN.md](SD_INFINOVA_BACKUP_EXECUTION_PLAN.md). Static source review shows the production migration gate precedes database initialization and migration-ledger writes; the real database and its migration state were not opened. Synthetic Windows tests have accepted ordinary file/directory paths and rejected a junction; symlink and other provider-specific reparse behavior remains unverified. The verifier preserves timestamp precision, includes supported table security/routine/sequence state, and reports archive-content equality only. Synthetic tests do not prove production recovery; no real backup or restore is claimed.

> **Restore wrapper update (2026-10-22):** The executable CLI is deliberately disabled for restore/import and accepts only metadata-only `--path-check-only` requests. A separately exported restore function is exercised only by synthetic tests. Native PowerShell tests passed for ordinary file/directory paths and junction rejection; directory symlink creation was unavailable, and mount points/provider-specific reparse tags remain untested. These tests do not prove provider volume identity, encryption/off-host storage, ACL immutability, or race freedom. Real restore remains disabled pending independent Windows/provider review and all storage prerequisites.

**Prepared:** 2026-10-22 (Asia/Kathmandu)  
**Scope:** Read-only inspection of source, reports, Git state and filesystem metadata, plus synthetic temporary PGlite/archive tests. No application startup or access to the real database, its contents, media, production credentials, or configured production paths was performed. No real migration, seed, backup, restore, credential change, or production operation was performed.

**Synthetic verification update (2026-10-22):** 38/38 focused tests passed using synthetic temporary paths and archives; native Windows checks accepted ordinary file/directory paths and rejected a junction. Symlink creation was unavailable; mount points and other provider-specific reparse types remain unverified. Lint and `git diff --check` passed. No real backup or restore was performed; restore CLI remains disabled.

## Current data and Git state

| Item                              | Finding                                                                                                                                                                                           | Status                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Database engine                   | Embedded PostgreSQL through `@electric-sql/pglite` (`package.json` pins the `^0.5.10` range). `src/server/db.ts` selects a file-backed PGlite directory outside tests/development in-memory mode. | **CONFIRMED from source**                                             |
| Workspace database                | `D:\SD Infinova\sdinfinova\data\postgres` exists and is Git-ignored. Read-only metadata enumeration found 1,051 files. No database file was opened or read.                                       | **CONFIRMED as existing path; contents and consistency NOT VERIFIED** |
| Active database path              | Production uses `PGLITE_DATA_DIR`; local default is the project `data\postgres`. The actual environment/production value was not read.                                                            | **NOT VERIFIED**                                                      |
| Media engine                      | Uploads are ordinary files written under `UPLOADS_DIR`; absent that variable, source defaults to `public\uploads`.                                                                                | **CONFIRMED from source**                                             |
| Workspace default media directory | `public\uploads` exists; read-only metadata check found 0 files. This says nothing about a different configured `UPLOADS_DIR`.                                                                    | **CONFIRMED for this directory only**                                 |
| Active media path                 | The actual `UPLOADS_DIR` runtime/host setting was not read.                                                                                                                                       | **NOT VERIFIED**                                                      |
| Backup/restore                    | No backup or restore was created or tested by this inspection.                                                                                                                                    | **NOT VERIFIED; no backup is claimed**                                |
| Hosting                           | The reports do not name the intended provider. Mounted volume persistence, encryption, snapshot semantics, and one-writer enforcement therefore cannot be established.                            | **NOT VERIFIED**                                                      |

### Git review (read-only)

- The only staged path is `package-lock.json` (`A` in the index). It is a dependency lockfile, not application data. Its root manifest matches the current `package.json` dependency declarations by inspection and the prior fix report records `npm install --package-lock-only --ignore-scripts --offline` as up to date. It has not been committed.
- Unstaged tracked modifications are `.env.example`, `index.html`, `package.json`, `server.ts`, `src/App.tsx`, `src/components/AdminDashboard.tsx`, `src/components/BlogSection.tsx`, `src/components/ServicesSection.tsx`, `src/components/WorkShowcase.tsx`, `src/index.css`, `src/server/api.ts`, and `src/server/db.ts`.
- Untracked project artifacts include the audit/deployment/backup reports, `src/lib/api.ts`, and the two test files. Other untracked root names are `cd`, `findstr`, `netstat`, `npm`, `o.trim()).filter(Boolean`, `powershell`, `react-example@0.0.0`, `tasklist`, and `tsx`. Their ownership/purpose cannot be established from status alone; they are preserved and should be reviewed by the user before staging.
- `.env` and `data\` are ignored; the local `.env` contents were not opened or printed. No tracked `.env`, database, SQLite/dump/backup, or upload path was found in the tracked-file scan. `public\uploads` is ignored by `.gitignore` but currently empty in the workspace check.
- A targeted scan of the staged lockfile found no embedded URL credentials, private-key blocks, AWS access-key patterns, or database connection-string patterns. This is a limited pattern scan, not a complete secret audit. No database or upload file is staged.
- No files were staged, unstaged, reset, or discarded as part of this plan.

## Storage initialization and data writes

Importing `src/server/db.ts` no longer opens PGlite: it exports a lazy proxy, and `initializePGlite()` is called only by `initDatabase()`. Development may create the default `data\postgres` directory when `initDatabase()` is called. Tests use in-memory PGlite. Production checks that `PGLITE_DATA_DIR` is absolute and already exists before constructing file-backed PGlite (`src/server/db.ts:9-49`).

Importing `src/server/api.ts` does not create the uploads directory. `initializeUploadsStorage()` creates the default local path only outside production; in production it requires an absolute, existing `UPLOADS_DIR` (`src/server/api.ts:21-30`).

`server.ts:createApp()` first calls `productionConfiguration()`, then `initializeUploadsStorage()`, then `initDatabase()` (`server.ts:17-43,68-72`). The production validation checks required paths/origin/CORS values and existing directories before storage initialization. This verifies source ordering, not a live production launch or the durability of mounted volumes.

**Migration caution (historical text, superseded):** The prior audit observed the ledger preceding the migration gate. Subsequent startup-safety changes moved production authorization/configuration validation ahead of PGlite initialization and application DDL. This order is assessed statically only; it is not proof that the real database has been backed up, is recoverable, or can be migrated safely. See the linked current plan and startup-safety report.

After migration approval, the schema work is wrapped in a transaction. It creates/alters schema, marks the known legacy administrator for password rotation, and deletes sessions; `seedInitialData()` runs afterward and can create/modify the administrator and populate empty service/project/blog/settings tables. Demo inquiry/page-view insertion is limited to non-production with `SEED_DEMO_DATA=true`. No such operation was run here.

## Safe backup method for PGlite and media

The earlier cold-copy-only recommendation is superseded. For installed PGlite 0.5.10, the current plan uses documented `dumpDataDir()`/`loadDataDir` archives for the database, a paired copy/export of every confirmed active media source, and the synthetic-tested full-record digest verifier. A cold filesystem copy may be retained as an additional snapshot only after all writers stop cleanly; it is not the primary verified method. See [SD_INFINOVA_BACKUP_EXECUTION_PLAN.md](SD_INFINOVA_BACKUP_EXECUTION_PLAN.md) for the gated commands and constraints. Neither procedure has been run against the real data.

### Backup execution status and canonical procedure

No production backup exists. The earlier CMD `robocopy` database-directory copy, hash-only validation, count-only PGlite check, and inline import examples in this document are withdrawn; do not use them as a backup or recovery procedure. They could be mistaken for the PGlite archive workflow and did not enforce the candidate wrapper's complete path guard.

The reviewed code path for PGlite 0.5.10 uses `dumpDataDir('gzip')` to create an archive, and `loadDataDir` for a separately isolated import. The canonical gated workflow, media-manifest requirements, capacity preflight, and native path-only test command are in [SD_INFINOVA_BACKUP_EXECUTION_PLAN.md](SD_INFINOVA_BACKUP_EXECUTION_PLAN.md). That document's executable restore CLI is currently disabled; only `--path-check-only` is enabled. Do not re-enable restore or use an inline importer until the owner/provider requirements are met and a separate review approves it.

Before any future backup, the authorized owner must identify the actual configured `PGLITE_DATA_DIR` and every active media source without disclosing secret values, confirm and gracefully stop every writer, verify the source is closed, and select a new encrypted off-host destination with adequate capacity and restricted access. Copy/export every media source paired to the database archive. Verify file count, relative paths, sizes, and SHA-256 hashes. A checksum does not establish provenance; protect the manifest independently and apply access controls, encryption, and retention.

### Isolated restore status

No real restore has occurred. Do not use the retired filesystem-copy/inline-PGlite examples or point any tool at the original database. A future isolated restore must use a new destination confirmed physically separate from the original, source archive, and scratch paths; have owner-controlled ACLs; and be independently confirmed by the storage provider. Different local volume identifiers do not prove independent backing or off-host placement. The current wrapper's immediate revalidation narrows but does not eliminate concurrent path-replacement races.

After a separately reviewed re-enable, independently compare source and re-export archives with the full-record digest verifier, verify media hashes/references, migration state, and administrator-state aggregates without logging personal data or credential material. Archive equality alone does not prove that a restore occurred or that the application recovered. Preserve failed scratch data for owner investigation; cleanup is a separate reviewed operator action.

Safe synthetic checks run from the repository root:

```cmd
npm.cmd exec -- tsx --test tests/backup-digest.test.ts tests/restore-pglite.test.ts
npm.cmd run lint
git diff --check
```

These tests use synthetic PGlite instances and temporary files only. Do not run `npm.cmd test` under the no-application-start restriction: the repository's broader `security.test.ts` suite starts an isolated in-memory test server. The focused command above includes the native PowerShell path-only checks on Windows, synthetic valid and corrupt archive handling, content mismatch checks, and failure-path tests. No test proves production recoverability.

## Migration and administrator credential precautions

- Do not run `npm start`, `npm run dev`, `initDatabase()`, migration scripts, or seed logic against the existing directory as a “check.” The startup path may mutate it as described above.
- Before any schema change: identify the actual production paths and writer; stop the application; create and verify a `dumpDataDir` archive plus every confirmed media copy; restore only through a separately reviewed isolated procedure; review migration SQL and run it on the restored clone; verify records and media; only then schedule the production migration with an explicit rollback owner/window.
- There is no down migration shown. Rollback means stop the app and restore a verified matching snapshot into a separately prepared target under a controlled recovery procedure; never copy over a live PGlite directory. Keep the failed/current target and backup for investigation.
- Static source review shows production initialization requires `ALLOW_SCHEMA_MIGRATIONS=true` before opening PGlite; schema DDL and the migration-ledger write are inside the migration transaction. The real database was not opened, so rollback behavior and the current ledger state remain NOT VERIFIED. Do not apply migrations until an independently verified backup and isolated restore exist.
- A new database requires `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` (minimum 16 characters in code). A legacy `usr_admin_1` account is marked for rotation and its sessions invalidated during migration; startup then updates its email/password from the bootstrap variables. Use a fresh unique secret from the host secret manager, verify login in isolated staging, and remove the bootstrap variables afterward. Whether a legacy credential was ever used or reused is **NOT VERIFIED**; rotate it everywhere it may have been reused. No credential was rotated here.

## Production storage requirements

The app uses one local PGlite data directory plus local media files. The host must provide:

- A durable, writable, access-controlled persistent volume mounted at an absolute `PGLITE_DATA_DIR` path, with persistence across process restart, host replacement, and redeploy explicitly guaranteed by the provider.
- A durable persistent volume or object-storage implementation for `UPLOADS_DIR`, with backup/recovery paired to the database snapshot.
- A single application writer for this PGlite directory. Do not run multiple instances/replicas against the same local PGlite data directory or place it on a filesystem with unverified locking semantics. Do not use an ephemeral/serverless filesystem. If the intended provider cannot guarantee durable single-writer storage, migrate to a managed database and object storage before launch.
- Off-host encrypted backups, retention/access controls, monitoring, and a restore drill. Repository configuration does not create these services.

Provider, volume type, durability, lock semantics, filesystem support, backup snapshots, and multi-instance topology are all **NOT VERIFIED**. The deployment guide does not select a host.

## Environment and services to configure (placeholders only)

Use host secret/config management, not a committed `.env`; no secret values are included here.

| Name                                                            | Requirement                                                                                     |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                                      | `production`                                                                                    |
| `PORT`                                                          | Host-assigned listening port                                                                    |
| `PGLITE_DATA_DIR`                                               | Absolute path to pre-mounted durable single-writer volume                                       |
| `UPLOADS_DIR`                                                   | Absolute path to pre-mounted durable media storage                                              |
| `PUBLIC_ORIGIN`                                                 | Approved HTTPS origin placeholder, e.g. `https://<approved-host>`                               |
| `CORS_WHITELIST`                                                | Exact comma-separated allowed origins; include the public origin                                |
| `TRUST_PROXY_HOPS`                                              | Exact trusted reverse-proxy count, only when applicable                                         |
| `INITIAL_ADMIN_EMAIL`                                           | One-time new-admin/legacy-rotation email, when required                                         |
| `INITIAL_ADMIN_PASSWORD`                                        | One-time unique value (minimum 16 chars); remove after successful setup/rotation                |
| `ALLOW_SCHEMA_MIGRATIONS`                                       | Temporary `true` only after the backup/restore gate and migration review; unset/reset afterward |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional email provider configuration, tested only with an approved sandbox recipient first     |
| `NOTIFICATION_EMAIL`, `WHATSAPP_NUMBER`, `GEMINI_API_KEY`       | Optional integrations if enabled and approved                                                   |

No values were read from `.env` or emitted. Provider secret presence, mail configuration, and effective runtime values are **NOT VERIFIED**.

## Remaining staging and manual checks

1. Select the hosting provider and confirm durable volume behavior, PGlite single-writer/locking requirements, upload persistence, backups, restore, encryption, monitoring, and rollback.
2. Have the authorized operator identify and gracefully stop the actual app process before any backup; confirm actual configured database/media paths through the secret manager without disclosing values.
3. Create and hash-verify the off-host backup, then restore it into a separate disposable path and verify database catalog/table counts and media hashes/references. No backup currently exists by evidence in this inspection.
4. Review the current startup migration gate statically and rehearse any pending migration only on the isolated restored copy. Do not apply it to real data as part of this plan.
5. Rotate the real legacy administrator in authorized isolated staging after backup; verify access and remove bootstrap variables. Determine whether the old credential was reused and rotate those systems if needed.
6. Confirm stage environment secrets, CORS, trusted proxy hops, HTTPS cookies, email sandbox delivery, harmless upload persistence across redeploy, and readiness behavior.
7. Inspect existing DB records and media only through an approved read-only/backup copy; identify any synthetic records with the owner. Do not delete or update records without a separately approved change and verified backup.
8. Review untracked root entries listed above with the user before staging. Keep `.env`, data, uploads, and backups out of Git.

## Exact Windows CMD commands for review

These are review commands and future operator procedures; they were not run as one backup or restore workflow. Do not run the app/start/migration commands against the workspace database.

Read-only Git review:

```cmd
cd /d "D:\SD Infinova\sdinfinova"
git status --short --branch
git diff --name-status
git diff --cached --name-status
git status --short --ignored -- .env data public\uploads
git ls-files | findstr /I /R "\.env data/ uploads/ \.db$ \.sqlite$ \.dump$"
```

Read-only existence checks (do not enumerate or open database contents):

```cmd
if exist "data\postgres" (echo Workspace PGlite directory exists) else (echo Workspace PGlite directory not found)
if exist "public\uploads" (echo Default uploads directory exists) else (echo Default uploads directory not found)
```

Use the backup execution plan for future, owner-gated backup preparation. This document contains no executable database restore command. The restore CLI currently refuses restore/import arguments; its synthetic restore function is not an operator interface. Do not use cold directory copies, `/MIR`, or restore into the original database path. Proceed only after actual source paths and all writers are independently confirmed, an encrypted off-host destination is approved, and the separate restore wrapper has passed review and controlled testing.

## Verdict

**NOT READY.** The local database directory exists and is ignored; the local default uploads folder exists but is empty. Neither the active runtime paths nor production persistence are confirmed. No backup/restore exists as verified evidence. Production migration and administrator rotation have not been exercised. A startup-safety patch and synthetic-tested digest verifier are present, but neither proves real-data recoverability or migration safety. Do not deploy or migrate until an off-host backup and isolated restore pass, all active media are reconciled, and authorized staging requirements are resolved.
