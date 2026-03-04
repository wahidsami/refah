# Subscription Features and Limits

This document describes the subscription packages, their features, resource limits, and how they are enforced in the platform.

---

## 1. Subscription Model Overview

- **Subscription packages** are defined in `subscription_packages` (model: `SubscriptionPackage`). Each package has:
  - **Identity**: `name`, `name_ar`, `slug`, `description`, `description_ar`
  - **Pricing**: `monthlyPrice`, `sixMonthPrice`, `annualPrice` (SAR)
  - **Limits and features**: JSONB field `limits` (see section 2)
  - **Platform commission**: `platformCommission` (percentage applied to bookings/orders for tenants on this package; can be used for reporting)
  - **Display**: `displayOrder`, `isActive`, `isFeatured`, `isCustom`, `customTenantId`

- **Tenant subscription** (`tenant_subscriptions`, model: `TenantSubscription`):
  - Links a tenant to a package via `packageId`
  - **Billing cycle**: `monthly` | `sixMonth` | `annual`
  - **Status**: e.g. `PENDING_APPROVAL`, `trial`, `active`, `past_due`, `expired`, `cancelled`, `suspended`
  - **Period**: `currentPeriodStart`, `currentPeriodEnd`, `nextBillingDate`, `gracePeriodEnds`

- **Bills** (`bills`): Created for initial payment, renewals, or upgrades. Tenant pays via tokenised link; when paid, subscription becomes active and platform records revenue (see [PLATFORM_REVENUE_REPORT.md](PLATFORM_REVENUE_REPORT.md)).

---

## 2. Limits and Features (Package `limits` JSONB)

The `limits` object on each package controls **resource caps** and **feature flags**. Below is the full structure used in the system (with default/seed examples).

### 2.1 Resource Limits (Numeric)

| Key | Description | Example values | Enforced |
|-----|-------------|----------------|----------|
| `maxBookingsPerMonth` | Max appointments per tenant per calendar month | `20`, `100`, `300`, `1000`, `-1` (unlimited) | Usage stats; can drive alerts/blocking |
| `maxStaff` | Max employees/staff members | `2`, `5`, `15`, `30`, `-1` | Yes – tenant cannot add more staff when at limit |
| `maxServices` | Max services | `5`, `20`, `50`, `100`, `-1` | Yes – tenant cannot add more services when at limit |
| `maxProducts` | Max products in catalog | `0`, `10`, `50`, `200`, `-1` | Yes – tenant cannot add more products when at limit |
| `storageGB` | Storage allowance (GB) | `0.5`, `2`, `10`, `50`, `200` | Used in usage stats (e.g. `storageUsedMB`) |
| `maxAdvanceBookingDays` | How far in advance customers can book (days) | `14`, `30`, `60`, `90`, `180` | Can be used in booking rules |
| `emailMarketingCampaigns` | Email campaigns per month | `0`, `5`, `20`, `100`, `-1` | Can drive marketing limits |
| `smsMarketingCampaigns` | SMS campaigns per month | `0`, `10`, `50`, `-1` | Can drive marketing limits |
| `maxHotDeals` | Max active hot deals | `0` or positive (e.g. per promotion service) | Yes – hot deals creation checked against this |
| `featuredProducts` | Number of featured product slots (e.g. for carousel) | `0` or positive | Used in promotion/carousel logic |

**Note:** `-1` means unlimited wherever applicable.

### 2.2 Boolean Feature Flags

These are checked via **subscription package limits** (and optionally overridden per tenant in `TenantSettings.features`). Access can be gated with `checkTenantFeature('featureKey')` middleware.

| Key | Description |
|-----|-------------|
| `hasAdvancedReports` | Advanced reporting |
| `hasWhatsAppNotifications` | WhatsApp notifications |
| `hasSMSNotifications` | SMS notifications |
| `hasEmailNotifications` | Email notifications |
| `hasVoiceNotifications` | Voice notifications |
| `hasMultiLocation` | Multiple locations per tenant |
| `hasInventoryManagement` | Inventory management |
| `hasLoyaltyProgram` | Loyalty program |
| `hasGiftCards` | Gift cards |
| `hasOnlinePayments` | Online payments (card, etc.) |
| `hasCustomBranding` | Custom branding (logo, colours) |
| `hasAPIAccess` | API access for integrations |
| `hasPrioritySupport` | Priority support |
| `hasDedicatedAccountManager` | Dedicated account manager |
| `customDomain` | Custom domain for tenant site |
| `whiteLabel` | White-label (hide platform branding) |
| `advancedAnalytics` | Advanced analytics |
| `dataExport` | Data export |
| `allowWaitlist` | Waitlist for fully booked slots |
| `allowGroupBookings` | Group bookings |
| `allowMemberships` | Memberships / plans |
| `hasAIContentAssistant` | AI content generation (e.g. product/service/translate) – used in tenant routes |

### 2.3 Marketing and Promotion (from Promotion Service)

Used for tenant visibility and promotions (e.g. featured carousel, hot deals):

| Key | Description | Values |
|-----|-------------|--------|
| `featuredCarousel` | Can appear in featured carousel on platform | `true` / `false` |
| `carouselPriority` | Carousel display priority | e.g. `'low'`, `'medium'`, `'high'` |
| `maxHotDeals` | Max number of active hot deals | number or `0` |
| `hotDealsAutoApprove` / `autoApproveHotDeals` | Hot deals auto-approved (no admin approval) | `true` / `false` |
| `searchRankingBoost` | Search ranking boost | e.g. `'standard'`, `'boosted'`, `'top'` |
| `homepageBanner` | Homepage banner visibility | `true` / `false` |
| `featuredProducts` | Number of featured product slots | number |
| `pushNotifications` | Push notifications | `true` / `false` |
| `emailMarketing` | Email marketing campaigns | `true` / `false` |
| `advancedAnalytics` | Advanced analytics | `true` / `false` |
| `prioritySupport` | Priority support | `true` / `false` |

### 2.4 Support

| Key | Description | Example values |
|-----|-------------|----------------|
| `supportChannels` | Channels offered | `['email']`, `['email','chat']`, `['email','chat','phone']`, `['email','chat','phone','dedicated']` |
| `supportResponseTime` | Target response time | `'48h'`, `'24h'`, `'4h'`, `'1h'`, `'immediate'` |

---

## 3. Default Packages (Seeded)

The seed defines five packages. Actual values in your DB may differ; below is the structure from `server/src/utils/seedPackages.js`.

| Package | Slug | Monthly (SAR) | 6-month (SAR) | Annual (SAR) | Platform commission |
|---------|------|---------------|---------------|--------------|---------------------|
| Free Trial | `free-trial` | 0 | 0 | 0 | 8% |
| Basic | `basic` | 299 | 1,620 | 2,990 | 7% |
| Standard | `standard` | 599 | 3,234 | 5,990 | 5% |
| Premium | `premium` | 999 | 5,394 | 9,990 | 3.5% |
| Enterprise | `enterprise` | 2,499 | 13,494 | 24,990 | 2.5% |

**Resource limits (summary):**

| Limit | Free Trial | Basic | Standard | Premium | Enterprise |
|-------|------------|-------|----------|---------|------------|
| maxBookingsPerMonth | 20 | 100 | 300 | 1,000 | -1 (unlimited) |
| maxStaff | 2 | 5 | 15 | 30 | -1 |
| maxServices | 5 | 20 | 50 | 100 | -1 |
| maxProducts | 0 | 10 | 50 | 200 | -1 |
| storageGB | 0.5 | 2 | 10 | 50 | 200 |
| maxAdvanceBookingDays | 14 | 30 | 60 | 90 | 180 |
| emailMarketingCampaigns | 0 | 5 | 20 | 100 | -1 |
| smsMarketingCampaigns | 0 | 0 | 10 | 50 | -1 |

Higher tiers enable more boolean features (e.g. advanced reports, WhatsApp/SMS, multi-location, inventory, loyalty, gift cards, custom branding, API, priority support, custom domain, white-label, etc.) and better support channels/response times.

---

## 4. How Limits and Features Are Enforced

### 4.1 Resource Limits (Staff, Services, Products, Bookings)

- **Utility**: `tenantLimitsUtil.checkResourceLimit(tenantId, resourceName, getCurrentCountFn)`:
  - Loads tenant’s active (or trial) subscription and package.
  - Reads limit from `package.limits[resourceName]`.
  - `-1` → unlimited (allowed).
  - Otherwise compares current count (from `getCurrentCountFn`) to limit and returns `{ allowed, limit, current, packageName }`.

- **Usage**:  
  - **Staff**: Before creating/activating a new staff member, the tenant dashboard checks `maxStaff`.  
  - **Services**: Before creating a new service, checks `maxServices`.  
  - **Products**: Before creating a new product, checks `maxProducts`.  
  - **Bookings**: Usage stats (e.g. subscription/usage API) show `bookingsThisMonth` vs `maxBookingsPerMonth`; can be used for alerts or soft/hard caps.

- **Tenant-facing API**: `GET /api/v1/tenant/settings/limits` returns merged package limits and current usage for staff, services, products, and bookings.

### 4.2 Feature Flags

- **Middleware**: `authTenant.checkTenantFeature(feature)`:
  1. **Level 1**: `TenantSettings.features[feature] === true` → allow (per-tenant override).
  2. **Level 2**: Active `TenantSubscription` → `SubscriptionPackage.limits[feature] === true` → allow.
  3. **Level 3**: Fallback: match `Tenant.plan` to a package by slug/name and check that package’s `limits[feature]`.
  4. Otherwise → `403` with message that the feature is not in the current plan.

- **Example**: AI routes (e.g. generate product/service, translate) are protected with `checkTenantFeature('hasAIContentAssistant')`.

### 4.3 Hot Deals and Promotions

- **Promotion service** (e.g. `canCreateHotDeal(tenantId)`):
  - Reads `limits.maxHotDeals` (0 = feature off).
  - Counts current active/approved hot deals for the tenant.
  - If under limit (or unlimited), allows creation; optionally uses `hotDealsAutoApprove` / `autoApproveHotDeals` for auto-approval.
- **Featured carousel**: `canBeFeatured(tenantId)` uses `limits.featuredCarousel` and `limits.carouselPriority`.
- **Search**: `getSearchRankingBoost(tenantId)` uses `limits.searchRankingBoost`.

### 4.4 Usage and Alerts

- **Subscription usage API** (e.g. `GET /api/v1/subscription/usage` or similar): Returns for the current tenant:
  - Bookings: current vs `maxBookingsPerMonth`, percentage, unlimited or not.
  - Staff: current vs `maxStaff`.
  - Services: current vs `maxServices`.
  - Products: current vs `maxProducts`.
  - Storage: current MB vs `(limits.storageGB || 1) * 1024` MB.

Alerts and cron jobs can use these to warn or suspend when over limit, depending on configuration.

---

## 5. Billing Cycles and Pricing

- **Cycles**: `monthly`, `sixMonth`, `annual`.
- **Price source**: For a given package and cycle, the amount is taken from `SubscriptionPackage.monthlyPrice`, `sixMonthPrice`, or `annualPrice`. Bills are created with that amount; when the tenant pays, the platform records subscription revenue (see [PLATFORM_REVENUE_REPORT.md](PLATFORM_REVENUE_REPORT.md)).
- **Package commission**: `SubscriptionPackage.platformCommission` is the default platform commission percentage for that package; it can be used for reporting or future per-package commission logic. Current booking/order commission may still be driven by global or service/order-level settings elsewhere.

---

## 6. Summary

- **Subscription features** are defined per package in the `limits` JSONB (resource limits + boolean flags + marketing/support options).
- **Enforcement**: Resource limits (staff, services, products, bookings) use `tenantLimitsUtil.checkResourceLimit`; feature access uses `checkTenantFeature`; hot deals and promotions use the promotion service and package limits.
- **Tenant overrides**: `TenantSettings.features` can override package feature flags for a specific tenant.
- **Default packages**: Free Trial, Basic, Standard, Premium, Enterprise – each with defined pricing, limits, and features as in the seed (and in the tables above).

For how subscription payments contribute to platform revenue, see [PLATFORM_REVENUE_REPORT.md](PLATFORM_REVENUE_REPORT.md).
