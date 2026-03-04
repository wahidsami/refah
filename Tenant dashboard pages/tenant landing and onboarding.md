# 🚀 Tenant Landing & Onboarding - Content Overview

This document provides a "deep-dive" extraction of the **Tenant Acquisition & Onboarding** funnel. This is the entry point for all businesses joining the Rifah platform, covering the marketing front-end, the complex registration workflow, and the secure authentication portal.

---

## 🏛️ 1. Marketing Landing Page (The Hook)

The localized landing page serves as the primary value proposition hub for potential business partners.

### **Core Components:**
- **Bilingual Interface**: Seamless toggling between **Arabic** (RTL) and **English** (LTR) versions.
- **Service Pillars**: Highlighting the platform's three "Win" factors:
  - **Booking Efficiency**: Automated 24/7 scheduling.
  - **Staff Management**: Personnel tracking and optimization.
  - **Financial Visibility**: Real-time revenue and payout auditing.
- **Direct Funnels**: Persistent CTAs for "Register Now" (✨) and "Login" (🚀).
- **Localized Trust Badges**: Verification symbols for **Security**, **Speed**, and **Saudi National Compliance** (🇸🇦).

---

## 📝 2. The 7-Step Business Registration (Deep Detail)

The registration process is a rigorous onboarding funnel designed to verify business legitimacy and capture operational parameters.

### **Step 1: Entity Foundation**
- **Identity**: Capture of Legal Business Names in both Arabic and English.
- **Sectorization**: Selection from predefined types (Spa, Salon, Barber, Clinic).
- **Contact Hub**: Email, Phone, Mobile, and optional Business Website.
- **Geospatial Data**: Building Number, District, Street, City, and a **Direct Google Maps Link** for physical location mapping.

### **Step 2: Formal Documentation (The Audit Gap)**
- Mandatory document uploads for backend verification:
  1. **Commercial Registration (CR)**: Number + Document Upload.
  2. **Tax Certificate (VAT)**: Number + Document Upload.
  3. **Operational License**: Number + Document Upload.

### **Step 3 & 4: Human Capital Identity**
- **Contact Person**: The day-to-day manager details (Name, Position, Mobile).
- **Ownership Identity**: Legal Owner's **National ID / Iqama**, Name, and direct contact.

### **Step 5: Operational Profiling**
- **Service Capability**: Toggles for "Home Services", "Product Sales", and "Own Payment Gateway".
- **Density Tracking**: Staff count and primary service description.
- **Quality Self-Assessment**: Initial service ranking (1-5 Stars).

### **Step 6: Subscription Selection**
- **Billing Planes**: Toggles for **Monthly**, **6-Month (10% Sav.)**, and **Annual (17% Sav.)**.
- **Tier Matching**: Selection from the platform's package matrix (Free, Basic, Pro, Enterprise).

### **Step 7: Legal Finalization**
- **Agreement**: Mandatory acceptance of the localized Service Agreement before submission.

---

## 🔐 3. Authentication & Session Gateway

The login portal manages secure access for existing tenants using a standard JWT-based infrastructure.

### **Security Parameters:**
- **Credentials**: Email (Identity) and Password (Encrypted).
- **Session Control**: "Remember Me" toggle for persistent authentication.
- **JWT Management**: 
  - **Access Tokens**: Stored in `sessionStorage` (`rifah_tenant_access_token`) for active session requests.
  - **Refresh Tokens**: Stored in `localStorage` (`rifah_tenant_refresh_token`) to maintain connectivity without repeated logins.

---

## ⚡ 4. Technical Connectivity & Redirects

- **Backend Sync**: Data is submitted via a `FormData` object to the `/auth/tenant/register` endpoint to handle simultaneous JSON fields and binary document uploads.
- **Onboarding Success**: Upon registration, the tenant is granted an immediate access token and redirected to `/[locale]/dashboard?registered=true`.
- **Status Guard**: All authenticated requests pass through the `TenantAuthContext`, which verifies the tenant's `status` (e.g., "Pending" or "Active") to control feature access.
