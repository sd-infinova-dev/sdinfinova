# SD Infinova Deployment Guide

This guide describes what the current code requires. It does not select a hosting provider and does not claim that any live deployment has been tested.

## Current architecture and host constraints

- One Node.js 22 Express process serves the Vite-built frontend and API.
- Runtime starts with `npm run start` (`tsx server.ts`); `tsx` is a runtime dependency.
- Database is embedded PGlite; media uploads are written to a local directory.
- In production, the app requires explicit `PGLITE_DATA_DIR`, `UPLOADS_DIR`, `PUBLIC_ORIGIN`, and `CORS_WHITELIST`. It refuses in-memory database fallback and refuses startup if the frontend build is missing.
- This layout requires a host with durable writable volumes and one writer. Do not deploy it to ephemeral serverless storage or multiple replicas sharing/competing for this local database. If the chosen host does not provide persistent single-writer storage, a managed database and object-storage migration is still required.
- Public project, blog, and service detail pages are server-rendered from published database rows at `/work/:slug`, `/blog/:slug`, and `/services/:slug`, with route-specific metadata and canonical URLs. Their URLs are added to the sitemap. The homepage remains client-rendered and should be assessed separately for crawler rendering.

## Environment configuration

`.env.example` documents the names and uses placeholders only. Configure values in the host secret manager. Do not commit a populated `.env` file.

Required production configuration:

| Variable | Purpose |
|---|---|
| `NODE_ENV` | Set to `production`. |
| `PORT` | Port provided by the host. |
| `PGLITE_DATA_DIR` | Absolute path to an existing directory on a durable persistent volume. The application no longer creates this path in production. |
| `UPLOADS_DIR` | Absolute path to an existing directory on a durable persistent volume. The application no longer creates this path in production. |
| `PUBLIC_ORIGIN` | Exact HTTPS public origin (for example, the approved site origin). |
| `CORS_WHITELIST` | Comma-separated exact origins; must include `PUBLIC_ORIGIN`. |
| `TRUST_PROXY_HOPS` | Trusted reverse-proxy count when the host uses a proxy. Set only to the actual topology. |
| `DEV_PREVIEW_ORIGINS` | Optional development-only comma-separated origins for embedded previews. Leave empty in production; production framing remains denied. |
| `INITIAL_ADMIN_EMAIL` | Required only when creating a new admin or rotating the known legacy seeded administrator. |
| `INITIAL_ADMIN_PASSWORD` | Required for the same bootstrap/rotation; at least 16 characters. Remove from runtime config after successful rotation. |
| `ALLOW_SCHEMA_MIGRATIONS` | Must be exactly `true` before every production database initialization/open. It is checked before PGlite starts because schema state cannot be safely known without opening the directory. Keep it configured for production startup; it authorizes versioned schema initialization and seeding. |

Optional email/integration values are listed in `.env.example`. Email delivery is optional in the code and has not been tested. Use a provider sandbox and test recipient before enabling production delivery.

## Build and start

On a clean checkout, run in Windows CMD:

```cmd
cd /d "D:\SD Infinova\sdinfinova"
npm ci
npm run lint
npm test
npm run build
```

At the selected host, create/mount the durable directories before startup, configure the environment values above, and run:

```cmd
npm run start
```

The application listens on `PORT`. It checks database reachability at `/api/v1/health`. Production startup refuses to open PGlite unless `ALLOW_SCHEMA_MIGRATIONS=true`, required storage/origin configuration is valid, and first-admin configuration is valid when the database is empty or contains the known legacy administrator. Keep the migration authorization configured for production boots; schema DDL runs only when the baseline migration is pending. Back up and restore a copy before a planned migration; see the backup/restore guide.

## First administrator setup

For a new database, securely provide a unique `INITIAL_ADMIN_EMAIL` and a unique password of at least 16 characters through the host secret manager. Start once, confirm the account works over HTTPS, then remove those bootstrap values. Do not reuse any password shown in earlier project code or Git history.

The old seeded user ID is detected and cannot authenticate after migration until the environment bootstrap values rotate it. This does not prove whether the old credential was ever used or deployed; the owner must rotate any matching credential in every system where it was reused.

## Pre-launch staging checks

Use an isolated staging database and storage volume. Do not point these checks at the production database.

1. Verify HTTPS redirect, certificate, preferred host, CORS, CSP, cookie `Secure`/`HttpOnly`/`SameSite`, and proxy hop configuration.
2. Verify wrong-password login, successful login, unauthenticated 401, non-admin 403, CSRF rejection, session expiration, logout revocation, and login throttling.
3. Submit invalid/valid contact inquiries; confirm exactly one persisted record, rate limiting, safe response messaging, and sandbox email delivery.
4. Verify rejected SVG/invalid signature/oversized upload and a harmless allowed raster upload; redeploy/restart staging and confirm media still loads.
5. Run the backup/restore drill and compare table counts and media hashes.
6. Verify homepage/admin/unknown-path/API 404 direct navigation and refresh, robots, sitemap, admin `X-Robots-Tag`, canonical host, and browser console/network.
7. Check desktop/tablet/mobile, keyboard focus, forms, reduced-motion, contrast, and Lighthouse/Web Vitals.
8. Confirm package prices, contact links, portfolio references, seeded public claims and remaining existing inquiry records with the owner.

## Operations and rollback

- Keep one app process attached to one PGlite data directory. Do not scale horizontally with the present database configuration.
- Configure external monitoring for `/api/v1/health`; it performs a database probe but does not replace monitoring/alerting.
- Set a scheduled off-host backup policy and test restore. No backup service, monitoring provider, retention policy, or rollback automation is configured by this repository.
- Keep `ALLOW_SCHEMA_MIGRATIONS=true` as an explicit production database-startup authorization. The application checks the migration ledger read-only and performs schema DDL only if version 001 is pending. Remove the flag only when intentionally preventing production startup.
- Rollback requires stopping the app. Restore database and uploads from a matching snapshot if the new app wrote data that the old app cannot read. Do not restore or copy into a live database directory.
- If local-volume persistence is not guaranteed by the host, stop and migrate to a managed database/object storage before public deployment.

## Windows CMD validation commands

```cmd
cd /d "D:\SD Infinova\sdinfinova"
npm ci
npm run lint
npm test
npm run build
npm audit
```

These commands are local checks only. They do not verify production secrets, live services, DNS/TLS, persistence, or the selected host.
