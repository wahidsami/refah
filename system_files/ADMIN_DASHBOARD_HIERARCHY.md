# Admin Dashboard Hierarchy & Analysis Report

## 1. Overview
The Admin Dashboard is the command center for the Rifah Platform super-admins. It allows for the management of tenants (salons), platform users, subscription packages, financial oversight, and system-wide settings.

**Technology Stack:**
- **Framework:** Next.js 14 (App Router)
- **Path:** `/admin`
- **Authentication:** Dedicated Admin Auth (JWT)
- **Styling:** Tailwind CSS, Custom Admin Layout

## 2. Navigation Structure
The admin dashboard uses a sidebar navigation with the following core sections:
- **Dashboard** (Home)
- **Clients** (Tenants)
- **Users** (Platform Customers)
- **Packages** (Subscriptions)
- **Financial**
- **Marketing** (Hot Deals)
- **Settings**

---

## 3. Detailed Section Analysis

### 3.1. Dashboard (Home)
**Path:** `/dashboard/page.tsx`
**Purpose:** High-level overview of platform health and activity.

**Key Components:**
- **Stats Grid:**
  - **Total Clients:** Count & Growth %.
  - **Total Users:** Count & Growth %.
  - **Total Bookings:** Count & Growth %.
  - **Platform Revenue:** Total currency value & Growth %.
- **Alerts:**
  - **Pending Approvals:** Banner showing number of tenants waiting for review with "Review Now" action.
- **Breakdowns:**
  - **Clients by Type:** Bar chart (Salons vs Spas vs etc).
  - **Clients by Plan:** List (Free Trial, Basic, Pro, etc).
- **Recent Activities:** Live feed of system actions (e.g., "Tenant X registered", "User Y booked Z").
- **Quick Actions:** Shortcuts to Review Pending, All Clients, Manage Users, Financial Reports.

### 3.2. Clients (Tenants)
**Path:** `/dashboard/clients`
**Sub-pages:**
- **List:** `/dashboard/clients/page.tsx`
- **Pending:** `/dashboard/clients/pending/page.tsx`
- **Details:** `/dashboard/clients/[id]/page.tsx`

**List Page Features:**
- **Filters:** Search (Name/Email/Phone) `[Input: Text]`, Status `[Select]`, Business Type `[Select]`, Plan `[Select]`.
- **Table Columns:** Business, Type, Owner, City, Status, Plan, Joined Date.
- **Actions:** View Details.

**Pending Approvals Flow (`/dashboard/clients/pending`):**
1.  **View:** Cards displaying applicant details (Business Name, Type, City, Owner Info).
2.  **Documents:** Checklist of required docs (Commercial Register, License, ID) with status indicators (✓/○).
3.  **Actions:**
    -   **Approve:** Button `[Click]`. Triggers status update to 'active'.
    -   **Reject:** Button `[Click]`. Opens **Rejection Modal**.
        -   **Form:** Reason `[Textarea]`.
        -   **Submit:** Sends rejection email/notification to tenant.

### 3.3. Packages (Subscriptions)
**Path:** `/dashboard/packages`
**Sub-pages:**
- **List:** `/dashboard/packages/page.tsx`
- **Create:** `/dashboard/packages/new/page.tsx`
- **Edit:** `/dashboard/packages/[id]/page.tsx`

**List Page Features:**
- **Display:** Grid of Pricing Cards.
- **Card Content:** Name, Monthly/6-Month/Annual Prices, Savings, Limits (Staff, Bookings, Services), Commission %.
- **Actions:** Edit `[Button]`, Toggle Active/Inactive `[Button]`, Delete `[Button]`.

**Package Form (Create/Edit):**
- **Basic Info:**
  - Name (En/Ar) `[Input: Text]`
  - Description (En/Ar) `[Textarea]`
  - Slug `[Input: Text]` (Auto-generated usually)
- **Pricing:**
  - Monthly Price `[Input: Number]`
  - 6-Month Price `[Input: Number]`
  - Annual Price `[Input: Number]`
- **Limits:**
  - Max Bookings/Month (-1 for unlimited) `[Input: Number]`
  - Max Staff (-1 for unlimited) `[Input: Number]`
  - Max Services (-1 for unlimited) `[Input: Number]`
- **Settings:**
  - Platform Commission % `[Input: Number]`
  - Is Active `[Switch]`
  - Is Featured `[Switch]` (Highlights card)
  - Display Order `[Input: Number]`

### 3.4. Users (Customers)
**Path:** `/dashboard/users`
**Sub-pages:**
- **List:** `/dashboard/users/page.tsx`
- **Details:** `/dashboard/users/[id]/page.tsx`

**List Page Features:**
- **Filters:** Search `[Input: Text]`, Verified Status `[Select]`.
- **Table Columns:** User (Avatar+Name), Contact (Phone), Verified (Email/Phone Checks), Wallet Balance, Loyalty Points, Joined Date.
- **Actions:** View Details.

### 3.5. Financial
**Path:** `/dashboard/financial/page.tsx`
**Purpose:** centralized revenue tracking.

**Features:**
- **Period Selector:** Last 7/30/90/365 Days `[Select]`.
- **Summary Cards:** Total Revenue, Your Commission (Platform Earnings), Tenant Revenue, Total Transactions (with avg value).
- **Charts:**
  - **Monthly Revenue Trend:** Bar chart comparing Total vs Commission vs Tenant Revenue over time.
- **Commission Breakdown:**
  - **Pie Chart:** Revenue share by Subscription Plan.
  - **Table:** Plan, Commission Rate, Tenant Count, Platform Earnings.

### 3.6. Marketing (Hot Deals)
**Path:** `/dashboard/marketing/page.tsx`
**Purpose:** Approval queue for tenant promotional campaigns.

**Flow:**
1.  **List:** Shows all deals with status "Pending".
2.  **Card Details:** Tenant Name, Service, Discount (Value/%), New Price, Valid Dates, Max Redemptions.
3.  **Actions:**
    -   **Approve:** `[Button]` -> Sets deal to active.
    -   **Reject:** `[Button]` -> Prompts for reason -> Sets deal to rejected.

### 3.7. Settings
**Path:** `/dashboard/settings/page.tsx`
**Purpose:** Global platform configuration.

**Forms:**
1.  **Platform Settings (Read-Only/System):** Name, Currency, Timezone.
2.  **Commission & Tax (Form):**
    -   Service Commission Rate (%) `[Input: Number]`
    -   Product Commission Rate (%) `[Input: Number]`
    -   Tax Rate (VAT) (%) `[Input: Number]`
    -   **Action:** Save Settings `[Button]`.
3.  **Subscription Plans (View Only):** Quick summary of available tiers.
4.  **Admin Users (List):** Table of admins (currently read-only list for Super Admin).
