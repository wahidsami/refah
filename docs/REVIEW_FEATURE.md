# Review Feature – How It Works & Where Customers Add Reviews

## Overview

Reviews are tied to **completed appointments**. A customer can leave **one review per completed appointment**. Reviews can be shown on the tenant’s public page and can include a **staff reply** (from the tenant dashboard or staff app).

---

## Where the Customer Adds a Review (Mobile App)

**Location:** **Bookings** screen → **History** tab.

1. User opens the app and goes to **Bookings** (drawer or menu).
2. Switches to the **History** tab (past bookings).
3. For each **completed** booking, a **“Leave a Review”** button is shown.
4. Tapping it opens **ReviewPromptModal**:
   - Star rating (1–5)
   - Optional comment
   - Submit sends the review to the backend.

So: **reviews are added from My Bookings → History → “Leave a Review” on a completed appointment**, not from the tenant’s profile page. The tenant’s profile **Reviews** tab only **displays** existing reviews (and average rating).

---

## Backend

### Model: `Review`

- `tenantId`, `staffId`, `appointmentId`
- `customerName`, `rating` (1–5), `comment`
- `staffReply`, `staffRepliedAt` (optional reply from business)
- `isVisible` (tenant can hide/show from public)

### Public API (no auth)

| Method | Path | Purpose |
|--------|------|--------|
| **GET** | `/api/v1/public/tenant/:tenantId/reviews` | List **visible** reviews for the tenant page (used by TenantScreen Reviews tab and hero rating). |
| **POST** | `/api/v1/public/tenant/:tenantId/reviews` | Submit a review (body: `staffId`, `appointmentId`, `rating`, `comment?`, `customerName?`). |

### Submit rules

- Appointment must exist, belong to the tenant, and have `status: 'completed'`.
- Only one review per appointment (duplicate returns 400).
- Required: `staffId`, `appointmentId`, `rating`.

### Tenant dashboard (authenticated)

- **GET** `/api/v1/tenant/reviews` – list all reviews (visible and hidden).
- **PATCH** `/api/v1/tenant/reviews/:id` – update `isVisible` (show/hide).

### Staff app (authenticated)

- **GET** `/api/v1/staff/me/reviews` – reviews for that staff member.
- **POST** `/api/v1/staff/me/reviews/:id/reply` – add `staffReply` to a review.

---

## Mobile App Flow

1. **Submit:**  
   `BookingsScreen` (History) → “Leave a Review” → `ReviewPromptModal` → **POST** `/api/v1/public/tenant/:tenantId/reviews` with `staffId`, `appointmentId`, `rating`, `comment`, `customerName`.

2. **Display:**  
   `TenantScreen` (tenant profile) → **GET** `/api/v1/public/tenant/:tenantId/reviews` → show average rating in hero (if any) and full list in the **Reviews** tab (stars, author, comment, date, staff reply).

---

## Summary

| Question | Answer |
|----------|--------|
| **Where does the customer add a review?** | **Bookings** → **History** → on a **completed** booking → **“Leave a Review”** → modal (stars + comment) → Submit. |
| **Where are reviews shown?** | Tenant’s profile in the app: **Reviews** tab and rating badge in the hero (when reviews exist). |
| **Who can reply?** | Tenant (dashboard) or staff (staff app) can add a public reply to a review. |
