# Phase 2 security/tenancy — RLS design

## Goal

Enforce tenant isolation at the database layer using PostgreSQL Row-Level Security (RLS). Even if application code omits a `tenantId` filter, the database restricts rows to the current tenant.

## Scope: tenant-scoped tables

All tables that store a tenant-scoped foreign key get RLS. The **tenants** table is excluded (needed for auth and lookup).

| Table | Tenant column | Notes |
|-------|----------------|-------|
| appointments | "tenantId" | UUID, nullable in some legacy paths |
| orders | "tenantId" | |
| services | "tenantId" | |
| staff | "tenantId" | |
| products | "tenantId" | |
| tenant_settings | "tenantId" | |
| public_page_data | "tenantId" | |
| tenant_usage | "tenantId" | |
| tenant_subscriptions | "tenantId" | |
| usage_alerts | "tenantId" | |
| customer_insights | "tenantId" | |
| hot_deals | "tenantId" or tenant_id | Use actual column; Sequelize model uses tenantId |
| transactions | "tenantId" | |
| auth_users (User) | "tenantId" | Legacy tenant-scoped user |

Junction tables without a tenant column (e.g. order_items, service_employees) are protected indirectly: parent tables (orders, services, staff) are RLS-protected.

## Policy design

- **Session variable:** `app.tenant_id` (text, UUID string).
- **Policy (per table):**  
  `(current_setting('app.tenant_id', true) = '' OR current_setting('app.tenant_id', true) IS NULL) OR ("tenantId" = current_setting('app.tenant_id', true)::uuid)`
  - When `app.tenant_id` is **not set** (empty or null): allow all rows (no enforcement). Enables gradual rollout and super-admin flows.
  - When **set**: only rows where `"tenantId"` equals the setting are visible/writable.
- **RLS:** Enabled with `FORCE ROW LEVEL SECURITY` so table owners are subject to policies.
- **Bypass:** Super-admin / background jobs that must see all tenants can leave `app.tenant_id` unset (or use a dedicated role with bypass, if we add one later).

## Application responsibility

- For every **tenant-authenticated** request (and for public requests that are tenant-scoped by param/body), set `app.tenant_id` to `req.tenantId` **before** any query runs.
- Use a single place: middleware that runs after auth and a Sequelize `beforeQuery` hook that runs `SET app.tenant_id = '<uuid>'` (or `SET LOCAL`) on the connection used for the request. Clearing after the request (or using `SET LOCAL` per transaction) avoids leaking tenant context to the next request on the same connection.

## Rollout

See **ROLLOUT_RLS.md** for staging-first, shadow checks, and gradual enforcement.
