# Deploy FounderOS on Railway

Status: files are ready; nothing has been deployed. The deploy needs the operator's Railway account and sign-off.

Sources (checked 2026-10-22): docs.railway.com config-as-code, healthchecks, volumes reference.

## What ships in the repo

- `Dockerfile`: Node 22, pnpm (`--frozen-lockfile`), better-sqlite3 native build, `next build`, runs as user `node`, starts `node scripts/serve.mjs start`. Railway builds with a Dockerfile when one exists; `railway.json` also pins `builder: DOCKERFILE`.
- The build runs with `GLADOS_DATA_DIR=/tmp/build-data` so prerender never races to create the demo store in the real data folder.
- `railway.json`: `healthcheckPath: /api/health`, `healthcheckTimeout: 300`, `restartPolicyType: ON_FAILURE`. Volumes are not a config-as-code key; create them in the dashboard.
- `/api/health`: returns `{"ok":true}`. No database read, no secrets.

## Steps

1. Create a Railway project and a service from this GitHub repo (or `railway link`, then deploy by the operator).
2. Add a Volume to the service, mount path `/data`. One volume per service, no replicas, and a redeploy causes brief downtime (Railway rule).
3. Generate the password hash and session secret locally (never commit them):
   ```
   node -e "const c=require('crypto');const s=c.randomBytes(16);const k=c.scryptSync(process.argv[1],s,32,{N:16384,r:8,p:1});console.log('scrypt:16384:8:1:'+s.toString('hex')+':'+k.toString('hex'))" 'your-password'
   openssl rand -hex 32
   ```
   The parameters match `SCRYPT` in `lib/auth.ts` (N 16384, r 8, p 1, key 32 bytes).
4. Set service variables:

   | Variable | Value |
   | --- | --- |
   | `GLADOS_HOST` | `0.0.0.0` (only with the two below; `scripts/serve.mjs` refuses otherwise) |
   | `GLADOS_PASSWORD_HASH` | hash from step 3 (first-boot seed only) |
   | `GLADOS_SESSION_SECRET` | random string from step 3 (first-boot seed only) |
   | `GLADOS_TRUST_PROXY` | `1` (Railway's edge is the only way in; gives secure cookies) |
   | `RAILWAY_RUN_UID` | `0` (volume is root-owned; Railway documents this for non-root images) |
   | `GLADOS_DEFAULT_MODE` | `real` |
   | connector keys | per `.env.example` |

   `PORT` is injected by Railway and read by `serve.mjs`. `GLADOS_DATA_DIR=/data`, `GLADOS_DB=/data/glados.db` and `GLADOS_ENV_LOCAL=/data/.env.local` are set in the Dockerfile; keep them on the volume. The app's gate reads the password only from the env file, never `process.env` (`lib/auth.ts`). The image entrypoint therefore copies the two password variables into `/data/.env.local` at each start. Without that the gate sees no password and answers 503 to every non-loopback request.
5. Required code change before the first deploy: `/api/health` must be an open path (see below), or Railway's healthcheck gets 401/503 and the deploy fails.
6. Deploy. Railway polls `/api/health` from `healthcheck.railway.app` until it gets 2xx (up to 300 s).
7. Verify: `RAILWAY_URL=https://<service>.up.railway.app node scripts/verify-railway.mjs`.
8. Back up: the volume holds `glados.db` plus the stores. Use Railway volume backups or copy `/data` out before risky changes.

## Gate change needed (owned elsewhere)

In `lib/auth-gate.ts`:
```
export const OPEN_PATHS = ['/login', '/api/auth/login', '/api/auth/check', '/api/health'] as const;
```
`middleware.ts` needs no change (it calls `isOpenPath`). The health body reveals nothing, so opening it leaks no data.

## Verified locally (2026-10-22)

`docker build` passes. With password variables set, anonymous `/` answers 307 to `/login`. `/api/health` answers 200 `{"ok":true}` when the gate lets it through (loopback inside the container) and 401 from outside until the `OPEN_PATHS` change above lands.

## Notes

- The entrypoint writes `GLADOS_PASSWORD_HASH` and `GLADOS_SESSION_SECRET` into `/data/.env.local` only when that key is absent there. A password changed or rotated in the app (Setup, Security) therefore survives restarts and redeploys; changing the service variable later has no effect. To reset, delete the line from `/data/.env.local`, then restart. The file is created with `umask 077`.
- The image has no password baked in, and `GLADOS_HOST` is not set in it, so a container run without variables binds loopback and the healthcheck fails. That is intended: it never serves open.
- Local test: `docker build -t founderos .` then `docker run --rm -p 4100:4100 -e GLADOS_HOST=0.0.0.0 -e GLADOS_PASSWORD_HASH=... -e GLADOS_SESSION_SECRET=... -v founderos-data:/data -u root founderos`.
