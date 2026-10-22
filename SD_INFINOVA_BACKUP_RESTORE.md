# SD Infinova Backup and Restore Procedure

**Current state:** no backup or restore has been run or verified by this audit. The workspace database and uploads were not copied or modified. Two Node processes were visible, and their relationship to the database could not be established safely. This procedure must be run by an operator who can identify the correct service and configured persistent paths.

## What must be backed up

1. The complete PGlite directory configured by `PGLITE_DATA_DIR` (currently defaults to the project `data/postgres` folder outside production).
2. The complete upload directory configured by `UPLOADS_DIR` (currently defaults to `public/uploads`).
3. Environment configuration held in the host secret manager, backed up there under its access controls. Never copy secrets into this repository or the backup report.
4. Any external email/storage configuration and the exact application release/lockfile needed to restore.

Back up the database and uploads at the same point in time. Keep copies off the application volume, restrict access, encrypt at rest, and set an owner-approved retention and recovery-point/recovery-time policy. The repository does not configure a backup scheduler or provider.

## Create a consistent snapshot (Windows CMD)

1. Identify the correct SD Infinova process/service and stop it using its normal service controls or by pressing **Ctrl+C in its owning terminal**. Do not terminate all `node.exe` processes indiscriminately. Confirm no process is using the configured PGlite directory before copying it.
2. Substitute the actual `PGLITE_DATA_DIR`, `UPLOADS_DIR`, and a new timestamped backup destination below. The example destination is outside the repository.

```cmd
tasklist /FI "IMAGENAME eq node.exe"
set "DB_SOURCE=D:\SD Infinova\sdinfinova\data\postgres"
set "MEDIA_SOURCE=D:\SD Infinova\sdinfinova\public\uploads"
set "BACKUP_ROOT=D:\SD Infinova Backups\sdinfinova\YYYYMMDD-HHMM"
mkdir "%BACKUP_ROOT%"
robocopy "%DB_SOURCE%" "%BACKUP_ROOT%\postgres" /E /COPY:DAT /DCOPY:DAT /R:2 /W:2
if errorlevel 8 exit /b 1
if exist "%MEDIA_SOURCE%" robocopy "%MEDIA_SOURCE%" "%BACKUP_ROOT%\uploads" /E /COPY:DAT /DCOPY:DAT /R:2 /W:2
if errorlevel 8 exit /b 1
```

Robocopy exit codes below 8 indicate success; an exit code of 8 or greater indicates failure. Confirm the backup directory contains the expected PGlite files and upload files. Keep it outside Git and the same application volume.

## Verify restore in isolation

Do not test restore over the original database. Copy the backup into a new disposable directory on a separate volume or isolated machine. Keep the app stopped. Replace the example paths with the actual backup location.

```cmd
set "BACKUP_ROOT=D:\SD Infinova Backups\sdinfinova\YYYYMMDD-HHMM"
set "RESTORE_ROOT=D:\SD Infinova Restore Check\YYYYMMDD-HHMM"
mkdir "%RESTORE_ROOT%"
robocopy "%BACKUP_ROOT%\postgres" "%RESTORE_ROOT%\postgres" /E /COPY:DAT /DCOPY:DAT /R:2 /W:2
if errorlevel 8 exit /b 1
if exist "%BACKUP_ROOT%\uploads" robocopy "%BACKUP_ROOT%\uploads" "%RESTORE_ROOT%\uploads" /E /COPY:DAT /DCOPY:DAT /R:2 /W:2
if errorlevel 8 exit /b 1
set "PGLITE_DATA_DIR=%RESTORE_ROOT%\postgres"
node --input-type=module -e "import { PGlite } from '@electric-sql/pglite'; const db = new PGlite(process.env.PGLITE_DATA_DIR); for (const table of ['admin_users','projects','blog_posts','contact_inquiries','media_assets','page_views']) { const result = await db.query('SELECT count(*)::int AS count FROM ' + table); console.log(table + '=' + result.rows[0].count); } await db.close();"
```

The count command reads only counts and prints no inquiry/customer values. Compare the restored counts to counts recorded from the stopped source before backup (or to a separately verified backup snapshot). Then compare the source and restored upload hash sets. A PowerShell check that emits only the number of mismatched hashes is:

```powershell
$sourceHashes = Get-ChildItem -File -Recurse -LiteralPath 'D:\path\to\source\uploads' | Get-FileHash -Algorithm SHA256 | Select-Object -ExpandProperty Hash | Sort-Object
$restoredHashes = Get-ChildItem -File -Recurse -LiteralPath 'D:\path\to\restored\uploads' | Get-FileHash -Algorithm SHA256 | Select-Object -ExpandProperty Hash | Sort-Object
(Compare-Object $sourceHashes $restoredHashes | Measure-Object).Count
```

The result must be `0`. Also inspect the restored database with the application in an isolated environment and verify inquiry records, published content, media metadata-to-file references, and authentication behavior. Production startup requires `ALLOW_SCHEMA_MIGRATIONS=true` before PGlite opens; keep it false to refuse database initialization. If schema version 001 is pending, perform this restore test on a copy and review the migration before starting production.

## Restore service

1. Stop the application and confirm no process is using the target PGlite directory.
2. Preserve the failed/current target separately for investigation; do not overwrite it without owner authorization.
3. Restore the selected database and matching uploads snapshots to the configured persistent paths, preserving access controls.
4. Configure the exact required production environment in the host secret manager. If migration version 001 has not been applied, only proceed after the isolated restore drill succeeds and the migration has been reviewed.
5. Start the service, verify `/api/v1/health`, log in as the authorized administrator, inspect public content/inquiries and load representative media, then monitor errors and writes.
6. Record backup ID/time, source release, restored table counts, media hash result, operator, and observed limitations without recording secrets or customer content.

## Limits and retention

- A raw PGlite directory copy is consistent only when the database is stopped cleanly. Never copy a live PGlite data directory.
- Local backups on the same host do not protect against host or volume loss. Keep encrypted off-host copies with access limited to recovery operators.
- No backup schedule, encryption policy, retention setting, restore result, or RPO/RTO target is configured or verified by this repository. Choose and document these with the hosting owner.
- Deleting a backup or replacing production data is outside this procedure. Keep old copies until a subsequent restore drill and retention review approve cleanup.
