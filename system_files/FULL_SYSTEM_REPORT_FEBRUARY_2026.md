# Rifah Multi-Tenant Booking Platform - Full System Report
**Date:** February 18, 2026
**Version:** 2.1.0 (Mobile Alpha)

---

## 1. Executive Summary
The Rifah Platform is a comprehensive, multi-tenant booking and business management solution designed for the beauty and wellness industry (Salons, Spas, Barbershops). It employs a **monolith-backend / micro-frontend** architecture to serve distinct user personas (Admins, Tenants, Customers) while maintaining data isolation and scalability.

**Current Status:**
- **Web Platform:** Production Ready (Phase 2 Complete).
- **Mobile Component:** Active Development (Alpha). Recently upgraded to **Expo SDK 54** to match modern client standards.

---

## 2. System Architecture

### 2.1 High-Level Topology
The system runs as a collection of distinct services, orchestrated via Docker for data services and Node.js for application logic.

| Service Component | Port | Technology | Purpose |
|-------------------|------|------------|---------|
| **Backend API** | `5000` | Node.js / Express | Core logic, DB access, Auth, Cron jobs. |
| **Client Web** | `3000` | Next.js 14 | Customer booking portal & profile management. |
| **Admin Dashboard** | `3002` | Next.js 14 | Super-admin control (SaaS management). |
| **Tenant Dashboard**| `3003` | Next.js 14 | Business owner portal (Staff, Services, Reports). |
| **Public Page** | `3004` | Vite + React | SEO-optimized public landing pages for tenants. |
| **Mobile App** | N/A | React Native / Expo | Native iOS/Android experience for customers. |

### 2.2 Data Layer
- **Primary Database:** PostgreSQL 15 (Port `5434` mapped)
  - Uses `Sequelize` ORM.
  - Features **JSONB** columns for flexible schema (e.g., `workingHours`, `skills`).
- **Caching & Sessions:** Redis 7 (Port `6379`)
  - Handles session management, API rate limiting, and temporary data.

---

## 3. Technology Stack Breakdown

### 3.1 Backend (`/server`)
- **Runtime:** Node.js
- **Framework:** Express.js 4.x
- **Key Libraries:**
  - `sequelize`: Database ORM.
  - `jsonwebtoken`: Stateless authentication (Access + Refresh tokens).
  - `joi`: Strict request input validation.
  - `helmet` & `cors`: Security headers and Cross-Origin resource sharing.
  - `multer`: File upload handling (local storage in `/uploads`).

### 3.2 Web Frontends (`/client`, `/admin`, `/tenant`)
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Lucide Icons.
- **State:** React Context (Auth, UI State).
- **Intl:** Custom i18n implementation for English/Arabic (RTL support).

### 3.3 Mobile Application (`/RifahMobile`)
- **Framework:** React Native 0.81.4
- **Platform:** Expo SDK 54 (Managed Workflow)
- **Key Libraries:**
  - `expo-router` / React Navigation v6: Routing.
  - `react-native-reanimated` v4: High-performance animations.
  - `expo-secure-store`: Encrypted storage for tokens.
  - `axios`: API networking.

---

## 4. Database Schema Highlights

The database is designed for **Multi-Tenancy**, where data is logically isolated by `tenantId`.

- **Tenants:** The root entity. Contains business info, branding configuration, and subscription status.
- **PlatformUsers:** End customers. Global accounts that can book across multiple tenants.
- **Staff:** Employees linked to a specific Tenant.
- **Services:** Offerings (Haircut, Massage) linked to a Tenant.
- **Appointments:** The core transaction record linking User, Staff, Service, and Tenant.
- **StaffSchedules:** Efficient availability mapping.

---

## 5. Deployment & DevOps

- **Local Development:**
  - Managed via `docker-compose.yml` for DB/Redis.
  - `concurrently` scripts in root `package.json` to launch all web services at once.
- **Environment Configuration:**
  - `.env` files manage secrets (JWT keys, DB credentials).
  - **Security:** `API_URL` is exposed to frontends, but database credentials remain server-side only.

---

## 6. Current Development Focus: Mobile App

The team is currently migrating the **Client Web** features to the **RifahMobile** app.

**Recent Achievements:**
- ✅ **Authentication:** Full Login/Register flow with JWT handling.
- ✅ **Navigation:** Bottom Tabs + Stack navigation implemented.
- **Dashboard:** "Home" screen with booking stats and quick actions.
- ✅ **Infrastructure:** Successfully upgraded to **Expo SDK 54** to resolve compatibility issues.

**Immediate Roadmap:**
1.  Complete **Profile Screen** (Photo upload, Edit details).
2.  Implement **Full Booking Flow** (Calendar -> Slot -> Payment).
3.  Add **Push Notifications**.

---

## 7. Operational Commands

### Start All Systems (Dev)
```powershell
# Root Directory
npm run dev
# OR use the helper script
.\start-all-systems.ps1
```

### Start Mobile App
```bash
cd RifahMobile
npx expo start --clear
```

### Database Management
```bash
cd server
npm run seed  # Populate DB with test data
```
