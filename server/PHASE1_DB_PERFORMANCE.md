# Phase 1 DB performance

## Summary

1. **Sequelize connection:** Explicit pool settings and statement timeout.
2. **List endpoints:** Pagination (limit/offset) and max page size (100) on appointments, bookings, customers, services, staff, orders, tenants, users.
3. **Indexes:** Migrations added for (tenantId, createdAt), (tenantId, staffId, startTime), (tenantId, platformUserId, startTime), and slug lookup.
4. **Tests:** Pagination helper and endpoint rejection of oversized limit.

---

## 1. Sequelize connection config

**File:** `server/src/config/database.js`

- **Pool:** `max`, `min`, `acquire`, `idle` are explicit (env overrides: `DB_POOL_MAX`, `DB_POOL_MIN`, `DB_POOL_ACQUIRE`, `DB_POOL_IDLE`).
  - Defaults: max 10, min 2, acquire 30000 ms, idle 10000 ms.
- **Statement timeout:** `dialectOptions.statement_timeout` (default 30000 ms, override: `DB_STATEMENT_TIMEOUT_MS`).
- Production keeps `use_env_variable: 'DATABASE_URL'` and optional `DB_SSL`.

---

## 2. Endpoints updated (pagination + max page size)

All use `parseLimitOffset(req, defaultLimit, 100)` from `server/src/utils/pagination.js`. Query params: `page`, `limit`. Max page size **100**; over that returns **400** with message `Limit cannot exceed 100`.

| Endpoint | Controller | Default limit |
|----------|------------|---------------|
| GET /api/v1/tenant/appointments | tenantAppointmentController.getAppointments | 50 |
| GET /api/v1/tenant/employees | tenantEmployeeController.getEmployees | 20 |
| GET /api/v1/tenant/services | tenantServiceController.getServices | 20 |
| GET /api/v1/tenant/products | tenantProductController.getProducts | 20 |
| GET /api/v1/tenant/orders | tenantOrderController.getOrders | 20 |
| GET /api/v1/tenant/customers | tenantCustomerController.getCustomers | 20 |
| GET /api/v1/bookings | bookingController.listBookings | 20 |
| GET /api/v1/users/bookings | userController.getUserBookings | 20 |
| GET /api/v1/admin/tenants | adminTenantsController.listTenants | 20 |
| GET /api/v1/admin/users | adminUsersController.listUsers | 20 |
| GET /api/v1/public/tenants | publicTenantController.getAllTenants | 20 |
| GET /api/v1/staff | staffController.getStaff | 20 |
| GET /api/v1/services | serviceController.getServices | 20 |

Responses that are lists include a `pagination` object: `{ total, page, limit, totalPages }`.

---

## 3. Migrations added

**File:** `server/migrations/20260223000000-phase1-db-performance-indexes.js`

| Index | Table | Columns | Purpose |
|-------|--------|---------|---------|
| idx_appointments_tenant_created_at | appointments | (tenantId, createdAt) | Tenant lists by creation time |
| idx_appointments_tenant_staff_start | appointments | (tenantId, staffId, startTime) | Staff calendar / conflict checks |
| idx_appointments_tenant_user_start | appointments | (tenantId, platformUserId, startTime) | User’s bookings per tenant |
| idx_orders_tenant_created_at | orders | (tenantId, createdAt) | Tenant order lists |
| idx_tenants_slug_lookup | tenants | (slug) UNIQUE | Public page lookup by slug |

**Run migrations:**
```bash
cd server
npx sequelize-cli db:migrate
```

**Rollback:**
```bash
npx sequelize-cli db:migrate:undo
```

---

## 4. How to check EXPLAIN plans

Use PostgreSQL `EXPLAIN (ANALYZE, BUFFERS)` to confirm indexes are used.

1. **Connect to DB** (e.g. `psql` or GUI) with the same DB as the app.

2. **Turn on timing and run EXPLAIN:**
   ```sql
   EXPLAIN (ANALYZE, BUFFERS)
   SELECT * FROM appointments
   WHERE "tenantId" = 'some-uuid'
   ORDER BY "createdAt" DESC
   LIMIT 20 OFFSET 0;
   ```
   - Look for `Index Scan` or `Index Only Scan` on `idx_appointments_tenant_created_at` (or the intended index).
   - If you see `Seq Scan` on a large table, check that the index exists and that the predicate matches the index columns.

3. **Other patterns:**
   - By staff and time:  
     `WHERE "tenantId" = ? AND "staffId" = ? AND "startTime" >= ? AND "startTime" <= ?`  
     → expect use of `idx_appointments_tenant_staff_start`.
   - By user and time:  
     `WHERE "tenantId" = ? AND "platformUserId" = ? ORDER BY "startTime"`  
     → expect `idx_appointments_tenant_user_start`.
   - Tenant by slug:  
     `SELECT * FROM tenants WHERE slug = ?`  
     → expect `idx_tenants_slug_lookup` or the unique constraint index on `slug`.

4. **From Node (one-off script):**
   ```js
   const db = require('./src/models');
   const [results] = await db.sequelize.query(
     'EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM appointments WHERE "tenantId" = $1 ORDER BY "createdAt" DESC LIMIT 20',
     { bind: [someTenantId] }
   );
   console.log(results.map(r => r['QUERY PLAN']).join('\n'));
   ```

---

## 5. Tests

**File:** `server/tests/pagination.test.js`

- **parseLimitOffset:** default limit/offset, valid limit/page, limit > max throws 400, invalid limit or page throws 400, limit = max allowed.
- **Endpoints:** Minimal app that uses `parseLimitOffset` returns 400 for `limit=101` and 200 with `pagination` for valid limit/page.

**Run:**
```bash
cd server
npm test -- tests/pagination.test.js
```

**Manual check (oversized limit):**
```bash
# Start server (e.g. npm run dev), then:
curl -s "http://localhost:5000/api/v1/public/tenants?limit=101" | jq .
# Expect: 400, message "Limit cannot exceed 100"
```

---

## Files changed

| File | Change |
|------|--------|
| server/src/config/database.js | Pool (max, min, acquire, idle), statement_timeout in dialectOptions |
| server/src/utils/pagination.js | **New.** parseLimitOffset(req, defaultLimit, maxPageSize) |
| server/src/controllers/tenantAppointmentController.js | parseLimitOffset, 400 on bad params |
| server/src/controllers/tenantEmployeeController.js | Pagination (findAndCountAll), parseLimitOffset, 400 |
| server/src/controllers/tenantServiceController.js | Pagination, parseLimitOffset, 400 |
| server/src/controllers/tenantProductController.js | Pagination, parseLimitOffset, 400 |
| server/src/controllers/tenantOrderController.js | parseLimitOffset, 400 |
| server/src/controllers/tenantCustomerController.js | parseLimitOffset, 400 |
| server/src/controllers/bookingController.js | listBookings: findAndCountAll, parseLimitOffset, 400 |
| server/src/controllers/userController.js | getUserBookings: findAndCountAll, parseLimitOffset, 400 |
| server/src/controllers/adminTenantsController.js | parseLimitOffset, 400 |
| server/src/controllers/adminUsersController.js | parseLimitOffset, 400 |
| server/src/controllers/publicTenantController.js | getAllTenants: findAndCountAll, parseLimitOffset, 400 |
| server/src/controllers/staffController.js | getStaff: findAndCountAll, parseLimitOffset, 400 |
| server/src/controllers/serviceController.js | getServices: findAndCountAll, parseLimitOffset, 400 |
| server/migrations/20260223000000-phase1-db-performance-indexes.js | **New.** Indexes above |
| server/tests/pagination.test.js | **New.** Pagination and oversized-limit tests |
