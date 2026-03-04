# Booking System Analysis

This document describes how the Rifah booking system works end-to-end: entities, availability, creation, concurrency, and entry points.

---

## 1. High-Level Flow

```
User selects Tenant (salon) → Service → (optional) Staff → Date
    → API returns available time slots
User picks a slot → API creates booking (with optional payment)
    → Appointment created, status 'confirmed', paymentStatus 'pending'
User can list/cancel own bookings via API.
```

**Two entry points:**

- **Authenticated (Client App / Mobile):** User is logged in; `platformUserId` comes from JWT.  
  `POST /api/v1/bookings/create` with `serviceId`, `staffId?`, `startTime`, `tenantId?`.
- **Public (tenant website / PublicPage):** No login. Customer gives name, phone, email.  
  Backend finds or creates a `PlatformUser`, then uses the same booking engine.  
  `POST /api/v1/public/tenant/:tenantId/bookings` with `serviceId`, `staffId?`, `date`, `time`, `customerName`, `customerPhone`, etc.

Both paths call the **unified `BookingService.createBooking()`**; only the source of `platformUserId` differs.

---

## 2. Core Entities

| Entity | Role in booking |
|--------|------------------|
| **Tenant** | Salon/business. Has services, staff, settings (slot interval, buffers, allowAnyStaff, maxBookingsPerCustomerPerDay). |
| **Service** | What can be booked (e.g. "Haircut"). Has `duration`, `bufferBefore`, `bufferAfter`, pricing (`basePrice`, `taxRate`, `commissionRate`). |
| **Staff** | Employee of tenant. Linked to services via **ServiceEmployee**. Has schedule (shifts or legacy StaffSchedule), breaks, time-off. |
| **PlatformUser** | End customer (one account across tenants). Identified by JWT for app, or by phone/email for public booking. |
| **Appointment** | One booking: `serviceId`, `staffId`, `platformUserId`, `tenantId`, `startTime`, `endTime`, `status`, `paymentStatus`, and revenue fields (price, tax, platform fee, tenant revenue, employee commission). |

**Appointment status:** `pending` | `confirmed` | `completed` | `cancelled` | `no_show`.  
New bookings are created as **`confirmed`**.  
**Payment status:** `pending` | `deposit_paid` | `fully_paid` | `refunded` | `partially_refunded`.

---

## 3. Availability Pipeline (How Slots Are Computed)

Availability is handled by **AvailabilityService** (service-first: slots are driven by service duration and buffers).

### 3.1 Entry Points

- **POST /api/v1/bookings/search**  
  Body: `tenantId`, `serviceId`, `date`, `staffId` (optional).  
  Returns slots for that service on that date, either for one staff or for “any staff” (batched).
- **GET /api/v1/bookings/next-available**  
  Query: `tenantId`, `serviceId`, `staffId`, `daysToSearch` (optional, capped by `NEXT_AVAILABLE_MAX_DAYS`).  
  Returns the first available slot in the next N days (or a clear “no slot in window” message).

### 3.2 Steps Inside `getAvailableSlots(tenantId, { serviceId, staffId, date })`

1. **Load service** – Validate tenant ownership, get `duration`, `bufferBefore`, `bufferAfter`.
2. **Load tenant settings** – `slotInterval` (e.g. 15 min), `timezone`, default buffers.
3. **Compute total slot length** – `duration + bufferBefore + bufferAfter` (used to block time and check overlap).
4. **Branch by staff:**
   - **Specific staff:** `_getSlotsForStaff(...)` for that staff only.
   - **Any staff:** `_getSlotsForAnyStaffBatched(...)` – all staff who can perform the service, batched queries for shifts and appointments.
5. **For each staff (or single staff):**
   - **Availability window** – `_calculateAvailabilityWindow(tenantId, staffId, date)`:
     - **Shifts:** Date-specific and recurring shifts for that day; if none, fall back to **StaffSchedule** (day-of-week).
     - **Tenant business hours** – Intersect with tenant working hours.
     - **Breaks** – Subtract staff breaks.
     - **Time-off** – Subtract time-off.
     - **Overrides** – Apply schedule overrides.
   - **Existing appointments** – Load appointments for that staff on that date (exclude `cancelled`, `no_show`).
   - **Generate slots** – For each time window, step by `slotInterval`; for each step, a slot of length `totalSlotLength` is marked **available** only if it does not overlap any existing appointment (considering duration + buffers). Slots are returned with `startTime`, `endTime`, `available`, and optionally staff info.
6. **Response** – `slots[]`, `date`, `totalSlots`, `availableSlots`, `metadata` (e.g. staffCount, serviceDuration).

So: **schedule (shifts/settings) + business hours − breaks − time-off − existing appointments** → available slots per staff; “any staff” aggregates across all eligible staff.

---

## 4. Booking Creation Pipeline (Unified Flow)

All booking creation goes through **BookingService.createBooking(data, options)**.

### 4.1 Inputs

- `serviceId`, `tenantId`, `platformUserId`, `startTime` (required).
- `staffId` (optional) – if null, “Any Staff” is used and the service picks an available staff.

### 4.2 Steps (in order)

1. **Validation**
   - Tenant exists and is approved.
   - Service exists, belongs to tenant, is active.
   - PlatformUser exists, is active, not banned.
   - Start time is valid and at least ~1 hour in the future.

2. **Tenant settings**
   - Read `allowAnyStaff`, `maxBookingsPerCustomerPerDay` from TenantSettings.

3. **Staff resolution**
   - If `staffId` provided: validate staff exists, belongs to tenant, is active, and can perform the service (ServiceEmployee).
   - If no `staffId`: require `allowAnyStaff`; then `_selectBestAvailableStaff(tenantId, serviceId, startTime)` – among staff who can do the service, pick one with no conflict, preferring higher rating.

4. **Time**
   - `start` = parsed start time, `end` = start + service duration.

5. **Policy**
   - If `maxBookingsPerCustomerPerDay` is set, count same-day bookings for this customer at this tenant (exclude cancelled/no_show); reject if over limit.

6. **Conflict check**
   - `hasConflict(staffId, start, end)` – overlap with any existing appointment (excluding cancelled/no_show). Reject if conflict.

7. **Pricing**
   - `Appointment.calculateRevenueBreakdown(service, staff)` → `price`, `rawPrice`, `taxAmount`, `platformFee`, `tenantRevenue`, `employeeRevenue`, `employeeCommissionRate`, `employeeCommission`.

8. **Concurrency (Redis lock)**
   - Lock key: `booking:{staffId}:{startTime ISO}`. If lock not acquired → reject with “slot being booked by another customer”. Hold lock for the rest of creation.

9. **Transaction**
   - Inside a DB transaction: **re-check conflict** (double-check slot still free), then:
     - **Create Appointment** with all revenue fields, `status: 'confirmed'`, `paymentStatus: 'pending'`.
     - Increment `Staff.totalBookings`, `PlatformUser.totalBookings`, `PlatformUser.totalSpent`.
     - Update CustomerInsight (for analytics).
     - Subscription usage: increment booking count for tenant.
   - Commit. Release Redis lock in `finally`.

10. **Errors**
    - Unique constraint on (staff, time) → “Time slot already taken”.
    - Any validation/conflict/lock error → appropriate message; transaction rolled back, lock released.

So: **validate → resolve staff → enforce policy → check conflict → price → lock → re-check conflict → create appointment and side effects → commit**.

---

## 5. Entry Points Summary

| Endpoint | Auth | Purpose |
|----------|------|--------|
| POST /api/v1/bookings/search | No | Get available slots for a service (and optional staff) on a date. |
| GET /api/v1/bookings/next-available | No | Get first available slot in next N days (capped). |
| GET /api/v1/bookings/recommendations | Optional | Staff recommendations for a service (optional preferred time). |
| POST /api/v1/bookings/create | User JWT | Create booking; `platformUserId` from token. |
| GET /api/v1/bookings | Optional | List bookings (user’s if authenticated). |
| GET /api/v1/bookings/:id | Optional | Get one booking (more detail if owner). |
| PATCH /api/v1/bookings/:id/cancel | User JWT | Cancel own booking. |
| POST /api/v1/public/tenant/:tenantId/bookings | No (public) | Create booking; find/create PlatformUser from name/phone/email, then same createBooking. |

---

## 6. Concurrency and Safety

- **Redis lock** – Prevents two users from booking the same (staff, startTime) at the same time; fail with a clear “slot busy” message if lock not acquired.
- **DB transaction** – Final conflict check and appointment creation run in one transaction so that once the lock is held, the slot is committed atomically.
- **Conflict definition** – Any overlap with existing appointments (excluding cancelled/no_show) for that staff; buffers are encoded in slot generation (availability) and in the fact that each appointment reserves its full duration.

---

## 7. Cancellation

- **cancelAppointment(appointmentId, platformUserId)** in BookingService:
  - Load appointment; must belong to `platformUserId` (or platformUserId may be optional for tenant-side cancel).
  - If already cancelled, throw.
  - Update appointment `status` to `'cancelled'`.
  - CustomerInsight cancellation count updated when applicable.
- **PATCH /api/v1/bookings/:id/cancel** – Authenticated user only; ensures the booking belongs to the user, then calls the same cancellation logic.

---

## 8. Pricing and Revenue

- **Appointment** stores: `price` (customer-facing), `rawPrice`, `taxAmount`, `platformFee`, `tenantRevenue`, `employeeRevenue`, `employeeCommissionRate`, `employeeCommission`.
- **Calculation** – `Appointment.calculateRevenueBreakdown(service, staff)` uses service `basePrice`, `taxRate`, `commissionRate`, and staff `commissionRate` to compute all amounts at booking time.
- **Payment** – Appointment is created with `paymentStatus: 'pending'`; actual payment processing (deposit, full, refund) is separate (PaymentTransaction, payment routes).

---

## 9. Tenant and Subscription

- **TenantSettings** – `bookingSettings` (slotInterval, defaultBufferBefore/After, allowAnyStaff, maxBookingsPerCustomerPerDay, etc.), cancellation policy, timezone.
- **Subscription / usage** – After a booking is created, tenant usage is incremented (e.g. `updateUsage(tenantId, 'booking', true)`); subscription limits (e.g. max bookings per month) are enforced by middleware where applicable.

---

## 10. Key Files (Server)

| Area | File(s) |
|------|--------|
| Booking API | `routes/bookingRoutes.js` |
| Booking controller | `controllers/bookingController.js` (search, create, get, list, cancel, next-available) |
| Unified booking logic | `services/bookingService.js` (createBooking, cancelAppointment, hasConflict, _selectBestAvailableStaff) |
| Availability | `services/availabilityService.js` (getAvailableSlots, getNextAvailableSlot, _getSlotsForStaff, _getSlotsForAnyStaffBatched, _calculateAvailabilityWindow, _generateSlots) |
| Public booking | `controllers/publicTenantController.js` (createPublicBooking); `routes/publicRoutes.js` |
| Models | `models/Appointment.js`, `models/Service.js`, `models/Staff.js`, `models/Tenant.js`, `models/TenantSettings.js`, `models/PlatformUser.js` |
| Concurrency | `services/redisService.js` (lock in bookingService), DB transaction in createBooking |

This is how the booking system works from slot discovery to creation, cancellation, and revenue tracking.
