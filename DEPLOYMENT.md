# Rifah Platform – Pre-Deploy Scan & VPS Deployment Plan

## 1. Final Scan – What’s OK

| Area | Status |
|------|--------|
| **Secrets** | `.env` is in `.gitignore`; no production secrets in code. `.env.example` files exist for server, client, admin, tenant; RifahMobile/RifahStaff use `EXPO_PUBLIC_*`. |
| **Server env validation** | `validateEnvironment.js` enforces required vars and rejects weak/default JWT and SUPERADMIN_PASSWORD in production. |
| **Database** | Config uses `DATABASE_URL` in production; pool/timeouts are env-driven. Migrations exist; no hardcoded DB URLs in code. |
| **CORS** | Environment-based: production uses `CORS_ORIGINS` (with fallback list); dev has localhost + optional extra. |
| **Rate limiting** | Applied on `/api/v1/` (general + auth/payment/upload limiters). |
| **Error handling** | `errorHandler.js` does not expose stack traces to clients in production. |
| **Health** | `/health` (liveness), `/ready` (DB + Redis), `/metrics` (Prometheus) available. |
| **Redis** | Optional; used for booking locks; `/ready` reports Redis status (503 if down). |
| **Mobile apps** | RifahMobile and RifahStaff use `EXPO_PUBLIC_SERVER_URL` / `EXPO_PUBLIC_API_URL` for API base; `getImageUrl()` uses same base. |

---

## 2. What’s NOT OK (fix before or during VPS deploy)

### 2.1 Hardcoded `localhost` in web apps — **FIXED**

All web frontends now use environment-based URLs:

- **Client:** `next.config.js` rewrite and `src/app/api/images/[...path]/route.ts` use `NEXT_PUBLIC_API_URL`; pages use `getImageUrl()` and `PUBLIC_PAGE_URL` from `@/lib/api`. `.env.example` documents `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_PUBLIC_PAGE_URL`.
- **Admin:** Uses `API_BASE_URL` and `getImageUrl()` from `@/lib/api` (including AdminLayout and image `src`).
- **Tenant:** All fetch and image URLs use `API_BASE_URL` / `getImageUrl()` / `PUBLIC_PAGE_URL` from `@/lib/api`. `.env.example` includes `NEXT_PUBLIC_PUBLIC_PAGE_URL`.
- **PublicPage:** Added `.env.example` with `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_CLIENT_URL`. `src/lib/api.ts` and `AuthContext.tsx` use env; all components use `getImageUrl()` and `CLIENT_URL` for images and dashboard links.

Set the same env vars at **build time** for each Next.js app when deploying to VPS.

### 2.2 PM2 / process manager — **FIXED**

- **ecosystem.config.js** now includes **rifah-public** (PublicPage on port 3004) and a comment that `NEXT_PUBLIC_*` must be set at build time (e.g. in each app’s `.env.production` before `npm run build`).

### 2.3 Repo safety (addressed in this pass)

- **.gitignore:** Added `server/uploads/`, `server/firebase-service-account.json`, `*-service-account*.json`, and `debug-*.log` so uploads and secrets are never committed.
- **server/.env.example:** Documented production vars: `DATABASE_URL`, `BASE_URL`/`API_URL`, `REDIS_URL`, `CORS_ORIGINS`, `DB_SSL`.

### 2.4 Optional hardening

- **validateEnvironment:** In production, consider requiring `BASE_URL` (or `API_URL`) so emails/notifications always have the correct public API URL.
- **Firebase:** If you use FCM/notifications, ensure `firebase-service-account.json` is only on the server (not in repo); path is already ignored via `.gitignore`.

---

## 3. VPS Deployment Plan

### 3.1 Prerequisites on VPS

- Node.js (LTS), npm (or yarn)
- PostgreSQL (or managed DB); create DB and user
- Redis (recommended for booking locks)
- Nginx (or Caddy) as reverse proxy
- SSL (e.g. Let’s Encrypt) for all public hostnames
- PM2 (or another process manager)

### 3.2 Repository and build

1. **Push to GitHub** (from your machine):
   - Ensure no `.env` or `server/uploads/` or `*-service-account*.json` are committed (they’re now in `.gitignore`).
   - Push the branch you want to deploy.

2. **On VPS:**
   - Clone repo (e.g. `git clone https://github.com/your-org/BookingSystem-2.git && cd BookingSystem-2`).
   - For each app (server, client, admin, tenant, PublicPage): install deps (`npm ci` in each folder).

### 3.3 Environment variables

**Server (`server/.env`):**

- `NODE_ENV=production`
- `PORT=5000` (or the port behind Nginx)
- `DATABASE_URL=postgresql://user:password@host:5432/rifah_shared` (or set `POSTGRES_*` + `DB_HOST`/`DB_PORT` if not using `DATABASE_URL`)
- `JWT_SECRET`, `JWT_REFRESH_SECRET` (strong, unique)
- `SUPERADMIN_PASSWORD` (min 12 chars, not weak)
- `CORS_ORIGINS=https://your-client.com,https://your-admin.com,https://your-tenant.com,https://your-public.com`
- `BASE_URL=https://api.yourdomain.com` (for emails/notifications; no trailing slash)
- `REDIS_URL=redis://localhost:6379` (if Redis is local)
- Optional: email (Resend), Stripe, Firebase path, etc., as in `.env.example`

**Client / Admin / Tenant (e.g. `.env.production` or build-time env):**

- `NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1`
- Optional: `NEXT_PUBLIC_PUBLIC_PAGE_URL=https://public.yourdomain.com` (for links to public page)

**PublicPage:**

- Add `.env.example` and real `.env` with:
  - `NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1`
  - `NEXT_PUBLIC_CLIENT_URL=https://app.yourdomain.com` (for login/register/dashboard redirects)

**Mobile (RifahMobile / RifahStaff):**

- For production builds, set `EXPO_PUBLIC_SERVER_URL` / `EXPO_PUBLIC_API_URL` to `https://api.yourdomain.com` (no `/api/v1` for SERVER_URL) when building (EAS or local).

### 3.4 Build and run order

1. **Server**
   - `cd server && npm run migrate` (and optionally `seed` if you have a prod-safe seed).
   - Start: `node src/index.js` or via PM2 (see below).
   - Ensure `/health` and `/ready` are reachable (e.g. via Nginx).

2. **Next.js apps (client, admin, tenant, PublicPage)**
   - Set env (e.g. `NEXT_PUBLIC_API_URL`, etc.) then:
   - `npm run build && npm start` (or use PM2 with `script: "npm"`, `args: "start"`).
   - Build must run with production env so all `NEXT_PUBLIC_*` are baked in.

3. **PM2 (ecosystem.config.js)**
   - Set env in ecosystem or via `.env` in each app’s `cwd`; ensure build was done with correct env.
   - Add PublicPage if you run it:
     ```js
     { name: "rifah-public", cwd: "./PublicPage", script: "npm", args: "start", env: { NODE_ENV: "production", PORT: 3004 } }
     ```
   - Start: `pm2 start ecosystem.config.js`.
   - Enable startup: `pm2 save && pm2 startup`.

### 3.5 Nginx (example)

- **API:** Proxy `https://api.yourdomain.com` to `http://127.0.0.1:5000`; proxy `/uploads` and `/api`, and `/health`/`/ready` for checks.
- **Client:** Proxy `https://app.yourdomain.com` to `http://127.0.0.1:3000`.
- **Admin / Tenant / Public:** Same idea on their hostnames/ports (3001, 3002, 3004).
- SSL: use certbot (Let’s Encrypt) or your provider’s SSL.

### 3.6 Post-deploy checks

- Hit `https://api.yourdomain.com/health` and `https://api.yourdomain.com/ready` (expect 200; 503 on ready if Redis is down).
- Log in to admin, tenant, and client; confirm API and image requests go to the API domain (no localhost).
- Test booking flow (and payment if enabled).
- Confirm emails/notifications use `BASE_URL` (correct links).

### 3.7 Summary

- **Scan:** Backend and config are mostly production-ready; the main gap is **hardcoded localhost in all web frontends** (especially PublicPage). Fix by moving to env-based API and public/client URLs everywhere.
- **Deployment:** Clone from GitHub, set env per app, run migrations, build Next.js with prod env, run server and frontends (PM2), put Nginx in front with SSL, and verify health + a few user flows.
