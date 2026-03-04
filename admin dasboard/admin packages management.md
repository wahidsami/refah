# 📦 Admin Packages Management - Content Overview

This document provides a "deep-dive" extraction of the **Subscription Packages** module in the Admin Dashboard. This section defines the monetization and feature-gate logic of the entire platform.

---

## 🏗️ 1. Package Architecture

The platform uses a tiered subscription model where administrators can create highly granular plans with varying resource limits and marketing benefits.

### **Core Plan Attributes:**
- **Bilingual Identity**: Names and Descriptions in both English and Arabic.
- **Hierarchical Ordering**: `displayOrder` determines the sequence on the public pricing page.
- **Featured Status**: Ability to mark a plan as "Most Popular" to drive conversion.

---

## 💰 2. Multi-Tier Pricing Model

Each package supports three distinct billing cycles with automatic savings calculation logic:

| Billing Cycle | Admin Input | Display Logic |
| :--- | :--- | :--- |
| **Monthly** | Base Price | Standard monthly rate. |
| **6-Month** | Total Price | Calculated "Per Month" rate with automated savings vs. base monthly. |
| **Annual** | Total Price | Deepest discount tier with automated "Per Month" breakdown. |

- **Platform Commission**: A specific percentage (e.g., 5.00%) can be set per package, determining the platform's cut from tenant transactions.

---

## 🔒 3. Resource & Feature Limits

Administrators can cap tenant growth or offer "Unlimited" access using the `-1` logic.

### **A. Quantifiable Limits**
- **Bookings/Month**: Max appointments the tenant engine can process.
- **Team Size**: Cap on the number of staff members per tenant.
- **Catalog Size**: Limits on total Services and Products.
- **Digital Storage**: GB limit for gallery and document uploads.

### **B. Functional Toggles**
- **Reporting**: Toggle for Advanced Analytics vs. Basic.
- **Notifications**: Independent switches for **WhatsApp, SMS, Email, and Voice**.
- **Operational Features**: Multi-location (branching), Inventory Management, Loyalty Programs, and Gift Cards.
- **Technical Access**: Toggle for API Access and Dedicated Account Management.

---

## 🚀 4. Promotional & Visibility Features

This unique section allows administrators to sell "Visibility" as part of premium packages, directly impacting the tenant's success in the mobile app.

### **Mobile App Visibility**
- **Home Carousel**: Boolean toggle to include the tenant in the app's hero banner.
- **Carousel Priority**: Granular control (**Low, Medium, High**) over rotation frequency.
- **Search Ranking Boost**: Vertical positioning control (**Standard, Boosted, Top Priority**).

### **Marketing Tools**
- **Hot Deals**: Capacity for special offers (Max count or Unlimited).
- **Auto-Approval**: Logic to allow hot deals to go live without admin review.
- **Banner Ads**: Toggle for homepage banner availability.
- **Campaigns**: Access to Push Notifications and Email Marketing tools.

---

## 🛠️ 5. Administrative Controls

- **Activate/Deactivate**: Seamlessly hide packages from new signups without deleting historical data.
- **Custom Packages**: Ability to flag plans as "Custom" (often used for enterprise deals), which prevents accidental deletion from the main directory.
- **Slug Management**: Automatic generation of URL-friendly IDs for front-end routing.
