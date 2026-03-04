# Rifah Technical Audit — Handover-Grade Report

**Platform:** B2C+B2B Multi-Tenant SaaS (Saudi Beauty/Wellness Booking)  
**Audit Date:** February 2025  
**Goal:** End-to-end understanding with no surprises; concrete stabilization + scale plan for 10k+ users

---

## A) System Understanding

### Architecture (Text Description)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           FRONTENDS (Separate Apps)                             │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────────────────┤
│ Client Web  │ Admin Panel │ Tenant      │ Public      │ Mobile App               │
│ (Next.js)   │ (Next.js)   │ Portal      │ Page (Vite) │ (Expo / React Native)    │
│ :3000       │ :3002       │ (Next.js)   │ :3004       │ Expo dev server          │
│             │             │ :3003       │             │                           │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴─────────────┬─────────────┘
       │             │             │             │                    │
       └─────────────┴─────────────┴─────────────┴──────────────────┘
                                     │
                                     ▼
                    ┌────────────────────────────────┐
                    │   Backend API (Node/Express)   │
                    │   Port 5000                     │
                    │   server/src/index.js          │
                    └───────────────┬────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
        ┌──────────┐         ┌──────────┐          ┌──────────┐
        │ Postgres │         │  Redis   │          │ Local    │
        │ :5434    │         │ :6379    │          │ Uploads  │
        │          │         │ (lock +  │          │ /uploads │
        │          │         │  unused  │          │          │
        │          │         │  cache) │          │          │
        └──────────┘         └──────────┘          └──────────┘
```

- **Multi-tenancy:** Tenant context derived from **JWT claims** (tenant auth) or **URL params** (public routes) or **request body** (bookings). No subdomain or x-tenant-id header.
- **Auth types:** PlatformUser (customer), Tenant (salon owner), SuperAdmin, User (legacy).
- **Key flow:** Customer picks tenant → services → staff → availability → creates booking → confirmation.

---

### Repo Map & App Inventory

| App/Service | Path | Entrypoint | Build/Start | Port | Env Vars |
|-------------|------|------------|-------------|------|----------|
| **Backend API** | `server/` | `src/index.js` | `npm run dev` / `npm start` | 5000 | `POSTGRES_*`, `DB_HOST`, `DB_PORT`, `PORT`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `REDIS_URL`, `CORS_ORIGINS`, `NODE_ENV` |
| **Client Web** | `client/` | Next.js app | `next dev` | 3000 | `NEXT_PUBLIC_API_URL` → `http://localhost:5000/api/v1` |
| **Admin Panel** | `admin/` | Next.js app | `next dev` | 3002 | Same |
| **Tenant Portal** | `tenant/` | Next.js app | `next dev` | 3003 | Same |
| **Public Page** | `PublicPage/` | Vite/React | `vite` | 3004 | Same |
| **Mobile App** | `RifahMobile/` | `index.ts` (Expo) | `expo start` | Expo default | API URL in code/config |

**Other folders (role unclear):** `tenant-dashboard`, `admin dasboard`, `Tenant dashboard pages`, `system_files` — not confirmed as active apps.

**Env loading:** Backend uses `dotenv` in `index.js` and `validateEnvironment.js` at startup. Frontends use `NEXT_PUBLIC_*` / build-time vars.

---

### Key Flows & Data Model Summary

**Booking flow (end-to-end):**

1. **Discovery:** `GET /api/v1/public/tenants` or `GET /api/v1/tenants` → `publicTenantController.getAllTenants`
2. **Tenant page:** `GET /api/v1/public/tenant/:tenantId/page-data` → `publicTenantController.getPublicPageData`
3. **Services:** `GET /api/v1/public/tenant/:tenantId/services` → `publicTenantController.getPublicServices`
4. **Staff by service:** `GET /api/v1/public/tenant/:tenantId/services/:serviceId/staff` → `publicTenantController.getPublicStaffByService`
5. **Availability:** `POST /api/v1/bookings/search` → `bookingController.searchAvailability` → `availabilityService.getAvailableSlots`
6. **Create booking:**  
   - Auth: `POST /api/v1/bookings/create` (authenticateUser) → `bookingController.createBooking` → `bookingService.createBooking`  
   - Public: `POST /api/v1/public/tenant/:tenantId/bookings` → `publicTenantController.createPublicBooking` → same `bookingService.createBooking`

**DB tables touched:** `tenants`, `services`, `staff`, `service_employees`, `staff_shifts`, `staff_breaks`, `staff_time_off`, `staff_schedule_overrides`, `appointments`, `platform_users`, `customer_insights`, `tenant_settings`, `transactions`, `payment_transactions`.

---

## B) Risk Register

| ID | Severity | Impact | Likelihood | Evidence | Fix Summary |
|----|----------|--------|------------|----------|-------------|
| R1 | **Critical** | 500 on featured-status | High | `server/src/controllers/featuredController.js:84` uses `req.user.tenantId`; `authTenant.js` sets `req.tenantId`, not `req.user` | Use `req.tenantId` in `getTenantFeaturedStatus` |
| R2 | **Critical** | Default admin password in code | High | `server/src/index.js:205` — `password: 'RifahAdmin@2024'` hardcoded | Move to env; fail if not set in prod |
| R3 | **Critical** | Double-booking possible | Medium | No DB unique constraint on (staffId, startTime); Redis lock fails open; `bookingService.js` has no transaction isolation level set | Add partial unique index; fail closed on Redis |
| R4 | **High** | Tenant payment routes dead | High | `tenantPaymentRoutes.js` exists, never mounted in `index.js` | Mount or remove; fix `req.user.tenantId` → `req.tenantId` if mounted |
| R5 | **High** | Rate limits ineffective in prod | High | `rateLimiter.js` uses `express-rate-limit` default memory store; multi-instance = per-instance limits | Use Redis store for production |
| R6 | **High** | No graceful shutdown | High | No `SIGTERM`/`SIGINT` handlers; DB/Redis not closed | Add handlers; close Sequelize and Redis |
| R7 | **High** | No global error handler | High | No centralized error middleware in `index.js` | Add 4-arg error handler; no stack trace in prod |
| R8 | **Med** | JWT secret fallback | Med | `authTenant.js:29` — `process.env.JWT_SECRET \|\| 'your-secret-key'` | Remove fallback in prod |
| R9 | **Med** | Raw SQL without tenant filter | Med | `financialService.js` — `getPlatformSummary` scans all transactions; tenant scoping only in `getTenantFinancials` when passed | Confirm callers pass tenantId; add tenant filter where needed |
| R10 | **Med** | tenantDashboardController raw SQL | Med | Uses `s."tenantId" = :tenantId` — correct. No risk. | — |
| R11 | **Med** | Uploads on local disk | Med | `userAuthRoutes.js`, `tenantRegistrationController.js`, etc. — multer to `server/uploads/` | Plan S3 migration |
| R12 | **Med** | Redis lock fail-open | Med | `redisService.js:67` — on error, `return true` (allow booking) | Fail closed or retry; log and alert |
| R13 | **Low** | cacheService unused | Low | `cacheService.js` — built, never imported | Remove or wire; avoid caching availability |
| R14 | **Low** | No CI/CD | Low | No `.github/` workflows or pipeline config | Add build + test pipeline |
| R15 | **Low** | No health check | Low | `GET /` returns `{ message: 'Rifah API is running' }`; no DB/Redis check | Add `/health` with DB+Redis probes |

---

## C) Scale & Stabilization Plan

### Phase 0 — Must-Fix (1–2 weeks)

| # | Task | Scope | File Touchpoints | Acceptance Criteria | How to Test |
|---|-----|-------|-------------------|---------------------|-------------|
| 0.1 | Fix featured-status crash | 1 line | `server/src/controllers/featuredController.js:84` | `req.user.tenantId` → `req.tenantId` | `GET /api/v1/tenant/featured-status` with tenant JWT returns 200 |
| 0.2 | Remove hardcoded admin password | Env + fail | `server/src/index.js:196–219` | Password from `SUPER_ADMIN_PASSWORD`; fail if missing in prod | Deploy without var → startup fails; with var → admin created |
| 0.3 | Add global error handler | 1 middleware | `server/src/index.js` | 4-arg handler; no stack in prod; structured error JSON | Throw in controller → 500 with `{ success: false, message }` |
| 0.4 | Add graceful shutdown | Handlers | `server/src/index.js` | On SIGTERM/SIGINT: stop listening, close Sequelize, close Redis | Send SIGTERM → process exits; no “connection refused” in logs |
| 0.5 | Redis lock fail-closed | Logic change | `server/src/services/redisService.js` | On Redis error, return `false` (or retry 3x then fail) | Mock Redis down → booking create returns 503 |
| 0.6 | Add DB unique constraint for bookings | Migration | New migration | `UNIQUE (staff_id, start_time) WHERE status NOT IN ('cancelled','no_show')` | Two concurrent bookings same slot → one fails with unique violation |
| 0.7 | Tenant payment routes (if needed) | Mount + fix | `server/src/index.js`, `tenantPaymentController.js` | Mount under `/api/v1`; use `req.tenantId` | Payment recording works; no `req.user` refs |

---

### Phase 1 — Performance & Scale (2–6 weeks)

| # | Task | Scope | File Touchpoints | Acceptance Criteria | How to Test |
|---|-----|-------|-------------------|---------------------|-------------|
| 1.1 | Rate limiter Redis store | Config | `server/src/middleware/rateLimiter.js` | Use `rate-limit-redis` with `REDIS_URL` | Multi-instance: limit shared across instances |
| 1.2 | Health check endpoint | New route | `server/src/index.js` or `routes/health.js` | `GET /health` returns `{ db: 'ok', redis: 'ok' }` or 503 | K8s/Docker probe against `/health` |
| 1.3 | Connection pooling | Config | `server/src/config/database.js` | Set `pool: { max: 20, min: 5, idle: 10000 }` | Load test: no connection exhaustion |
| 1.4 | Pagination for list endpoints | Controllers | `tenantAppointmentController`, `tenantCustomerController`, etc. | All list endpoints accept `page`, `limit`; default limit 20 | Large dataset returns paginated results |
| 1.5 | N+1 audit | Services/controllers | `availabilityService`, `tenantAppointmentController`, etc. | Eager load associations; no N+1 in slow endpoints | Query log shows single/batched queries |
| 1.6 | Index alignment | Migrations | New migration | Add indexes for slow queries (tenant+date, staff+date) | Explain plan shows index usage |
| 1.7 | Request ID + tenant in logs | Middleware | New middleware, `productionLogger.js` | Every log line has `requestId`, `tenantId` when present | Log aggregation by request/tenant |

---

### Phase 2 — Optional Re-architecture (Later)

| # | Task | Scope | Notes |
|---|-----|-------|-------|
| 2.1 | S3 + CDN for uploads | Storage, API | Multer → S3; signed URLs for reads |
| 2.2 | Postgres RLS | Migrations, app | Set `tenant_id` per connection; RLS policies on tenant-scoped tables |
| 2.3 | Read replicas | DB topology | Route read-only queries to replica |
| 2.4 | Idempotency keys for bookings | API, DB | `Idempotency-Key` header; store and dedupe by key |

---

## D) No Surprises Checklist

**Unknowns — Exact evidence needed:**

| # | Unknown | To confirm, check |
|---|---------|--------------------|
| U1 | Whether `tenant-dashboard`, `admin dasboard`, `Tenant dashboard pages` are used | Run `grep -r "tenant-dashboard" .`; check deployment configs |
| U2 | Actual transaction isolation level for booking | `db.sequelize.options.isolationLevel` or Sequelize defaults |
| U3 | JWT refresh token storage and revocation | `userAuthService.js` — where refresh tokens stored; revocation flow |
| U4 | Password policy (min length, complexity) | `userAuthService.js` or validation layer |
| U5 | Whether migrations run before sync in prod | `index.js` uses `model.sync()` not migrations — confirm migration strategy |
| U6 | Connection pool size in production | `database.js` — no `pool` config; Sequelize default |
| U7 | Sentry/error tracking | Grep for `sentry`, `Sentry` — none found |
| U8 | CI/CD / deployment pipeline | No `.github/` — confirm how code is deployed |

---

## Appendix: Multi-Tenancy Isolation Summary

**Tenant context derivation:**

| Route prefix | Source | Middleware |
|--------------|--------|------------|
| `/api/v1/tenant/*` | JWT `decoded.id` (tenant ID) | `authenticateTenant` → `req.tenantId`, `req.tenant` |
| `/api/v1/public/tenant/:tenantId/*` | URL param `tenantId` | None (caller-supplied) |
| `/api/v1/bookings/search` | Body `tenantId` or `req.tenantId` | Optional |
| `/api/v1/bookings/create` | Body `tenantId` (validated against service/staff) | `authenticateUser` |

**Isolation:** Best-effort. Controllers/service layers add `where: { tenantId }`. No DB-level RLS. Raw SQL in `financialService` and `tenantDashboardController` uses tenant filters where applicable.

---

## Appendix: Booking Concurrency

**Current flow:** `bookingService.createBooking`:

1. Transaction (creates if not passed)
2. Validation (tenant, service, staff)
3. `hasConflict(staffId, start, end)` — SELECT only, no `FOR UPDATE`
4. Redis `acquireLock(booking:staffId:startTime)` — fail-open on Redis error
5. Final conflict check inside lock
6. `Appointment.create` in transaction
7. `releaseLock`

**Gaps:** No unique constraint; Redis fail-open; `hasConflict` not using `FOR UPDATE` in same transaction. Phase 0.5 and 0.6 address these.

---

## Appendix: How to Run Locally

```bash
# 1. Start infra
cd /path/to/BookingSystem
docker-compose up -d   # Postgres :5434, Redis :6379, pgAdmin :5050

# 2. Backend
cd server
cp .env.example .env   # Set POSTGRES_*, JWT_SECRET, etc.
npm install
npm run dev

# 3. Client (example)
cd client
npm install
npm run dev   # :3000
```

**Env:** `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DB_HOST`, `DB_PORT`, `PORT`, `JWT_SECRET`, `JWT_REFRESH_SECRET` (see `validateEnvironment.js`).
