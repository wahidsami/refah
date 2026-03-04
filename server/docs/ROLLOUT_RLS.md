# Phase 2 RLS — Rollout plan

## Overview

Row-Level Security (RLS) is enabled on tenant-scoped tables. Policies allow rows when `app.tenant_id` is unset (empty/null) or when `"tenantId"` matches the setting. The app sets `app.tenant_id` per request for tenant-authenticated routes so that even if code forgets a tenant filter, the DB restricts results.

## 1. Staging first

1. **Deploy migration on staging only**  
   Run `npx sequelize-cli db:migrate` against the staging DB. Do not run on production yet.

2. **Deploy app with RLS session and middleware**  
   Deploy the version that includes:
   - `initRlsSession(sequelize)` (sets `app.tenant_id` on connection acquire, clears on release)
   - `setTenantContext` middleware on tenant routes (runs request in AsyncLocalStorage with `tenantId`)

3. **Smoke-test tenant flows**  
   Log in as a tenant, open dashboard, list appointments/services/staff, create a booking. Confirm no new errors and data looks correct.

4. **Optional: shadow check**  
   Add temporary logging when a query would have been affected by RLS (e.g. log when `getTenantId()` is non-null and a tenant-scoped table is queried). Compare row counts with and without RLS in staging to confirm behavior.

## 2. Shadow checks / logging (optional)

- **Log when tenant context is set:** In `setTenantContext`, log (at debug level) `requestId` and `tenantId` so you can correlate with DB activity.
- **Metrics:** Use existing metrics (e.g. request count by route) and watch for 500s or empty lists on tenant routes after RLS is enabled.
- **Compare queries:** In staging, run a few tenant-scoped queries manually with `SET app.tenant_id = '...'` in psql and confirm row counts match app expectations.

## 3. Gradual enforcement

- **Phase 2a (current):** Policy allows all rows when `app.tenant_id` is not set. So:
  - Tenant-authenticated routes set context → only that tenant’s rows are visible.
  - Admin, public, and unauthenticated routes do not set context → all rows visible (no change in behavior).
- **Phase 2b (later, optional):** To enforce “tenant context required” for specific tables:
  - Change policy to **disallow** when `app.tenant_id` is unset (e.g. `USING ("tenantId" = current_setting('app.tenant_id', true)::uuid)` only, no “allow when unset” branch).
  - Roll out table-by-table after confirming all code paths that touch that table set context (or use a dedicated bypass role for admin jobs).

## 4. Production rollout

1. **Backup** production DB.
2. **Run migration** in a maintenance window: `npx sequelize-cli db:migrate`.
3. **Deploy** app with RLS session + setTenantContext.
4. **Monitor** errors and latency; have rollback plan (migration undo + revert deploy).

## Test strategy

- **Unit:** `tenantContext.getTenantId()` returns the value set in `run(store, fn)`. No DB required.
- **Integration (RLS):** `server/tests/rlsTenantIsolation.test.js` uses the real Postgres connection:
  1. When `app.tenant_id` is set to tenant A, `SELECT COUNT(*) FROM appointments` returns only A’s count.
  2. When set to tenant A, a query for tenant B’s rows by `tenantId` returns 0 (cross-tenant blocked).
- **Run:** `npm test -- tests/rlsTenantIsolation.test.js` (requires Postgres, migration applied, at least 2 tenants). Tests skip if not Postgres or RLS not applied.
- **Pool isolation:** `server/tests/rlsPoolIsolation.test.js` uses Sequelize pool + tenant context; skips when connected as superuser (superuser bypasses RLS). For **CI**, set `RLS_TEST_REQUIRE_NON_SUPERUSER=1` so the test **fails** if the DB role is superuser, forcing use of a non-superuser role.

### CI: non-superuser DB role for RLS tests

To verify RLS in CI, run tests as a **non-superuser** Postgres role (superuser bypasses RLS, so isolation cannot be proven).

1. **Create a role** (as a superuser, e.g. `postgres`):

   ```sql
   CREATE ROLE rls_test_user WITH LOGIN PASSWORD 'your_secure_password' NOSUPERUSER NOCREATEDB NOCREATEROLE;
   ```

2. **Grants** (adjust schema/DB name if needed):

   ```sql
   GRANT CONNECT ON DATABASE your_database TO rls_test_user;
   GRANT USAGE ON SCHEMA public TO rls_test_user;
   -- Full access to tables the app and tests use (migrations create them; app owns them)
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rls_test_user;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO rls_test_user;
   -- So that future tables created by the app owner also allow this role
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rls_test_user;
   ```

3. **Ownership:** Application tables are typically owned by the role that runs migrations (e.g. `postgres` or a dedicated app role). The CI role (`rls_test_user`) does not need to own tables; it only needs the grants above. RLS policies apply to this role because it is not a superuser.

4. **CI config:** Point the test DB URL to use `rls_test_user` (e.g. `DATABASE_URL` or `DB_USERNAME`), and set `RLS_TEST_REQUIRE_NON_SUPERUSER=1` so the pool isolation test fails if someone accidentally uses a superuser in CI.

## Rollback

- **Revert app:** Remove or disable `initRlsSession` and `setTenantContext`; redeploy. RLS remains on but `app.tenant_id` is never set, so policies that “allow when unset” keep current behavior.
- **Disable RLS:**  
  `npx sequelize-cli db:migrate:undo` (drops policies and disables RLS on listed tables).
