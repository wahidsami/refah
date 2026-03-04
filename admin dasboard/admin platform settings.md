# ⚙️ Admin Platform Settings - Content Overview

This document provides a "deep-dive" extraction of the **Platform Settings & Configuration** module in the Admin Dashboard. This section defines the global rules and financial parameters that govern the entire ecosystem.

---

## 🏛️ 1. Financial Configuration (Commission & Tax)

The platform's profitability and regulatory compliance are managed through three primary variables:

- **Service Commission Rate (%)**: The default cut taken by the platform from every service booking (e.g., 10.00%).
- **Product Commission Rate (%)**: The cut taken from e-commerce product sales (e.g., 10.00%).
- **Global Tax Rate (VAT) (%)**: The standard value-added tax applied to all transactions across the platform (e.g., 15.00%).

---

## 📦 2. Subscription Tier Repository

The dashboard maintains an overview of the platform's pricing strategy, defining what each tenant package offers:

| Plan | Price (SAR) | Duration | Core Features |
| :--- | :--- | :--- | :--- |
| **Free Trial** | 0 | 30 Days | Basic features, 50 bookings limit. |
| **Basic** | 199 | Month | 200 bookings limit, Email support. |
| **Pro** | 499 | Month | Unlimited bookings, Analytics, Priority support. |
| **Enterprise** | Custom | Custom | API access, White label, Dedicated support. |

---

## 🔐 3. Platform Identity & Governance

- **System Metadata**: Fixed parameters for the platform's core identity:
  - **Platform Name**: Rifah.
  - **Base Currency**: SAR (Saudi Riyal).
  - **Standard Timezone**: Asia/Riyadh.
- **Admin User Management**: A secure ledger of super-administrators with access to the dashboard, tracking:
  - **Full Name & Role** (e.g., "Super Admin").
  - **Authentication Status** (Active/Inactive).
  - **Security Audit**: "Last Login" timestamps for session monitoring.

---

## ⚡ 4. Administrative Workflow

- **Real-time Validation**: Input fields for commission and tax are protected with `min="0"` and `max="100"` constraints to prevent entry errors.
- **Immediate Propagation**: Changes saved here update the global `Settings` object, which is referenced by the pricing and financial reporting engines platform-wide.
- **Persistence**: Using the `updateSettings` API ensuring that configuration changes are synced to the backend database immediately.
