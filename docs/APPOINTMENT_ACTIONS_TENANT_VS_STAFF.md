# Appointment Actions: Tenant Dashboard vs Staff Mobile App

## Summary

**Same appointment, two UIs.** The **tenant dashboard** (appointment details page) and the **staff mobile app** (RifahStaff) both update the same appointment record in the database. They use different API endpoints and different allowed actions, but the result is one shared `Appointment` row.

---

## 1. Tenant dashboard (appointment details page)

**URL (concept):** `/{locale}/dashboard/appointments/[id]`  
**API base:** Tenant API (tenant JWT).

| Action in UI | API call | Effect |
|--------------|----------|--------|
| **Mark as Completed** | `PATCH /api/v1/tenant/appointments/:id/status` with `{ status: "completed" }` | Sets `appointment.status = 'completed'` |
| **Mark as Paid** | `PATCH /api/v1/tenant/appointments/:id/payment` with `{ paymentStatus: "paid", paymentMethod?: "cash" }` | Sets `appointment.paymentStatus = 'paid'`, `paidAt`, optional `paymentMethod` |
| **Cancel** | `PATCH /api/v1/tenant/appointments/:id/status` with `{ status: "cancelled" }` | Sets `appointment.status = 'cancelled'` |
| **Confirm** (when pending) | Same status endpoint with `{ status: "confirmed" }` | Sets `appointment.status = 'confirmed'` |

**Allowed statuses (tenant):** `pending`, `confirmed`, `completed`, `cancelled`, `no_show`.

**Code:**  
- Frontend: `tenant/src/app/[locale]/dashboard/appointments/[id]/page.tsx` → `tenantApi.updateAppointmentStatus()`, `tenantApi.updatePaymentStatus()`.  
- Backend: `server/src/controllers/tenantAppointmentController.js` → `updateAppointmentStatus`, `updatePaymentStatus`.  
- Routes: `server/src/routes/tenantRoutes.js` (under `/api/v1/tenant`).

---

## 2. Staff mobile app (RifahStaff)

**Screen:** Today tab (home) – list of today’s appointments for the logged-in staff.  
**API base:** Staff API (staff JWT), scoped to that staff’s appointments.

| Action in UI | API call | Effect |
|--------------|----------|--------|
| **Start** | `PATCH /api/v1/staff/me/appointments/:id/status` with `{ status: "started" }` | Sets `appointment.status = 'started'` (see note below on DB enum) |
| **Complete** | Same with `{ status: "completed" }` | Sets `appointment.status = 'completed'` |
| **No show** | Same with `{ status: "no-show" }` | Sets `appointment.status = 'no_show'` |

**Allowed statuses (staff):** `started`, `completed`, `no-show`. Staff cannot set `pending`, `confirmed`, or `cancelled`; they cannot update payment.

**Code:**  
- Frontend: `RifahStaff/app/(tabs)/index.tsx` → `handleStatusUpdate(id, 'started' | 'completed' | 'no-show')` → `updateAppointmentStatus()` from `RifahStaff/src/services/appointments.ts`.  
- Backend: `server/src/controllers/staffAppointmentsController.js` → `updateAppointmentStatus`.  
- Routes: `server/src/routes/staffAppRoutes.js` (mounted at `/api/v1/staff/me`).

---

## 3. Relation between the two

- **Same entity:** Both UIs read/update the same **Appointment** row (same `id`, `tenantId`, `staffId`, etc.).
- **Different entry points:**  
  - **Staff:** “I’ve finished this service” → tap **Complete** in the app → status becomes `completed`.  
  - **Tenant:** Reception/owner can **Mark as Completed** or **Mark as Paid** / **Cancel** from the dashboard.
- **Typical flow:**  
  1. Customer books → appointment is `pending` or `confirmed`.  
  2. (Optional) Staff taps **Start** in RifahStaff → `started`.  
  3. Staff taps **Complete** in RifahStaff → `completed` (same as “Mark as Completed” on tenant dashboard).  
  4. Tenant dashboard can then **Mark as Paid** and record payment method.

So: **“Mark as Completed” on the tenant dashboard** and **“Complete” in the staff app** are the same business action on the same appointment; they just use different APIs (tenant vs staff) to set `status = 'completed'`.

---

## 4. Status "started" (In Progress)

- **Staff app** sets `status: 'started'` when the employee taps **Start** (service is being performed).
- The tenant dashboard shows this as **"In Progress"** (EN: "In Progress", AR: "جاري التنفيذ").
- A migration adds `started` to the appointment status enum in the database. **How to run it:** see [How to run migrations](#6-how-to-run-migrations) below.

---

## 5. Quick reference

| Concern | Tenant dashboard | Staff app |
|--------|-------------------|-----------|
| **Who** | Tenant (owner/reception) | Employee (staff) |
| **Status endpoint** | `PATCH /api/v1/tenant/appointments/:id/status` | `PATCH /api/v1/staff/me/appointments/:id/status` |
| **Payment endpoint** | `PATCH /api/v1/tenant/appointments/:id/payment` | — (no payment actions) |
| **Can set completed?** | Yes (“Mark as Completed”) | Yes (“Complete”) |
| **Can set started?** | No (staff only) | Yes (**Start** button) |
| **Display "In Progress"?** | Yes (when status is `started`) | Yes (badge **Started** then **Complete**) |
| **Can cancel?** | Yes | No |
| **Can mark paid?** | Yes | No |

This is the relation between the **Actions** box on the appointment details page (tenant) and the **Start / Complete / No show** actions in the staff mobile app: same appointment, different APIs and roles.

---

## 6. How to run migrations

Migrations live in `server/migrations/`. From the **server** directory:

```bash
cd server

# Ensure DB env vars are set (e.g. from project root .env or server/.env)
# POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, DB_HOST, DB_PORT

# Run all pending migrations (includes adding `started` to appointment status)
npx sequelize-cli db:migrate

# See which migrations have run
npm run migration:status
# or: npx sequelize-cli db:migrate:status
```

To **undo the last migration** (the `started` migration does not remove the enum value in PostgreSQL):

```bash
npx sequelize-cli db:migrate:undo
```

The migration that adds **started** is: `20260228100000-add-appointments-status-started.js`. It adds the value to the `appointments.status` enum so the staff app can persist "Start" and the tenant dashboard can show "In Progress".
