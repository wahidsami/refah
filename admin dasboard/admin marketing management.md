# 📣 Admin Marketing Management - Content Overview

This document provides a "deep-dive" extraction of the **Marketing & Promotions** module in the Admin Dashboard. This section manages the platform's high-visibility promotional content, specifically the "Hot Deals" ecosystem.

---

## 🔥 1. Hot Deals Approval Lifecycle

The platform allows tenants to submit "Hot Deals" (steep discounts) which must be vetted by administrators before appearing on the mobile app's front page.

### **Vetting Matrix:**
- **Tenancy Context**: Identification of the business submitting the deal (e.g., "By: Salon Elite").
- **Service Alignment**: Checking which specific service is being discounted.
- **Discount Clarity**: Verification of the value (Percentage vs. Fixed Amount) and the resulting "Discounted Price" vs. "Original Price".
- **Temporal Validity**: Reviewing the `validFrom` and `validUntil` timestamps to ensure seasonal relevance.
- **Redemption Capping**: Visibility into `maxRedemptions` to prevent tenant over-saturation.

---

## 🛠️ 2. Administrative Controls

Adminstrators have two primary actions in this queue:

| Action | Logic | Requirement |
| :--- | :--- | :--- |
| **✓ Approve** | Moves the deal from `Pending` to `Active`. | Confirms the deal meets platform quality standards. |
| **✗ Reject** | Removes the deal from the queue and notifies the tenant. | **Mandatory Rejection Reason** is required via a system prompt. |

---

## 📱 3. Mobile App Integration (Derived)

While this page is administrative, it directly controls the content of the mobile app:
- **Visibility**: Once approved, deals are injected into the "Hot Deals" carousel/section of the consumer app.
- **Trust**: Admin review ensures that "Original Price" values are accurate and not artificially inflated by tenants.

---

## ⚡ 4. Technical Workflow

- **Real-time Queue**: The dashboard uses a dedicated `getPendingHotDeals` endpoint to isolate only deals requiring action.
- **Empty States**: A clean "All caught up! 🎉" state ensures administrators know when the moderation queue is clear.
- **Bilingual Support**: Metadata extraction includes both English (`title_en`) and Arabic titles for cross-market consistency.
