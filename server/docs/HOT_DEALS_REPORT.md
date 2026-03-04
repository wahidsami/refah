# Hot Deals – How It Works & Enhancement Recommendations

## 1. End-to-end flow

### Who creates hot deals
- **Tenant** (salon/spa) via tenant dashboard: **Create** and manage their own deals.
- Creation is gated by **subscription package**:
  - `promotionService.canCreateHotDeal(tenantId)` checks active subscription, `limits.maxHotDeals`, and current count of deals (status `active` or `approved`).
  - If the package has `hotDealsAutoApprove` (or `autoApproveHotDeals` in some places), the new deal is created as **auto-approved**; otherwise it is created as **pending**.

### Who approves
- **Super admin** via admin panel: **Approve** or **Reject** deals that are in **pending** state.
- **Approve** sets `status = 'active'`, `approvedBy`, `approvedAt`.
- **Reject** sets `status = 'rejected'` and optional `rejectionReason`.
- Auto-approved tenants skip this step (see bug below: auto-approved deals were created as `approved` and never shown as active).

### Where hot deals are read
- **Tenant:** `GET /api/v1/tenant/hot-deals` – list their deals; `GET /api/v1/tenant/hot-deals/limits` – package limits and whether they can create more.
- **Admin:** `GET /api/v1/admin/hot-deals/pending` – list pending deals for approval/rejection.
- **Public (e.g. mobile):** `GET /api/v1/hot-deals` – returns deals that are **active**, within `validFrom`/`validUntil`, and `isActive === true` (limit 20).

### Limits and auto-approve
- **Package limits** (e.g. in `SubscriptionPackage.limits` JSONB):
  - `maxHotDeals`: max number of deals per tenant (`-1` = unlimited).
  - `hotDealsAutoApprove` or `autoApproveHotDeals`: if true, new deals don’t need admin approval.
- **promotionService:** `canCreateHotDeal()` uses these limits and counts current deals (status in `['active', 'approved']`) to decide if creation is allowed and whether to auto-approve.
- **Controller:** On create, uses `canCreate.allowed` and `canCreate.autoApprove`; no separate “activate at time X” – approval or auto-approve makes the deal live (intended: once active, it’s visible in the public API within its date range).

### Model behavior
- **HotDeal** model: `isValid()` requires `status === 'active'`, `isActive`, and now between `validFrom` and `validUntil`. `canRedeem()` adds a check on `maxRedemptions` vs `currentRedemptions`. `redeem()` increments `currentRedemptions`.
- **Redemption:** The model supports redemption, but **no booking or public API currently applies a hot deal or calls `redeem()`**. So today hot deals are **display-only** from the public API’s perspective.

---

## 2. Issues found (bugs & inconsistencies)

### Critical / correctness
1. **Tenant controller uses `req.user.tenantId`** in create/update/delete, but tenant auth middleware sets **`req.tenantId`** (and `req.tenant`), not `req.user`. So `req.user` is undefined and create/update/delete can break or behave incorrectly. **Fix:** Use `req.tenantId` in create, update, and delete.
2. **Auto-approved deals never appear publicly.** Create sets `status = canCreate.autoApprove ? 'approved' : 'pending'`. Public endpoint and `HotDeal.isValid()` only consider `status === 'active'`. So auto-approved deals stay `approved` and are never shown in `GET /api/v1/hot-deals`. **Fix:** When auto-approving, set `status = 'active'` (same as admin approve).
3. **Service price and name mismatches.** Controller uses `service.price` for `originalPrice`, but **Service** model has `finalPrice` / `rawPrice` / `basePrice`, not `price`. Admin/public includes use `Service` attributes `name` and `price`; the model uses **`name_en`** (and `name_ar`), and no `price`. **Fix:** Use `finalPrice` (or agreed customer-facing field) for price; use `name_en` (and `name_ar`) for service name in includes.

### Consistency
4. **Limit key naming:** `getHotDealsLimits` uses `packageLimits.autoApproveHotDeals`; `promotionService` and `getTenantFeatures` use `hotDealsAutoApprove`. **Recommendation:** Standardize on one key (e.g. `hotDealsAutoApprove`) in package limits and use it everywhere.
5. **Limits count:** Tenant limits endpoint counts `['pending', 'active']`; promotionService counts `['active', 'approved']`. For “how many deals do you have” the tenant view should match what counts toward the cap; cap is enforced on create using `['active', 'approved']`. **Recommendation:** Align both to the same set (e.g. pending + active + approved) for clarity and so tenant UI matches backend logic.

### Gaps (features / UX)
6. **No frontend consumption of public hot deals.** Client app, PublicPage, and RifahMobile do **not** call `GET /api/v1/hot-deals` or show hot deals. So end users never see them unless you add a screen/section that uses this API.
7. **No redemption in booking flow.** There is no link between **Booking/Appointment** and **HotDeal**; no “book with this deal” or application of discounted price and no call to `redeem()`. To make deals actionable, you’d need: a way to pass `hotDealId` (or deal code) into booking, apply discounted price, and call `deal.redeem()` on successful booking.
8. **Update restrictions:** Tenant cannot update a deal when `status === 'active'`. That’s intentional to avoid changing live deals; consider allowing limited edits (e.g. extend `validUntil` or toggle `isActive`) if product needs it.
9. **Expiration:** No cron or job sets `status` to `'expired'` when `validUntil` has passed. The public endpoint filters by date, so expired deals simply disappear from the list; they remain in DB as `active`. Optional: add a job to set `status = 'expired'` for cleaner data and reporting.

---

## 3. Recommendations summary

| Priority | Item | Action |
|----------|------|--------|
| High     | Tenant auth | Use `req.tenantId` in create/update/delete hot deal. |
| High     | Auto-approve | Set `status = 'active'` when auto-approving so deals appear in public API. |
| High     | Service fields | Use `finalPrice` (or chosen field) and `name_en`/`name_ar` in hot deal logic and includes. |
| Medium   | Limit key | Standardize on `hotDealsAutoApprove` (or one name) in package limits and all code. |
| Medium   | Limits count | Align tenant limits count with promotionService (same statuses for “current deals”). |
| Product  | Public UX | Add hot deals section to client/PublicPage/mobile using `GET /api/v1/hot-deals`. |
| Product  | Redemption | Design “book with deal” flow: pass deal to booking, apply price, call `redeem()`. |
| Low      | Expiration | Optional: scheduled job to set `status = 'expired'` when `validUntil` has passed. |

---

## 4. Files touched by hot deals

- **Server:** `server/src/models/HotDeal.js`, `server/src/controllers/hotDealsController.js`, `server/src/routes/hotDealsRoutes.js`, `server/src/services/promotionService.js`, migration `20260123_create_hot_deals.sql`, RLS migrations that reference `hot_deals`.
- **Tenant dashboard:** Hot deals list/create/edit/delete and limits API.
- **Admin:** Marketing (or similar) page for pending hot deals (approve/reject); package create/edit with hot-deals limits and auto-approve.
- **Public API:** `GET /api/v1/hot-deals` (no consumer in codebase yet).

Implementing the high-priority fixes above will make hot deals behave correctly for creation, approval, and public listing; then you can add UI and redemption on top.
