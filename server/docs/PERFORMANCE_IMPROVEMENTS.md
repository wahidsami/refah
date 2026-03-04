# Performance & scale improvements (10k+ customers/tenant)

Low-risk changes for the Node/Express + Postgres + Redis monolith. No rewrites.

---

## 1. Instrumentation (must-have)

- **Request latency per route:** Already in `server/src/middleware/requestLogger.js`. Logs `request_end` with `requestId`, `tenantId`, `statusCode`, `latencyMs`, `route` (JSON).
- **Slow-query logger:** `server/src/utils/slowQueryLogger.js`. Logs any Sequelize query exceeding `SLOW_QUERY_MS` (default 200ms). In production, enable with `SLOW_QUERY_LOG_ENABLED=1`. Non-prod: always logs slow queries. Wired in `server/src/index.js` via `initSlowQueryLogger(db.sequelize)`.
- **DB pool metrics:** `server/src/utils/poolMetricsLogger.js`. Logs `db_pool_metrics` (size, active, idle, pending) on an interval. Non-prod: enable with `DB_POOL_METRICS_LOG=1`. Prod: only when `DB_POOL_METRICS_LOG=1`. Interval: `DB_POOL_METRICS_INTERVAL_MS` (default 60000). Wired in `server/src/index.js`; cleared on shutdown.

**Env (optional):** `SLOW_QUERY_MS`, `SLOW_QUERY_LOG_ENABLED`, `DB_POOL_METRICS_LOG`, `DB_POOL_METRICS_INTERVAL_MS`.

---

## 2. DB pooling

- **Config:** `server/src/config/database.js`. Pool and statement timeout are env-driven for all environments:
  - `DB_POOL_MAX` (default 10), `DB_POOL_MIN` (default 2), `DB_POOL_ACQUIRE` (default 30000), `DB_POOL_IDLE` (default 10000).
  - `DB_STATEMENT_TIMEOUT_MS` (default 30000).
- Production explicitly sets `logging: false` and uses the same `POOL` and `dialectOptions`.

---

## 3. Pagination

- **Helper:** `server/src/utils/pagination.js` — `parseLimitOffset(req, defaultLimit, maxPageSize)` and `DEFAULT_MAX_PAGE_SIZE` (100).
- **List endpoints using it:** Bookings (`listBookings`), tenant appointments, tenant orders, tenant customers, tenant services/staff/products, admin tenants/users, public tenants, payment history.
- **Changes:**
  - **Payment history** (`GET /api/v1/payments/history`): Added `parseLimitOffset`, `findAndCountAll` with limit/offset, response now includes `pagination: { total, page, limit, totalPages }`. Returns 400 when limit exceeds max.
  - **Customer history** (`getCustomerHistory`): Limit from query capped at `DEFAULT_MAX_PAGE_SIZE`; invalid limit returns 400.
- **Tests:** `server/tests/pagination.test.js` — parseLimitOffset behavior, max limit rejection (400), and pagination shape.

---

## 4. Index alignment

- **Existing (Phase 1):** `server/migrations/20260223000000-phase1-db-performance-indexes.js` — `(tenantId, createdAt)` appointments/orders, `(tenantId, staffId, startTime)` and `(tenantId, platformUserId, startTime)` appointments, unique `tenants(slug)`.
- **New migration:** `server/migrations/20260226000000-add-appointments-tenant-starttime.js`
  - **Index:** `idx_appointments_tenant_start_time` on `appointments ("tenantId", "startTime")`.
  - **Why:** List/filter by tenant + date range (dashboard, calendar, reports) without staff/user; complements existing staff/user-specific indexes.

---

## 5. N+1 audit and fix

- **Hotspot:** Public tenant discovery `GET /api/v1/public/tenants` (`getAllTenants`).
- **Before:** 1 query for tenants + **3×N** queries (Service.count, Staff.count, StaffShift.count per tenant). Example: 20 tenants → **61 queries**.
- **After:** 1 query for tenants + **3 batched queries** (Service counts grouped by tenantId; Staff counts grouped by tenantId; StaffShift with Staff include filtered by tenantIds, then distinct tenantIds). Example: 20 tenants → **4 queries**.
- **File:** `server/src/controllers/publicTenantController.js`. Removed per-tenant `Promise.all` and `console.log`; added batched `findAll` with `group: ['tenantId']` for Service/Staff counts and one StaffShift query for “has shift today” per tenant.

---

## Files changed

| File | Change |
|------|--------|
| `server/src/index.js` | Init slow-query logger and pool metrics; stop pool metrics on shutdown |
| `server/src/middleware/requestLogger.js` | No code change (already logs requestId, tenantId, statusCode, latencyMs, route) |
| `server/src/utils/slowQueryLogger.js` | **New** — slow-query logging |
| `server/src/utils/poolMetricsLogger.js` | **New** — periodic pool metrics |
| `server/src/config/database.js` | Explicit production `logging: false`, `port` parseInt for dev/test |
| `server/src/controllers/paymentController.js` | Pagination (parseLimitOffset, findAndCountAll, pagination in response, 400 on bad limit) |
| `server/src/controllers/tenantCustomerController.js` | getCustomerHistory: cap limit, 400 on invalid limit |
| `server/src/controllers/publicTenantController.js` | getAllTenants: N+1 replaced with batched counts (3 queries instead of 3×N) |
| `server/migrations/20260226000000-add-appointments-tenant-starttime.js` | **New** — index (tenantId, startTime) on appointments |
| `server/tests/pagination.test.js` | Extra test for pagination shape (total, page, limit, totalPages) |

---

## Migrations added

- `20260226000000-add-appointments-tenant-starttime.js` — adds `idx_appointments_tenant_start_time` on `appointments ("tenantId", "startTime")`.

(Phase 1 migration already provides: appointments tenant+createdAt, tenant+staff+startTime, tenant+user+startTime; orders tenant+createdAt; tenants slug.)

---

## How to run locally

1. **Env (optional):**
   - `SLOW_QUERY_MS=200` (default)
   - `SLOW_QUERY_LOG_ENABLED=1` (to log slow queries in prod)
   - `DB_POOL_METRICS_LOG=1` (to log pool metrics)
   - `DB_POOL_MAX`, `DB_POOL_MIN`, `DB_STATEMENT_TIMEOUT_MS` as needed

2. **Run migrations:**
   ```bash
   cd server
   npx sequelize-cli db:migrate
   ```

3. **Start server:**
   ```bash
   npm run dev
   ```

4. **Run tests:**
   ```bash
   npm test
   npm test -- pagination
   npm test -- publicRoutes
   ```

---

## How to validate performance

- **Endpoints to exercise:**
  - **Discovery (N+1 fix):** `GET /api/v1/public/tenants` — before: 1+3N queries; after: 4 queries. Check logs for fewer DB round-trips.
  - **List with pagination:** `GET /api/v1/payments/history?limit=20&page=1` (with auth), `GET /api/v1/bookings?limit=20`, tenant list endpoints — responses include `pagination` and reject `limit` > 100 with 400.
  - **Availability / booking list:** Use after index migration; list/filter by tenant + date should use `idx_appointments_tenant_start_time` where applicable.

- **Metrics to watch:**
  - **Request latency:** JSON logs `request_end` with `latencyMs`, `route`, `requestId`, `tenantId`, `statusCode`.
  - **Slow queries:** JSON logs `slow_query` with `ms`, `queryPreview` when `SLOW_QUERY_MS` exceeded.
  - **Pool:** JSON logs `db_pool_metrics` (size, active, idle, pending) when `DB_POOL_METRICS_LOG=1`.

- **Suggested checks:**
  1. Load `/api/v1/public/tenants` and confirm in logs (or DB query count) that discovery uses 4 queries instead of 1+3N.
  2. Call list endpoints with `limit=101` and expect 400; with `limit=20&page=1` expect 200 and `pagination` in body.
  3. Run migrations and verify `idx_appointments_tenant_start_time` exists; run tenant dashboard or calendar filters and confirm no regression and optionally lower latency.

---

## Slowest endpoints (for a focused Cursor prompt)

Likely hotspots:

- **Availability search** — `POST /api/v1/bookings/search` (and `getNextAvailableSlot`): many queries per staff/date (availability window, appointments, shifts). Indexes help; batching or caching could be a next step.
- **Booking list** — `GET /api/v1/bookings` (and tenant appointments list): already paginated; new index `(tenantId, startTime)` helps date-range filters.
- **Tenant dashboard** — e.g. today’s bookings, revenue, counts: mix of raw SQL and Sequelize; N+1 fixed for public tenants; dashboard-specific N+1 could be audited next.

If you share which of these is slowest in your environment (availability search vs booking list vs tenant dashboard), a laser-focused Cursor prompt can be drafted for that exact hotspot (including suggested indexes and query shape).
