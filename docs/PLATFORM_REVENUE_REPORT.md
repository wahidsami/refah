# Platform Revenue Report: How the System Earns from Tenants and Customer Activities

This document describes how the booking and tenant management platform (Rifah) generates revenue from tenant subscriptions and from customer activities (bookings and product purchases) that flow through tenant businesses.

---

## 1. Overview of Revenue Sources

The platform earns revenue from three main streams:

| Source | Who Pays | Platform Share | Recorded As |
|--------|-----------|-----------------|-------------|
| **Subscription payments** | Tenants (businesses) | 100% of bill amount | `transaction.type = 'subscription'` |
| **Service bookings** | End customers (via tenant) | Commission % on service (e.g. 10%) | `transaction.type = 'booking'` |
| **Product purchases** | End customers (via tenant) | Commission on order (e.g. 2.5% of subtotal) | `transaction.type = 'product_purchase'` |

All completed revenue is stored in the `transactions` table with `platformFee` (platform earnings) and `tenantRevenue` (tenant earnings). The admin Financial section aggregates these for reporting.

---

## 2. Revenue from Tenant Activities

### 2.1 Subscription and Billing

- **What happens**: Tenants subscribe to a plan (e.g. Basic, Standard, Premium) with monthly, 6‑month, or annual billing. For details on packages, limits, and features (e.g. max staff, max services, hot deals, notifications), see **Subscription Features and Limits**: `docs/SUBSCRIPTION_FEATURES.md`. The system creates **Bills** (e.g. initial, renewal, upgrade). When a tenant pays a bill (via the payment link), the bill is marked PAID and the subscription period is activated.
- **Platform revenue**: The full amount paid is treated as platform revenue. For each paid bill, a row is created in `transactions` with:
  - `type = 'subscription'`
  - `amount = bill amount`
  - `platformFee = amount` (100% to platform)
  - `tenantRevenue = 0`
- **Flow**: Registration → Admin approval → Bill created → Tenant pays via tokenised link → `Transaction` created with type `subscription` → Revenue appears in admin Financial (subscription revenue).

### 2.2 Tenant-Side Revenue (No Direct Platform Cut)

- Tenant earnings from **services** and **products** are the remainder after platform commission (see sections 3.1 and 3.2). The platform does not charge tenants extra for using the dashboard; revenue from tenants is **subscription fees only**.

---

## 3. Revenue from Customer Activities (Through Tenants)

Customer activities are bookings (services) and product purchases. The platform takes a **commission** on each payment; the rest is `tenantRevenue`.

### 3.1 Service Bookings (Commission on Each Booking)

- **Pricing model**: Each **service** has:
  - `rawPrice` (base price)
  - `taxRate` (e.g. 15% VAT)
  - `commissionRate` (platform commission %, e.g. 10%)
  
  Final price to customer:  
  `finalPrice = rawPrice + (rawPrice × taxRate/100) + (rawPrice × commissionRate/100)`  

  Platform fee per booking:  
  `platformFee = rawPrice × (commissionRate/100)`  

  Tenant revenue from that booking:  
  `tenantRevenue = rawPrice + taxAmount` (before any employee commission).

- **When a booking is paid** (any of the following), a `Transaction` with `type = 'booking'` is created:
  1. **Online payment (full or deposit)**  
     Customer pays via the payment flow → `paymentService.processPayment` creates a transaction using the appointment’s `platformFee` and `tenantRevenue` (proportional for partial/deposit payments).
  2. **In-person payment**  
     Tenant marks the appointment as paid in the dashboard → a transaction is created with the same appointment-based commission split.
  3. **Remainder payment**  
     Customer had paid a deposit online; tenant records the remainder (e.g. at salon) → `splitPaymentService.recordRemainderPayment` creates a transaction with commission calculated proportionally from the appointment’s total platform fee.

- **Commission rate**: Comes from the **service**’s `commissionRate` (default 10%). It can be driven by global/tenant settings when the service is created or updated.

### 3.2 Product Purchases (Commission on Each Order)

- **Order creation**: When a customer places an **order** (cart of products), the system:
  - Computes subtotal from product prices and quantities.
  - Applies tax (e.g. per product).
  - Sets **platform fee** on the order: e.g. `platformFee = subtotal × 2.5%` (stored on the order).
  - `totalAmount = subtotal + taxAmount + shippingFee` (if any). Tenant revenue from the order is effectively `totalAmount - platformFee`.

- **When the order is paid**, a `Transaction` with `type = 'product_purchase'` is created:
  1. **Online payment**  
     Customer pays via the payment flow → `paymentService.processProductPayment` creates a transaction using the order’s `platformFee` and amount (tenant revenue = amount − platform fee).
  2. **Pay on delivery / pay on visit (POD/POV)**  
     Tenant marks the order as paid in the dashboard → a transaction is created with the order’s stored `platformFee` and `tenantRevenue`.

- **Commission**: Currently applied at order level (e.g. 2.5% of subtotal). Product-level `commissionRate` exists on the product model and can be used for more granular pricing; the order’s `platformFee` is what is used when creating the transaction.

---

## 4. How Revenue Is Stored and Reported

### 4.1 Transactions Table

- Every completed payment that generates platform or tenant revenue is stored in **`transactions`** with:
  - `type`: `'booking'` | `'product_purchase'` | `'subscription'` (and non-revenue types like `wallet_topup`, `refund`, `loyalty_redemption`).
  - `amount`: total payment amount.
  - `platformFee`: amount retained by the platform.
  - `tenantRevenue`: amount attributed to the tenant.
  - `status`: e.g. `'completed'`.
  - Optional links: `tenantId`, `appointmentId`, `orderId`, `platformUserId` (null for subscription).

- **Revenue types** used for platform earnings in reports: `booking`, `product_purchase`, `subscription`.  
  Wallet top-ups and loyalty redemptions are excluded from platform revenue in the Financial section.

### 4.2 Admin Financial Section

- **Overview**: Total revenue, “Your Commission” (sum of `platformFee`), “Tenant Revenue” (sum of `tenantRevenue`), transaction counts, monthly trends, revenue by type (booking / product / subscription), commission by subscription package, bills summary.
- **Reports**: General report (aggregates), detailed report (transaction ledger with filters and pagination). All use the same `transactions` data and revenue types above.

---

## 5. End-to-End Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TENANT ACTIVITY                                                             │
│ • Tenant subscribes → Bill created → Tenant pays bill                        │
│   → Transaction (type: subscription, platformFee = 100%)                    │
│   → Platform revenue = full subscription amount                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ CUSTOMER ACTIVITY (bookings)                                                │
│ • Customer books service → Appointment created with platformFee from service │
│ • Customer pays (online or in-person / remainder)                           │
│   → Transaction (type: booking, platformFee + tenantRevenue)                │
│   → Platform revenue = commission % on service (e.g. 10% of raw price)      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ CUSTOMER ACTIVITY (products)                                                │
│ • Customer places order → Order created with platformFee (e.g. 2.5% subtotal)│
│ • Customer pays (online or POD/POV)                                         │
│   → Transaction (type: product_purchase, platformFee + tenantRevenue)       │
│   → Platform revenue = commission on order                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Summary Table

| Activity | Payer | Platform earns | Tenant earns | Transaction type |
|----------|--------|----------------|--------------|-------------------|
| Tenant pays subscription bill | Tenant | 100% of bill | — | `subscription` |
| Customer pays for a booking (online or in-person) | Customer | Commission % of service (e.g. 10% of raw price) | Remainder (raw + tax, minus employee commission) | `booking` |
| Customer pays for product order (online or POD/POV) | Customer | Commission on order (e.g. 2.5% of subtotal) | Order total − platform fee | `product_purchase` |

All revenue is tracked in `transactions` and reflected in the admin Financial section and reports.
