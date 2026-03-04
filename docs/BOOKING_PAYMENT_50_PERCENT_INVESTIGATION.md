# Booking Payment: 50% Online vs 100% – Investigation

## Short answer

**Today the customer always pays 100% of the booking price** in one go:

- Either **100% online** (after booking, in the client app payment step), or  
- **100% at the tenant center** (no online payment; tenant marks the appointment as “Mark as Paid” in the dashboard).

**Paying 50% online and the rest at the center is not implemented** in any customer flow. The backend has data structures and APIs for deposit + remainder, but no customer or tenant UI uses them for that.

---

## 1. What the backend supports (partially)

- **Appointment model** (`server/src/models/Appointment.js`):
  - `paymentStatus`: `pending` | `deposit_paid` | `fully_paid` | `refunded` | `partially_refunded`
  - `depositAmount`, `depositPaid`, `remainderAmount`, `remainderPaid`, `totalPaid`

- **splitPaymentService** (`server/src/services/splitPaymentService.js`):
  - `calculateSplitPayment(tenantId, totalPrice)` → e.g. 25% deposit, 75% remainder (default 25%, not configurable per tenant yet).
  - `recordRemainderPayment(appointmentId, { amount, paymentMethod, ... })` → records payment at salon and sets `paymentStatus: 'fully_paid'`.
  - `getPaymentSummary(appointmentId)`, `refundPayment(...)`.

- **Tenant payment API** (`server/src/controllers/tenantPaymentController.js`, `tenantPaymentRoutes.js`):
  - `GET /api/v1/tenant/appointments/:id/payment` → payment summary (deposit/remainder/total).
  - `POST /api/v1/tenant/appointments/:id/record-payment` → record remainder (at center).
  - `POST /api/v1/tenant/appointments/:id/refund` → refund.

So the **backend can represent** “deposit paid online, remainder paid at center” and can **record** the remainder via API. But nothing in the booking or payment flows sets a deposit or uses this.

---

## 2. What actually happens today

### 2.1 Creating the booking

- **bookingService.createBooking()** always creates the appointment with:
  - `paymentStatus: 'pending'`
  - No `depositAmount`, `depositPaid`, `remainderAmount`, `remainderPaid`, `totalPaid` (all stay at model defaults: 0 / false).

- **Public booking** (PublicPage) sends `paymentMethod`: `'at-center'` | `'online-full'` | `'booking-fee'`:
  - The controller does **not** pass this to `createBooking()` and does **not** set any deposit/remainder on the appointment.
  - So all public bookings are created the same way: full price, payment pending.

- **Client app** (e.g. BookingFlow) creates the booking then either:
  - Opens the payment modal with **full** `amount` (total price), or  
  - Redirects to the payment page with **full** amount.  
  There is no option to pay only 50% or a deposit.

So at booking creation:

- No flow sets “pay 50% now”.
- No flow sets `depositAmount` / `depositPaid` or uses `deposit_paid` / `fully_paid`.

Result: **the customer is never in a “deposit paid, remainder at center” state.**

### 2.2 Paying for the booking

- **Online:** Customer pays the **full** amount in one payment (client app → `/payments/process` with `amount` = full price). Backend marks the appointment as paid (e.g. `paymentStatus: 'paid'` in the tenant controller; note: model also has `fully_paid` – possible enum mismatch).
- **At center:** No online payment. Tenant uses the dashboard **“Mark as Paid”** on the appointment details page, which calls the **simple** `PATCH .../appointments/:id/payment` (update payment status to `paid`), **not** the “record remainder” endpoint.

So in practice:

- Customer either pays **100% online** or **100% at the center**.
- There is no “pay 50% now, rest later” path and no use of “record remainder” for that.

---

## 3. Tenant dashboard vs split payment

- **Appointment details page** only has **“Mark as Paid”** (and Cancel, etc.). That uses the generic “update payment status” endpoint, which treats the appointment as a single payment (pending → paid).
- The **split-payment** endpoint `POST .../record-payment` exists but:
  - Is only valid when `depositPaid === true` (and remainder not yet paid).
  - No customer flow ever sets `depositPaid`, so in practice this is never used for “remainder at center after 50% online.”

So the tenant **cannot** today use the UI to say “customer already paid 50% online, now paying the rest here.” They can only “Mark as Paid” for the full amount.

---

## 4. Summary table

| Question | Answer |
|----------|--------|
| Can the customer pay 50% online and the rest at the tenant center? | **No.** Not in any current flow. |
| What can the customer do today? | Pay **100% online** (after booking) or **100% at the center** (tenant marks as paid). |
| Is there backend support for deposit + remainder? | **Yes:** model fields, `splitPaymentService`, and tenant `record-payment` / payment summary APIs. |
| Is that support used by any UI? | **No.** No booking or payment UI sets a deposit or uses “record remainder” for a 50/50 flow. |
| What would be needed for “50% now, 50% at center”? | (1) Booking/payment UI to allow “Pay deposit (e.g. 50%)” and call payment with that amount; (2) Backend to set `depositAmount`, `depositPaid`, `paymentStatus: 'deposit_paid'` and optionally `totalPaid` when deposit is paid; (3) Tenant dashboard to show “Remainder due” and “Record remainder” (using existing `record-payment` API) when deposit is paid; (4) Align `paymentStatus` enum everywhere (`paid` vs `fully_paid`) and ensure migrations match. |

---

## 5. Conclusion

- **Customer today:** Always pays **100%** – either fully online or fully at the center.
- **50% online + 50% at center:** **Not implemented**; backend has the building blocks but no flow uses them for that.

If you want to support “pay 50% (or a configurable %) online and the rest at the tenant center,” the next step is to add the booking/payment UI and backend wiring above and to expose “Record remainder” (and payment summary) in the tenant appointment details page.
