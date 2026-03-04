# Rifah Platform: Technical Deep Dive & System Report
**Date:** February 18, 2026
**Version:** 2.1.0 (Mobile Alpha / Web Prod)
**Reference:** Supersedes `Rifah-MultiTenant-Platform.md`

---

## 1. Executive Summary

Rifah is a scalable, multi-tenant SaaS platform developed for the Saudi Arabian beauty and wellness market. It unifies operations for salons, spas, and barbershops into a single ecosystem, providing dedicated web portals for business owners (Tenants) and admins, and a unified booking experience for end-users (Customers) via Web and Mobile.

**Critical Status Update (Feb 2026):**
- **Web Ecosystem:** Fully operational (Phase 2 Complete). All 4 web frontends are stable.
- **Mobile App:** In active Alpha development. Recently upgraded to **Expo SDK 54** (React Native 0.81) to ensure compatibility with modern mobile OS standards.

---

## 2. System Architecture & Topology

The system uses a **Monolithic Backend with Micro-Frontend** architecture. A single robust API server powers four distinct frontend mapping to specific user personas.

### 2.1 Service Map

| Service | Port | Tech Stack | Purpose |
| :--- | :--- | :--- | :--- |
| **Backend API** | `5000` | Node.js + Express | The central brain. Handles all logic, DB connections, and Auth. |
| **Client Web** | `3000` | Next.js 14 | Desktop/Mobile web portal for customers to book services. |
| **Admin Panel** | `3002` | Next.js 14 | Super-Admin SaaS management (Subscription/Tenant control). |
| **Tenant Portal** | `3003` | Next.js 14 | The "Business OS" for salon owners (Staff, Calendar, Reports). |
| **Public Pages** | `3004` | Vite + React | High-performance, SEO-optimized landing pages for each salon. |
| **Mobile App** | N/A | Expo (React Native) | Native iOS/Android app for customers (matches Client Web features). |

### 2.2 Data Infrastructure

- **Database:** **PostgreSQL 15** running on port `5434` (Docker mapping).
  - **Schema Strategy:** Logical Multi-Tenancy. All tables contain a `tenantId` column (foreign key).
  - **ORM:** `Sequelize` handles data access and migrations.
- **Caching:** **Redis 7** running on port `6379`.
  - Usage: Session storage, Rate limiting counters, API response caching.
- **Storage:** Local filesystem (`/server/uploads`) for MVP; architected to switch to AWS S3 easily.

---

## 3. Deep Dive: Mobile Application (`/RifahMobile`)

The mobile application is the primary focus of the current development sprint. It is built to deliver a native performance experience while sharing business logic concepts with the Client Web.

### 3.1 Tech Stack (Precise)
- **Runtime:** Expo SDK 54 (Managed Workflow)
- **Core:** React Native 0.81.4 / React 19.1.0
- **Language:** TypeScript 5.3
- **Navigation:** React Navigation v6 (Native Stack + Bottom Tabs)
- **Styling:** NativeWind (Tailwind CSS for React Native)
- **State:** React Context + Hooks
- **Storage:** `@react-native-async-storage/async-storage` (Session) + `expo-secure-store` (Tokens)

### 3.2 Navigation Architecture
The app uses a hybrid navigation structure to balance performance and UX:
1.  **RootStack:** A Native Stack Navigator handling the top-level flow.
    -   `AuthStack`: Login, Register, Onboarding.
    -   `MainTab`: The core app experience.
2.  **MainTab:** A Bottom Tab Navigator.
    -   `Home`: Dashboard, stats, quick actions.
    -   `Bookings`: List of upcoming/past appointments.
    -   `Notifications`: User alerts.
    -   `More`: Profile, settings, wallet.

### 3.3 Authentication Flow
1.  **Login:** User submits credentials to `/api/v1/auth/user/login`.
2.  **Token Handling:** The Backend issues an `accessToken` (short-lived) and `refreshToken` (long-lived).
3.  **Storage:**
    -   `accessToken` -> Memory (Context) for security.
    -   `refreshToken` -> `SecureStore` (iOS Keychain / Android Keystore).
4.  **Auto-Refresh:** The custom `ApiClient` interceptor catches `401 Unauthorized` errors and silently attempts to refresh the token using the stored `refreshToken` before retrying the failed request.

---

## 4. Deep Dive: Backend Implementation (`/server`)

### 4.1 Multi-Tenancy & Isolation
The system enforces strict data isolation at the ORM layer.
- **Middleware:** `extractTenantContext` reads the `x-tenant-id` header (or subdomain) and attaches it to the request object.
- **Query Scoping:** Service queries automatically inject `where: { tenantId: req.tenantId }` to prevent data leakage between salons.

### 4.2 API Structure
API routes are versioned and segmented by domain:
-   `/api/v1/auth/*`: Authentication endpoints (User, Tenant, Admin).
-   `/api/v1/bookings/*`: Core transaction logic.
-   `/api/v1/public/tenant/*`: Publicly accessible read-only data for landing pages.
-   `/api/v1/tenant/*`: Protected routes for business owners.

### 4.3 Key Data Models
-   `PlatformUser`: A global customer account.
-   `Tenant`: A business entity (Salon).
-   `Service` & `Staff`: Resources belonging to a Tenant.
-   `Appointment`: The intersection record. Links `PlatformUser` + `Tenant` + `Staff` + `Service`.

---

## 5. Development & DevOps Stack

### 5.1 Environment Management
Distinct `.env` files manage configuration for each component.
-   **Security:** `API_URL` is exposed to frontends; Database credentials are strictly backend-only.
-   **Docker:** `docker-compose.yml` orchestrates the persistence layer (Postgres + Redis).

### 5.2 Start-Up Routines
We utilize PowerShell scripts for unified operational control:
-   `start-all-systems.ps1`: Launches Docker, Backend, and specific Frontends in parallel tabs.
-   `restart-all.ps1`: Intelligent port cleaning and service restart.
-   `kill-port.ps1`: Utility to force-close hung processes on specific ports.

---

## 6. Recent Changelog (February 2026)

### 6.1 Major Fix: Mobile Architecture Upgrade
-   **Problem:** The mobile app crashed with `TypeError: right operand of 'in' is not an object` due to a mismatch between Expo SDK 51 and libraries meant for newer React Native versions.
-   **Solution:** Performed a "Nuclear Clean" of the `node_modules` and upgraded the entire project to **Expo SDK 54**.
-   **Result:** App is now stable, performant, and running on the latest React Native architecture.

### 6.2 Feature: Virtual Payments
-   Implemented a mock payment flow in the mobile app to allow end-to-end testing of the booking cycle without real credit cards.

---

## 7. Next Steps Roadmap

1.  **Profile Screen Completion:** Add avatar upload and profile editing to the Mobile App.
2.  **Push Notification Integration:** Connect the Mobile App to Firebase/Expo Push services for booking alerts.
3.  **Real-Time Capabilities:** Implement Socket.io for live updates on booking status changes.
