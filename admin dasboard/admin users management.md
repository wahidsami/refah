# 👥 Admin Users Management - Content Overview

This document provides a "deep-dive" extraction of the **Platform Users (Customers)** module in the Admin Dashboard. This section manages all end-consumers who book services via the various tenants on the platform.

---

## 👥 1. User Management Overview

Unlike the "Clients" section which manages businesses, the "Users" section focuses on the individual consumers. Administrators use this to track engagement, handle support issues, and manage the platform's internal currency systems.

### **Core Capabilities:**
- **Verification Monitoring**: Tracking the trust-level of users through email and phone validation.
- **Financial Control**: Manual overrides for wallet balances and loyalty rewards.
- **Audit Trails**: Global visibility into a user's entire booking and transaction history across all tenants.

---

## 🔍 2. Detailed Component Extraction

### **A. User Directory (`/dashboard/users`)**
A centralized database for monitoring the platform's consumer base.
- **Search System**: Global search across First Name, Last Name, Email, and Phone Number.
- **Verification Filter**: Ability to isolate verified vs. unverified accounts (Email/Phone).
- **Core Table Matrix**:
  - **Engagement Highlights**: Joined date, Wallet Balance, and Loyalty Points.
  - **Trust Badges**: Visual "✓" or "✗" badges for both Email and Phone verification status.

### **B. Deep User Profile View (`/dashboard/users/[id]`)**
A comprehensive single-customer dashboard featuring data aggregated from all tenant interactions.

#### **1. Identity & Contact Information**
- **Profile Hub**: Display of user avatar, full name, and platform ID.
- **Verification Status**: High-visibility badges for communication channel status.
- **Personal Details**: Gender, Date of Birth, and Preferred Language (e.g., EN/AR).
- **Notification Preferences**: Detailed matrix of opt-in/opt-out statuses for various platform communication channels.

#### **2. Engagement KPIs**
- **Booking Stats**: Real-time counter of **Total Bookings** vs. **Completed Bookings**.
- **Wallet & Loyalty Center**: Interactive cards for the user's financial standing.

#### **3. Financial Management (Adjustment Workflow)**
A critical administrative feature for handling refunds or rewards manually.
- **Adjust Balance Modal**:
  - **Types**: Switch between **Wallet (SAR)** and **Loyalty Points**.
  - **Deduction Logic**: Supports positive numbers (awards) and negative numbers (deductions).
  - **Audit Requirement**: A mandatory "Reason" field is required for every manual adjustment to maintain financial integrity.

#### **4. Historical Data Tables**
- **Recent Bookings**: A chronological list of appointments across the platform, including Service name, Staff, Date, Price, and Status.
- **Transaction History**: Audit trail of financial movements, including **Refunds (+)**, **Payments (-)**, and **Adjustments**, with specific status tracking (Confirmed, Pending, etc.).

---

## ⚡ 3. System States & Logic

- **Image Fallbacks**: Custom circular avatars generated from user initials (e.g., "UA") if no profile image is uploaded.
- **Financial Processing**: Global use of the `Currency` component for consistent SAR formatting.
- **Feedback Loop**: After any balance adjustment, the UI performs a silent re-fetch to ensure the administrator sees the immediate result of their action.
