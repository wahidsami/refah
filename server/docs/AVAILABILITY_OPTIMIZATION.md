# Availability search optimization (POST /api/v1/bookings/search)

Low-risk optimization: reduce DB round-trips and CPU loops while keeping behavior identical. Target: 10k+ scale.

---

## Before vs after

| Metric | Before (any-staff, N staff, 1 date) | After (batched) |
|--------|-------------------------------------|-----------------|
| **Query count** | 2 + N × ~11 (e.g. 10 staff → **~112 queries**) | **Constant ~13** (service, settings, serviceEmployees, staff+tenant, 8 in parallel: shifts×2, legacy, breaks×2, timeOff, overrides, appointments) |
| **Latency** | Grows with N (many round-trips) | Bounded by fixed round-trips + in-memory compute |
| **Behavior** | Same | Same (same windows, same slot generation, same dedup) |

Typical request (e.g. 10 staff, 1 date): **before ~112 queries → after 13 queries**.

---

## Implementation summary

### A) Timing logs

- **Controller** (`server/src/controllers/bookingController.js`): logs `availability_search` with `totalMs`, `requestId`, `tenantId`, `serviceId`, `date`, `slotsCount`, `availableSlots`, `staffCount`, and optional `timings` (per-step). Enabled when `AVAILABILITY_TIMING_LOG=1` or in non-production.
- **Service** (`server/src/services/availabilityService.js`): fills `timings` (fetchService, fetchSettings, fetchStaff, fetchShifts, fetchAppointments, computeSlots) and returns `_timings` when `AVAILABILITY_TIMING_LOG=1` or non-production. Controller logs it.

### B) Current query pattern (before batching)

- **Single staff** (`staffId` provided): 1 Service, 1 TenantSettings, 1 Staff, 1 ServiceEmployee, then per staff: 1 Tenant, 2 StaffShift (date-specific + recurring), 0–1 StaffSchedule (legacy), 2 StaffBreak, 1 StaffTimeOff, 1 StaffScheduleOverride, 1 Appointments → ~11 per staff.
- **Any staff** (no `staffId`): 1 Service, 1 TenantSettings, 1 ServiceEmployee, 1 Staff, then **for each of N staff** the same ~11 queries (loop over staff calling `_getSlotsForStaff`) → **2 + N×11** queries.

### C) Batched path (any-staff only)

- **`_getSlotsForAnyStaffBatched`** (replaces the N-staff loop):
  1. **serviceEmployees** (1) → staffIds for service.
  2. **staff + tenant** (2 in parallel) → active staff for tenant, tenant for business hours.
  3. **8 in parallel**: date-specific shifts, recurring shifts, legacy StaffSchedule, date-specific breaks, recurring breaks, timeOff, overrides, **appointments** (tenantId + staffId IN (…) + startTime in day + status not cancelled).
  4. **In memory**: group by staffId; for each staff build availability window from pre-fetched shifts/legacy/breaks/timeOff/overrides (sync helper `_buildAvailabilityWindowFromData`), then generate slots using that staff’s appointments. Same dedup/sort as before.

- **Single-staff path** (`_getSlotsForStaff`) unchanged; only timing fields added.

### D) Batched query WHERE clauses (for indexes)

| # | Table | WHERE filters (columns) |
|---|--------|--------------------------|
| 0 | service_employees | serviceId = ? (used to get staffIds for service) |
| 1 | staff_shifts (date) | staff_id IN (?), specific_date = ?, is_active = true, is_recurring = false |
| 2 | staff_shifts (recurring) | staff_id IN (?), day_of_week = ?, is_recurring = true, is_active = true, start_date/end_date range |
| 3 | staff_schedules | staffId IN (?), dayOfWeek = ?, isAvailable = true |
| 4 | staff_breaks (date) | staff_id IN (?), specific_date = ?, is_active = true, is_recurring = false |
| 5 | staff_breaks (recurring) | staff_id IN (?), day_of_week = ?, is_recurring = true, is_active = true, start_date/end_date range |
| 6 | staff_time_off | staff_id IN (?), is_approved = true, start_date <= ?, end_date >= ? |
| 7 | staff_schedule_overrides | staff_id IN (?), date = ? |
| 8 | appointments | tenantId = ?, staffId IN (?), startTime BETWEEN ?, status NOT IN (...) |

### E) Indexes: query → index mapping and expected impact

Each batched query is supported by a composite index aligned to its WHERE/JOIN. At 10k+ rows per table, these indexes keep the 8 parallel lookups index-only or index-range scans instead of full table scans.

| Query | Table | Index | Migration | Expected impact |
|-------|--------|-------|-----------|-----------------|
| Staff IDs for service | service_employees | idx_service_employees_service_id | 20260228000000 | Fast lookup by service_id; avoids full scan when many service–staff links. |
| (1) Date-specific shifts | staff_shifts | idx_staff_shifts_staff_specific_active_recurring | 20260227 | Index (staff_id, specific_date, is_active, is_recurring). |
| (2) Recurring shifts | staff_shifts | idx_staff_shifts_staff_day_recurring_active | 20260227 | Index (staff_id, day_of_week, is_recurring, is_active); start_date/end_date filtered in memory. |
| (3) Legacy schedule | staff_schedules | idx_staff_schedules_staff_day_available | 20260227 | Index (staffId, dayOfWeek, isAvailable) or snake_case equivalent. |
| (4) Date-specific breaks | staff_breaks | idx_staff_breaks_staff_specific_active_recurring | 20260227 | Index (staff_id, specific_date, is_active, is_recurring). |
| (5) Recurring breaks | staff_breaks | idx_staff_breaks_staff_day_recurring_active | 20260227 | Index (staff_id, day_of_week, is_recurring, is_active). |
| (6) Time-off | staff_time_off | idx_staff_time_off_staff_approved_dates | 20260227 | Index (staff_id, is_approved, start_date, end_date) for date-overlap lookup. |
| (7) Overrides | staff_schedule_overrides | idx_staff_overrides_staff_date | 20240101 | Already exists (staff_id, date). |
| (8) Appointments | appointments | idx_appointments_tenant_staff_start | 20260223 (phase1) | Already exists ("tenantId", "staffId", "startTime"); status filtered in memory. |

**Existing indexes (no new migration):** staff_shifts/staff_breaks base indexes (20240101); staff_time_off (staff_dates, approved); staff_schedule_overrides (staff_date); appointments (tenant_staff_start, tenant_start_time).

### F) Regression / perf test

- **File:** `server/tests/availabilitySearch.test.js`
- **Cases:**
  1. Returns 400 when serviceId/date missing.
  2. Returns 200 with correct shape and invariants (slots array, date, totalSlots, availableSlots, metadata.staffCount, each slot has startTime/endTime/available) when tenant+service+date provided (skips if no tenant/service in DB).
  3. Query count for any-staff search ≤ 20 (batched path).
- **Run:** `cd server && npm test -- availabilitySearch`

---

## Files touched

| File | Change |
|------|--------|
| `server/src/controllers/bookingController.js` | Timing around `getAvailableSlots`; log `availability_search` with totalMs and optional timings. |
| `server/src/services/availabilityService.js` | Per-step timings in `getAvailableSlots` and `_getSlotsForStaff`; **`_getSlotsForAnyStaffBatched`** (batched queries + in-memory grouping + `_buildAvailabilityWindowFromData`); **removed** loop-based `_getSlotsForAnyStaff`. |
| `server/tests/availabilitySearch.test.js` | **New** – regression and query-count test. |
| `server/docs/AVAILABILITY_OPTIMIZATION.md` | **New** – this doc. |

**Migrations:**  
- `20260227000000-availability-batched-query-indexes.js` – staff_shifts, staff_breaks, staff_time_off, staff_schedules (6 indexes).  
- `20260228000000-availability-indexes-service-employees-concurrent.js` – service_employees (1 index).

---

## Production: CONCURRENTLY and maintenance window

- **Sequelize migrations run inside a transaction by default.** `CREATE INDEX` takes an exclusive lock briefly; on large tables this can block writes.
- **Option 1 (zero-downtime):** Run with `RUN_INDEX_CONCURRENTLY=1` so indexes are created with `CREATE INDEX CONCURRENTLY` (no long-lived exclusive lock). The migration runs each CREATE outside a transaction when this env is set.  
  **Bash/WSL:** `RUN_INDEX_CONCURRENTLY=1 npx sequelize-cli db:migrate`  
  **PowerShell (Windows):** `$env:RUN_INDEX_CONCURRENTLY = "1"; npx sequelize-cli db:migrate`  
  **CMD (Windows):** `set RUN_INDEX_CONCURRENTLY=1 && npx sequelize-cli db:migrate`
- **Option 2 (maintenance window):** Run migrations as usual (`npx sequelize-cli db:migrate`) during a low-traffic window. Index creation is fast for small/medium tables; for very large tables (e.g. 10k+ appointments), prefer Option 1.

---

## How to run locally

```bash
cd server
npm run dev
# Optional: enable timing logs
# AVAILABILITY_TIMING_LOG=1 npm run dev
```

```bash
# Run availability search test
npm test -- availabilitySearch
```

---

## How to verify index existence

After running `npx sequelize-cli db:migrate` (or with `RUN_INDEX_CONCURRENTLY=1` for production; on PowerShell use `$env:RUN_INDEX_CONCURRENTLY = "1"; npx sequelize-cli db:migrate`):

**List all availability-related indexes:**

```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE 'idx_staff_shifts%'
    OR indexname LIKE 'idx_staff_breaks%'
    OR indexname LIKE 'idx_staff_time_off%'
    OR indexname LIKE 'idx_staff_schedules%'
    OR indexname LIKE 'idx_staff_overrides%'
    OR indexname = 'idx_service_employees_service_id'
    OR indexname IN ('idx_appointments_tenant_staff_start', 'idx_appointments_tenant_start_time')
  )
ORDER BY tablename, indexname;
```

**Or list only the indexes added for batched availability:**

```sql
SELECT indexname, tablename FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_service_employees_service_id',
    'idx_staff_shifts_staff_specific_active_recurring',
    'idx_staff_shifts_staff_day_recurring_active',
    'idx_staff_breaks_staff_specific_active_recurring',
    'idx_staff_breaks_staff_day_recurring_active',
    'idx_staff_time_off_staff_approved_dates',
    'idx_staff_schedules_staff_day_available'
  )
ORDER BY tablename, indexname;
```

From the project: `cd server && npx sequelize-cli db:migrate:status` to confirm migrations ran.

**Optional: EXPLAIN to confirm index usage**

Replace `:tenant_id`, `:service_id`, `:date`, `:staff_ids` with real UUIDs/values; `:staff_ids` is an array for IN (e.g. `'{uuid1,uuid2}'` in PostgreSQL).

```sql
-- (1) Date-specific shifts
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM staff_shifts
WHERE staff_id = ANY(ARRAY(SELECT unnest(:staff_ids::uuid[])))
  AND specific_date = :date
  AND is_active = true AND is_recurring = false;

-- (2) Recurring shifts
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM staff_shifts
WHERE staff_id = ANY(ARRAY(SELECT unnest(:staff_ids::uuid[])))
  AND day_of_week = 0
  AND is_recurring = true AND is_active = true
  AND (start_date IS NULL OR start_date <= :date)
  AND (end_date IS NULL OR end_date >= :date);

-- (8) Appointments (batched)
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM appointments
WHERE "tenantId" = :tenant_id
  AND "staffId" = ANY(ARRAY(SELECT unnest(:staff_ids::uuid[])))
  AND "startTime" BETWEEN :start_of_day AND :end_of_day
  AND status NOT IN ('cancelled', 'no_show')
ORDER BY "startTime" ASC;
```

Look for `Index Scan` or `Bitmap Index Scan` on the expected index name; avoid `Seq Scan` on these tables at 10k+ scale.

---

## How to validate

1. **Timing:** Set `AVAILABILITY_TIMING_LOG=1` or run in development; trigger `POST /api/v1/bookings/search` with `{ "tenantId", "serviceId", "date" }`. Check logs for `event: 'availability_search'` with `totalMs` and `timings` (fetchService, fetchShifts, computeSlots, etc.).
2. **Query count:** In test, query count for any-staff search is asserted ≤ 20; or run with a query logger and compare before/after for the same payload.
3. **Correctness:** Compare response shape and slot counts for a few (tenant, service, date) combinations before and after; behavior should match (same slots, same available flags).

---

## getNextAvailableSlot

`getNextAvailableSlot` (GET /api/v1/bookings/next-available) still calls `getAvailableSlots` once per day (up to `daysToSearch`). Each call now uses the batched path when no `staffId` is passed, so **per-day** cost is the constant ~13 queries instead of N×11. No change to the loop-over-days logic.

---

## Deliverables (index work)

- **Logic unchanged:** No changes to `availabilityService.js` or any controller; only migrations and docs.
- **New migration:** `20260228000000-availability-indexes-service-employees-concurrent.js` adds `idx_service_employees_service_id` on `service_employees(service_id)` (or `"serviceId"`), with optional `RUN_INDEX_CONCURRENTLY=1`.
- **Updated migration:** `20260227000000-availability-batched-query-indexes.js` now supports `RUN_INDEX_CONCURRENTLY=1` for all 6 indexes (runs each CREATE/DROP outside transaction).
- **Indexes added by migrations (full list):**  
  `idx_service_employees_service_id` (20260228);  
  `idx_staff_shifts_staff_specific_active_recurring`, `idx_staff_shifts_staff_day_recurring_active`,  
  `idx_staff_breaks_staff_specific_active_recurring`, `idx_staff_breaks_staff_day_recurring_active`,  
  `idx_staff_time_off_staff_approved_dates`, `idx_staff_schedules_staff_day_available` (20260227).
- **Verification:** See "How to verify index existence" (SQL to list indexes) and "Optional: EXPLAIN to confirm index usage" above.
