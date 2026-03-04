# Bugs & Issues Scan Report

**Scope:** Server, Tenant dashboard, Admin dashboard, shared config.  
**Date:** Scan run across key routes, controllers, models, and frontend API usage.  
**Note:** No fixes applied; this document only lists issues and recommended solutions.

---

## 1. Server – Unmounted routes (Record remainder payment / refund)

**Location:** `server/src/routes/tenantPaymentRoutes.js` + `server/src/index.js`

**Issue:**  
`tenantPaymentRoutes.js` defines:

- `GET /tenant/appointments/:id/payment` (getPaymentSummary)
- `POST /tenant/appointments/:id/record-payment` (recordPayment)
- `POST /tenant/appointments/:id/refund` (refundPayment)

This router is **never mounted** in `server/src/index.js`. Only `tenantRoutes` is mounted at `/api/v1/tenant`. So when the tenant dashboard calls:

- `tenantApi.recordRemainderPayment(id, data)` → `POST /api/v1/tenant/appointments/:id/record-payment`

the request hits no handler and returns **404**. “Record remainder payment” in the appointment details page will therefore always fail.

**Solution:**  
Either mount the payment router, or (cleaner) add the same routes to `tenantRoutes.js` and use `tenantPaymentController` there. For example in `tenantRoutes.js`: require `tenantPaymentController`, then add:

- `router.get('/appointments/:id/payment', tenantPaymentController.getPaymentSummary);`
- `router.post('/appointments/:id/record-payment', tenantPaymentController.recordPayment);`
- `router.post('/appointments/:id/refund', tenantPaymentController.refundPayment);`

Ensure these do not conflict with existing PATCH `/appointments/:id/payment` (they are different methods/paths).

---

## 2. Server – Reviews routes wired to payroll controller (naming / structure)

**Location:** `server/src/routes/tenantRoutes.js` (lines 63–66)

**Issue:**  
Tenant “reviews” routes are required from the payroll controller:

```js
const tenantReviewsController = require('../controllers/tenantPayrollController');
router.get('/reviews', tenantReviewsController.getAllReviews);
router.patch('/reviews/:id', tenantReviewsController.updateReview);
```

Functionally this works (getAllReviews and updateReview exist in tenantPayrollController), but:

- The name `tenantReviewsController` points to the payroll controller, which is confusing.
- Review logic lives in the payroll controller instead of a dedicated reviews module.

**Solution:**  
Either rename the variable to something like `tenantPayrollController` and add a short comment that it also exposes review endpoints, or move `getAllReviews` and `updateReview` into a dedicated `tenantReviewsController.js` and require that in tenant routes. The second option improves long-term maintainability.

---

## 3. Tenant dashboard – Verbose debug logging in production

**Location:** `tenant/src/components/CalendarView.tsx` (e.g. lines 443–446, 453, 474, 498)

**Issue:**  
Multiple `console.log` calls are used for avatar/photo debugging, e.g.:

- `[DEBUG] User: …`, `[DEBUG] Photo value:`, `[DEBUG] Has photo:`, `[AVATAR] No valid photo for …`, etc.

These run in the browser for every user viewing the calendar and can clutter the console and leak minor implementation details.

**Solution:**  
Remove these logs, or guard them with a dev-only flag (e.g. `if (process.env.NODE_ENV === 'development')`) or a small debug helper that is disabled in production.

---

## 4. Server – Incomplete / TODO behavior in auth and payments

**Location:** Multiple files (see below)

**Issue:**  
Several TODOs indicate missing or placeholder behavior:

- **userAuthService.js:**  
  - “Queue verification email (TODO)”, “Send verification email”, “Send SMS with code”, “Send password reset email” – verification and reset flows may not send real emails/SMS.
- **userAuthController.js:**  
  - “Implement resend verification” – resend flow may be incomplete.
- **splitPaymentService.js:**  
  - “Get deposit percentage from tenant settings” – deposit logic may use a default instead of tenant-specific settings.
- **bookingService.js:**  
  - “Enhance with workload balance, customer history, etc.” – assignment logic may be simplistic.

**Solution:**  
Review each TODO: either implement the behavior (email/SMS, tenant settings, assignment rules) or document that it’s intentionally deferred and ensure fallbacks (e.g. default deposit %, basic assignment) are safe and explicit.

---

## 5. Tenant dashboard – Possible uncontrolled inputs if API omits new fields

**Location:** `tenant/src/app/[locale]/dashboard/products/[id]/page.tsx` (and similar forms)

**Issue:**  
Product edit (and similar) forms assume the API returns fields like `allowsDelivery` and `allowsPickup`. If the API or DB has not been migrated or some rows lack these columns, those values can be `undefined`, leading to:

- Uncontrolled input warnings when `value` or `checked` goes from undefined to a defined value.
- Errors if code calls `.toString()` on undefined (e.g. in submit handlers).

Similar risk exists for any form that maps API response directly to state without defaulting new or optional fields.

**Solution:**  
When loading API data into form state, default all relevant fields (e.g. `allowsDelivery: prod.allowsDelivery ?? true`, `allowsPickup: prod.allowsPickup ?? true`). In submit and render, use safe fallbacks (e.g. `String(x ?? true)`, `checked={x ?? false}`) so that missing or null values never make the input uncontrolled or throw.

---

## 6. Tenant dashboard – Date input format in calendar view (fixed in codebase)

**Location:** `tenant/src/app/[locale]/dashboard/appointments/page.tsx`

**Issue (historical):**  
In calendar view, `endDate` was set to an ISO datetime string (e.g. `2026-03-02T23:59:59.999`). HTML `type="date"` inputs require `yyyy-MM-dd`. That caused the browser to report that the value did not conform to the required format.

**Solution (already applied in repo):**  
Use a date-only string for both `startDate` and `endDate` when in calendar view (e.g. `setEndDate(dateStr)` instead of `setEndDate(\`${dateStr}T23:59:59.999\`)`). If the backend needs end-of-day for a single-day range, interpret the date-only parameter as end-of-day on the server.

---

## 7. API path mismatch – Employee app invite (fixed in codebase)

**Location:** `tenant/src/lib/api.ts` (previously called `/invite`)

**Issue (historical):**  
The tenant dashboard was calling `POST /tenant/employees/:id/invite`, while the server only defines `POST /tenant/employees/:id/send-invite`. That caused 404 when sending the app invite from the employee edit page.

**Solution (already applied in repo):**  
Update the tenant API client to use the same path as the server: `send-invite` (e.g. `this.post(\`/tenant/employees/${id}/send-invite\`, {})`).

---

## 8. Missing or inconsistent translation keys (i18n)

**Location:** `tenant/messages/en.json`, `tenant/messages/ar.json`, and any component using `useTranslations("Appointments")` (and other namespaces)

**Issue:**  
If a component uses `t("someKey")` but the key is missing from the message file for the current locale, next-intl can throw (e.g. IntlError: MISSING_MESSAGE) or show the key as text. Past issues included missing Appointments keys such as `paymentStatus`, `allPayments`, `remainderDue` (and optionally `depositPaid`, `remainingBalance`, `cash`, `cardPos`, `wallet`, `recordRemainderPayment`).

**Solution:**  
- Add every key used in `t("...")` to the corresponding namespace in both `en.json` and `ar.json`.  
- Optionally add a small script or test that parses the codebase for `t("...")` and checks that those keys exist in the message files.  
- When adding new UI strings, add the key to both locales at the same time.

---

## 9. Tenant suspended – Allowed paths

**Location:** `server/src/middleware/allowSuspendedBillingOnly.js`

**Issue:**  
When a tenant is suspended, only paths in `BILLING_ALLOWED_PATHS` (e.g. `/bills`, `/profile`) are allowed. All other tenant routes (e.g. appointments, employees, settings) return 403. This is by design, but:

- Any new “billing” or “must work when suspended” route must be added to `BILLING_ALLOWED_PATHS`.  
- The first path segment is used for matching; nested paths (e.g. `/bills/123`) are allowed if the first segment is `bills`.  
- If the frontend does not handle 403 + `code: 'ACCOUNT_SUSPENDED'` and redirect to billing, users may see generic errors.

**Solution:**  
Document which routes are intentionally allowed when suspended. In the tenant dashboard, centralize API error handling: on 403 with `ACCOUNT_SUSPENDED`, redirect to the bills page and show a clear message. When adding new billing-related endpoints, add the correct first segment to `BILLING_ALLOWED_PATHS` if they must work while suspended.

---

## 10. Sequelize model – Snake_case vs camelCase (general)

**Location:** `server/src/models/*.js` (any model used with a DB that uses snake_case columns)

**Issue:**  
If the DB has snake_case columns (e.g. `cancellation_fee_type`, `default_delivery_fee`) but the Sequelize model does not set `field: 'snake_case_column'`, Sequelize may generate queries using camelCase and cause “column does not exist” or 500 errors. This has previously affected TenantSettings and similar models.

**Solution:**  
For every attribute that maps to a snake_case column, set `field: 'snake_case_column'` in the model definition. After adding new columns via migrations, ensure the corresponding model attributes have the correct `field` mapping. A quick check: run the app, hit endpoints that load the model, and confirm no DB column errors in logs.

---

## Impact & risk per issue

For each item: **what we solve**, **how critical** it is, and **whether the fix can affect or crash the system**.

| # | What we solve | Criticality | Fix risk (affect/crash system?) |
|---|----------------|-------------|----------------------------------|
| **1** | Tenant can record remainder payments and refunds from appointment details instead of getting 404. | **High** – feature is broken today. | **Low risk.** Only adds routes or wires existing controller; no change to existing routes or shared logic. Unlikely to affect other flows. |
| **2** | Clearer code: reviews logic is either correctly named or moved to a dedicated controller. | **Low** – cosmetic/maintainability. | **Very low.** Rename-only or new file + require; behavior stays the same. No risk of crash. |
| **3** | Cleaner production console; no debug noise or minor info leak. | **Low** – UX/polish. | **Very low.** Removing or guarding `console.log` only. No behavior change; no crash risk. |
| **4** | Emails/SMS, deposit %, and assignment logic either implemented or explicitly documented with safe fallbacks. | **Medium** – depends which TODO (e.g. reset email vs “nice to have”). | **Medium.** Implementing each TODO touches different flows; test after each change. Deferring + documenting is zero risk. |
| **5** | Product (and similar) forms work when API omits new fields; no uncontrolled-input warnings or submit crashes. | **Medium** – only when API/DB lacks those fields (e.g. old rows or no migration). | **Low.** Adding defaults and safe fallbacks (e.g. `?? true`, `String(x ?? '')`) is defensive; reduces crashes, does not change happy path. |
| **6** | *(Already fixed)* Date picker format. | - | - |
| **7** | *(Already fixed)* Employee invite path. | - | - |
| **8** | No missing-message errors or raw keys in UI; consistent EN/AR. | **Medium** – user-facing if keys are missing. | **Very low.** Only adding/editing JSON; no app logic change. No crash risk. |
| **9** | Suspended tenants get clear behavior and UX (allowed paths documented, 403 → redirect to billing). | **Low** – edge case when account is suspended. | **Low.** Documentation + optional frontend redirect; no change to who is suspended or to billing logic. |
| **10** | No “column does not exist” / 500 when model attributes don’t match DB snake_case. | **Medium** – only for models that still lack `field` mapping. | **Low if done per model.** Adding `field: 'snake_case'` fixes queries; wrong mapping could break that model only. Test the specific endpoints that use that model. |

---

## Summary table

| # | Area           | Issue                                         | Severity | Fix complexity |
|---|----------------|-----------------------------------------------|----------|----------------|
| 1 | Server         | record-payment / refund routes not mounted    | High     | Low            |
| 2 | Server         | Reviews routes use payroll controller name    | Low      | Low            |
| 3 | Tenant UI      | CalendarView console.log in production        | Low      | Low            |
| 4 | Server         | TODOs in auth/split/booking services          | Medium   | Medium         |
| 5 | Tenant forms   | Uncontrolled inputs if API omits new fields   | Medium   | Low            |
| 6 | Tenant UI      | Date format for calendar (fixed in repo)       | -        | -              |
| 7 | Tenant API     | Invite path was /invite (fixed to send-invite) | -        | -              |
| 8 | Tenant i18n    | Missing translation keys                      | Medium   | Low            |
| 9 | Server + Tenant| Suspended tenant allowed paths + UX            | Low      | Low            |
|10 | Server models  | Snake_case field mapping                      | Medium   | Low            |

---

**Recommendation:** Address **#1 (unmounted record-payment)** first so “Record remainder payment” works. Then add missing i18n keys (#8) and default form state (#5) where needed. The rest can be scheduled as cleanup and maintainability improvements.

---

## Safe vs careful fixes

- **Safe to fix (low risk of affecting or crashing the system):**  
  **#1** (mount/wire routes), **#2** (rename/restructure), **#3** (remove/guard logs), **#5** (defaults/fallbacks in forms), **#8** (add translation keys), **#9** (docs + optional redirect), **#10** (add `field` only where DB is snake_case and you verify the column name).

- **Needs care (test after each change):**  
  **#4** (each TODO is a separate feature; implement or document one at a time and test that flow).
