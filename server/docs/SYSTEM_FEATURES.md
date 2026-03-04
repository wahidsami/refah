# System Features – Current & Future Enhancements

**Rifah Booking System** – Multi-tenant salon/spa/barbershop platform.  
This document lists **all current system features** and **suggested future enhancements**.

---

## 1. System overview

| Component | Tech | Purpose |
|-----------|------|---------|
| **Server** | Node.js, Express, Sequelize, PostgreSQL | API, auth, business logic, RLS |
| **Client** | Next.js (customer app) | User registration, login, booking, tenant discovery, wallet, payments, purchases |
| **Tenant** | Next.js (tenant dashboard) | Salon/spa management: employees, services, products, appointments, financials, reports, settings, public page, hot deals, schedules |
| **Admin** | Next.js (admin dashboard) | Super-admin: tenants, users, packages, financials, stats, settings, marketing (hot deals approval) |
| **PublicPage** | React (Vite) | Tenant’s public website: services, products, booking, orders, contact, cart, checkout |
| **RifahMobile** | React Native / Expo | Mobile app: login, register, home, tenant view, booking flow, dashboard, bookings, purchases, profile |

**API base:** `/api/v1/` with role-based routes (user auth, tenant auth, admin auth, public).

---

## 2. Current system features

### 2.1 Authentication & user management

| Feature | Description | Where |
|--------|-------------|--------|
| **End-user (platform) registration** | Register with email, phone, password, name, optional DOB/gender/avatar; email verification token; duplicate email/phone check | `POST /api/v1/auth/user/register` |
| **End-user login / logout** | JWT access + refresh tokens; logout invalidates refresh token | `POST /api/v1/auth/user/login`, logout |
| **Refresh token** | Issue new access token using refresh token | `POST /api/v1/auth/user/refresh-token` |
| **Email verification** | Verify email via token (endpoint exists; send email optional) | `GET /api/v1/auth/user/verify-email/:token` |
| **Phone verification** | Send OTP, verify phone (endpoints exist) | Send, verify |
| **Forgot / reset password** | Request reset, reset with token | Forgot, reset |
| **Resend verification** | Resend email verification (authenticated) | `POST /api/v1/auth/user/resend-verification` |
| **User profile** | Get/update profile; upload profile photo; change password | `/api/v1/users/profile`, photo, password |
| **Payment methods** | List, add, set default, delete payment methods (user) | `/api/v1/users/payment-methods` |

| Feature | Description | Where |
|--------|-------------|--------|
| **Tenant registration** | Multi-step: entity details, documents (logo, CR, tax, license), contact, owner, business details, package selection, password; slug from name; initial subscription; welcome/approval emails | `POST /api/v1/auth/tenant/register` |
| **Tenant login / logout** | JWT; tenant identity attached to request | `POST /api/v1/auth/tenant/login`, logout |
| **Tenant profile** | Get/update tenant profile | `/api/v1/tenant/profile` |

| Feature | Description | Where |
|--------|-------------|--------|
| **Super-admin login / logout** | JWT; permissions (tenants, users, financial, settings) | `POST /api/v1/auth/admin/login`, logout |
| **Super-admin profile & change password** | Get profile, change password | Profile, change-password |

---

### 2.2 Tenant (business) management

| Feature | Description | Where |
|--------|-------------|--------|
| **Dashboard** | Stats, today’s appointments, revenue chart | `/api/v1/tenant/dashboard/*` |
| **Employees (staff)** | CRUD; photo upload; list, get, create, update, delete | `/api/v1/tenant/employees` |
| **Employee schedules** | Shifts (by day of week), breaks, time-off, overrides – full CRUD | `/api/v1/tenant/employees/:id/shifts`, breaks, time-off, overrides |
| **Services** | CRUD; image upload; bilingual (name_en, name_ar); duration; pricing (rawPrice, taxRate, commissionRate, finalPrice); active, center/home | `/api/v1/tenant/services` |
| **Products** | CRUD; multiple images; bilingual; price, stock (if used) | `/api/v1/tenant/products` |
| **Appointments** | List, calendar view, stats, get by id; update status; update payment status | `/api/v1/tenant/appointments` |
| **Appointment payments (tenant)** | Get payment summary; record payment; refund | `tenantPaymentController` (routes in `tenantPaymentRoutes.js` – confirm mounted at `/api/v1` if used) |
| **Financial** | Overview; revenue by employee, service, product; daily revenue; employee financial details | `/api/v1/tenant/financial/*` |
| **Customers** | List with filters (e.g. loyalty tier); stats; export (CSV); get customer, history; update notes | `/api/v1/tenant/customers` |
| **Orders** | List, get by id; update order status and payment status | `/api/v1/tenant/orders` |
| **Settings** | Get settings; update business, working hours, booking, notifications, payment, localization, appearance; upload logo and cover image | `/api/v1/tenant/settings/*` |
| **Reports** | Dashboard summary; booking trends; service performance; employee performance; peak hours; customer analytics | `/api/v1/tenant/reports/*` |
| **Public page (tenant)** | Get/update public page data; hero slider; appearance (templates) | `/api/v1/tenant/public-page` |

---

### 2.3 Bookings & availability

| Feature | Description | Where |
|--------|-------------|--------|
| **Availability search** | Slots for a date; optional staff; respects shifts, breaks, time-off, overrides, existing appointments; tenant-scoped | `POST /api/v1/bookings/search` (tenantId in body or context) |
| **Next available slot** | First available slot for service (optional staff); configurable max days; validation (e.g. 1–60 days) | `GET /api/v1/bookings/next-available` |
| **Staff recommendations** | AI-style recommendations for staff (optional auth for better personalization) | `GET /api/v1/bookings/recommendations` |
| **Create booking** | Authenticated user; uses unified BookingService; conflict detection; loyalty tier update (per tenant); max bookings per customer per day (tenant setting) | `POST /api/v1/bookings/create` |
| **List / get / cancel booking** | List (optional auth); get by id; cancel (authenticated, own only) | GET, PATCH cancel |
| **Public booking** | Create booking from public page (tenant context); no platform user required (guest booking) | `POST /api/v1/public/tenant/:tenantId/bookings` |

---

### 2.4 Orders & products (end-user)

| Feature | Description | Where |
|--------|-------------|--------|
| **Create order** | Authenticated user; cart/items; tenant-scoped | `POST /api/v1/orders` |
| **User orders** | List user’s orders; get by id; cancel | GET, PATCH cancel |
| **Update order status** | Tenant updates status (e.g. fulfilled) | `PATCH /api/v1/orders/:id/status` (tenant auth) |
| **Public order** | Create order from tenant public page | `POST /api/v1/public/tenant/:tenantId/orders` |

---

### 2.5 Payments & wallet

| Feature | Description | Where |
|--------|-------------|--------|
| **Process payment** | Pay for booking/order (authenticated user; rate limited) | `POST /api/v1/payments/process` |
| **Wallet top-up** | Add balance to user wallet | `POST /api/v1/payments/wallet/topup` |
| **Payment history** | User’s payment history | `GET /api/v1/payments/history` |
| **Split payment** | Service for splitting amounts (e.g. tenant vs platform) | `splitPaymentService` |
| **Tenant payment settings** | Accept cash/card/wallet; payout bank account (settings) | Tenant settings |

---

### 2.6 Subscriptions & packages

| Feature | Description | Where |
|--------|-------------|--------|
| **Available packages** | Public list of subscription packages (for registration/browsing) | `GET /api/v1/subscription/packages` (or `/api/v1/subscriptions/packages`) |
| **Current subscription** | Tenant’s current plan (authenticated tenant) | `GET /api/v1/subscription/current` |
| **Usage stats** | Usage against package limits | `GET /api/v1/subscription/usage` |
| **Usage alerts** | Alerts when approaching limits; acknowledge | GET alerts, PATCH acknowledge |
| **Change request** | Request upgrade/downgrade | `POST /api/v1/subscription/change-request` |
| **Package limits** | Stored in SubscriptionPackage.limits (e.g. maxStaff, maxHotDeals, hotDealsAutoApprove, featuredCarousel, etc.) | Model + promotionService, checkSubscription |

---

### 2.7 Hot deals & featured tenants

| Feature | Description | Where |
|--------|-------------|--------|
| **Hot deals (tenant)** | Create deal (service, discount, validity, max redemptions); package limit + auto-approve; list, update (non-active), delete; get limits | `/api/v1/tenant/hot-deals`, limits |
| **Hot deals (admin)** | List pending; approve (→ active); reject with reason | `/api/v1/admin/hot-deals/pending`, approve, reject |
| **Hot deals (public)** | List active deals (status=active, within dates, isActive; limit 20) | `GET /api/v1/hot-deals` |
| **Featured tenants** | Public list of featured tenants; tenant’s own featured status (auth) | `GET /api/v1/featured-tenants`, tenant status |

---

### 2.8 Admin (super-admin)

| Feature | Description | Where |
|--------|-------------|--------|
| **Financial** | Dashboard overview; platform summary; tenant financials; leaderboard; monthly comparison; commission by plan; top employees; transaction details per tenant; employee metrics | `/api/v1/admin/financial/*` |
| **Stats** | Dashboard stats; recent activities; chart data | `/api/v1/admin/stats/*` |
| **Tenants** | List; pending; details; activities; update; approve; reject; suspend; activate (permission-based) | `/api/v1/admin/tenants/*` |
| **Users (platform)** | List; user details; update; toggle status; adjust wallet/loyalty balance | `/api/v1/admin/users/*` |
| **Packages** | List; stats; get, create, update, delete subscription packages | `/api/v1/admin/packages/*` |
| **Settings** | Get/update admin settings; global settings (public endpoint) | `/api/v1/admin/settings`, `GET /api/v1/settings/global` |

---

### 2.9 Public API & tenant public page

| Feature | Description | Where |
|--------|-------------|--------|
| **Tenant listing** | All active/approved tenants; search; pagination; service/staff/open-now counts | `GET /api/v1/tenants` |
| **Tenant by slug** | Get tenant by slug (public page context) | `GET /api/v1/public/tenant/:slug` |
| **Public page data** | Tenant’s public page content (by tenantId) | `GET /api/v1/public/tenant/:tenantId/page-data` |
| **Public services/products/staff** | List services, products, staff; get by id; staff by service | `/api/v1/public/tenant/:tenantId/services|products|staff` |
| **Contact form** | Submit contact message to tenant | `POST /api/v1/public/tenant/:tenantId/contact` |

---

### 2.10 Loyalty & customer insights

| Feature | Description | Where |
|--------|-------------|--------|
| **CustomerInsight (per tenant)** | totalBookings, totalSpent, loyaltyTier (bronze/silver/gold/platinum), tenantLoyaltyPoints; favorite services/staff; preferred times | Model + bookingService (tier from totalSpent), tenantCustomerController |
| **Platform user** | walletBalance, loyaltyPoints, totalSpent, totalBookings; notificationPreferences (email, sms, whatsapp, push) | PlatformUser model; admin can adjust wallet/loyalty |

---

### 2.11 Infrastructure & security

| Feature | Description | Where |
|--------|-------------|--------|
| **Row-Level Security (RLS)** | Tenant-scoped tables; `app.tenant_id` set for tenant routes; policies allow by tenant or when unset (admin/public) | rlsSession, setTenantContext, migrations |
| **Tenant context** | AsyncLocalStorage + setTenantContext middleware for tenant routes | tenantContext, setTenantContext |
| **Rate limiting** | General, auth, password-reset, payment, upload limiters | rateLimiter middleware |
| **Health & readiness** | Health check; metrics; ready (e.g. DB + Redis) | `/health`, `/metrics`, `/ready` |
| **CORS** | Environment-based origins (production: rifah.sa domains; dev: localhost) | index.js |
| **Uploads** | Static serve for /uploads (avatars, tenants, etc.); CORS/CORP for images | index.js |
| **Request ID & logging** | requestId middleware; request logger | requestId, requestLogger |
| **Error handler** | Centralized JSON error responses | errorHandler |
| **Audit logging** | Security/audit events (e.g. login, registration, export) | auditLogger |
| **Redis** | Cache/session (init in index) | redisService |
| **Metrics** | Request counts, etc. | metricsMiddleware, metrics |
| **DB pool & slow query** | Pool metrics logger; slow query logging (Postgres) | poolMetricsLogger, slowQueryLogger |

---

### 2.12 Client app (customer-facing)

| Feature | Description |
|--------|-------------|
| **Auth** | Login, register (with avatar), logout; auth context |
| **Tenant discovery** | Tenant list; tenant by slug |
| **Booking** | Booking flow; availability; create booking |
| **Purchases / orders** | Product purchase flow; payment; purchase history |
| **Dashboard** | Profile, bookings, wallet, payments, payment methods, settings |
| **i18n** | English / Arabic |
| **PWA** | PWA installer (optional) |

---

### 2.13 Tenant dashboard (tenant app)

| Feature | Description |
|--------|-------------|
| **Auth** | Login, register (multi-step with documents and package) |
| **Dashboard** | Stats, today’s appointments, revenue |
| **Employees** | List, add, edit, delete; schedules (shifts, breaks, time-off, overrides) |
| **Services & products** | CRUD; images |
| **Appointments** | List, calendar, stats; update status/payment |
| **Orders** | List; update status/payment |
| **Financial** | Overview; revenue by employee/service/product; daily |
| **Customers** | List, export, customer detail, history, notes |
| **Settings** | Business, working hours, booking, notifications, payment, localization, appearance; logo/cover |
| **Reports** | Summary, trends, service/employee performance, peak hours, customer analytics |
| **Public page** | Edit public page data; hero slider; templates |
| **Hot deals** | List, create, edit (within limits); view limits |
| **Mypage** | Tenant profile / account |

---

### 2.14 Admin dashboard

| Feature | Description |
|--------|-------------|
| **Auth** | Login, logout |
| **Dashboard** | Overview stats, charts |
| **Clients (tenants)** | List; pending approvals; tenant detail; approve/reject/suspend/activate |
| **Users** | List; user detail; toggle status; adjust wallet/loyalty |
| **Financial** | Platform and per-tenant financials; leaderboard; commissions |
| **Packages** | List; create/edit/delete subscription packages (with limits, e.g. hotDealsAutoApprove) |
| **Settings** | Admin and global settings |
| **Activities** | Recent activity log |
| **Marketing** | Pending hot deals; approve/reject |

---

### 2.15 PublicPage (tenant website)

| Feature | Description |
|--------|-------------|
| **Landing** | Hero, about, services, products, contact |
| **Tenant context** | Slug/tenantId; fetch page data, services, products, staff |
| **Booking** | Booking modal/flow (public booking API) |
| **Orders / cart** | Cart; checkout; create order (public order API) |
| **Contact** | Contact form submit |
| **Auth** | Login modal (for checkout if needed) |
| **Templates** | Multiple theme templates |

---

### 2.16 RifahMobile (mobile app)

| Feature | Description |
|--------|-------------|
| **Onboarding & welcome** | Onboarding screens; welcome; language selection |
| **Auth** | Login; register (with avatar, DOB, gender; profile photo upload); profile edit photo |
| **Home** | Home screen (tenants/featured) |
| **Tenant** | Tenant detail (services, etc.) |
| **Booking** | Booking flow |
| **Dashboard** | User dashboard |
| **Bookings & purchases** | List bookings; list purchases |
| **Payment** | Payment screen |
| **Profile / More** | Profile; more options |
| **i18n** | Arabic/English |

---

## 3. Suggested future enhancements

### 3.1 Product & UX

- **Hot deals visibility**  
  Consume `GET /api/v1/hot-deals` in Client, PublicPage, and RifahMobile (e.g. “Hot deals” section or banner).

- **Hot deal redemption in booking**  
  Allow “book with this deal”: pass `hotDealId` into booking, apply discounted price, and call `HotDeal.redeem()` on success.

- **End-user notifications**  
  Implement sending for email/SMS/push (templates and preferences exist; wire to booking confirmations, reminders, promotions).

- **Tenant notifications**  
  Implement email/SMS/WhatsApp/voice for new bookings, reminders, no-shows (settings exist; backend sending optional).

- **Reviews & ratings**  
  Let customers rate services/staff after appointment; show on public page and in recommendations.

- **Waitlist**  
  Allow customers to join a waitlist when no slot is available (package limit `allowWaitlist` exists).

- **Memberships / packages**  
  Support membership tiers or prepaid service packages (e.g. 10 sessions) if desired.

- **Gift cards**  
  Model/settings support exists; implement purchase and redemption flow.

---

### 3.2 Platform & admin

- **Tenant payment routes**  
  Confirm `tenantPaymentRoutes` (record payment, refund) are mounted (e.g. at `/api/v1`) if tenant dashboard uses them.

- **Hot deal expiration job**  
  Scheduled job to set `status = 'expired'` when `validUntil` has passed for cleaner data and reporting.

- **Standardize package limit keys**  
  Use a single key for hot-deals auto-approve (e.g. `hotDealsAutoApprove`) across packages and all code.

- **Admin: tenant usage dashboard**  
  View usage vs limits (bookings, staff, services, hot deals) per tenant and package.

- **Admin: global content**  
  Manage banners, featured carousel content, or marketing copy from admin.

- **Data export (admin)**  
  Export tenants, users, or financial data (with audit log) for compliance or analytics.

---

### 3.3 Technical & performance

- **Availability caching**  
  Short TTL cache for availability results per tenant/date/service to reduce DB load on peak traffic.

- **Idempotent payments**  
  Idempotency keys for payment and wallet top-up to avoid duplicate charges on retries.

- **Email delivery**  
  Complete email sending (verification, welcome, password reset, booking confirmation) with a transactional provider (e.g. SendGrid, SES).

- **SMS/WhatsApp**  
  Integrate SMS and WhatsApp for OTP and notifications using tenant/admin settings.

- **Push notifications (mobile)**  
  FCM/APNs for mobile app (user preference already in PlatformUser).

- **Audit trail for sensitive actions**  
  Extend audit log for admin actions (tenant approve/reject, user balance change, package changes).

- **API versioning & deprecation**  
  Clear policy for v2 and deprecation of old endpoints.

---

### 3.4 Security & compliance

- **Stricter RLS (optional)**  
  For tenant-scoped tables, require `app.tenant_id` when accessed by tenant role (no “allow when unset” for that path).

- **2FA for admin / tenant**  
  Optional TOTP for super-admin and tenant logins.

- **GDPR/data subject requests**  
  Export user data and handle delete/anonymize for compliance.

- **PCI scope reduction**  
  Keep card data with payment provider (e.g. Stripe); avoid storing full card numbers.

---

### 3.5 Analytics & business

- **Tenant analytics**  
  Funnel reports (views → bookings → revenue); channel attribution if you add UTM or source.

- **Platform analytics**  
  Cohort retention, LTV per tenant, churn by package.

- **Loyalty rewards**  
  Use `tenantLoyaltyPoints` and `loyaltyTier` for discounts or free services (today tier is computed; redemption not wired).

- **Redeem points (UI)**  
  Client i18n has “redeemPoints”; implement redeem flow (e.g. discount or free slot).

---

## 4. Quick reference – API areas

| Area | Base path | Auth |
|------|-----------|------|
| User auth | `/api/v1/auth/user` | — |
| Tenant auth | `/api/v1/auth/tenant` | — |
| Admin auth | `/api/v1/auth/admin` | — |
| Tenant dashboard | `/api/v1/tenant/*` | Tenant JWT |
| Admin | `/api/v1/admin/*` | Super-admin JWT |
| Bookings | `/api/v1/bookings` | Mixed (search public; create user) |
| Users | `/api/v1/users` | User JWT |
| Payments | `/api/v1/payments` | User JWT |
| Orders | `/api/v1/orders` | User / Tenant |
| Subscription | `/api/v1/subscription`, `/api/v1/subscriptions` | Tenant / Public |
| Public | `/api/v1/public/tenant/:tenantId|:slug` | — |
| Tenants list | `/api/v1/tenants` | — |
| Hot deals | `/api/v1/hot-deals`, `/api/v1/tenant/hot-deals`, `/api/v1/admin/hot-deals` | Public / Tenant / Admin |
| Featured | `/api/v1/featured-tenants` | — |
| Health | `/health`, `/metrics`, `/ready` | — |

---

*Document generated from codebase scan. Last updated: Feb 2025.*
