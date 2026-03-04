# 💰 Admin Financial Management - Content Overview

This document provides a "deep-dive" extraction of the **Financial Management** module in the Admin Dashboard. This section is the economic heart of the platform, tracking every riyal from customer payment to tenant payout.

---

## 🏛️ 1. Platform-Wide Financial Dashboard

The central financial hub provides a macroscopic view of platform health with real-time liquidity tracking.

### **Core KPIs (The Big Four):**
- **Total Revenue**: Cumulative gross value of all bookings/sales across the platform.
- **Platform Commission (Your Earnings)**: The actual realized profit for the platform owner.
- **Tenant Revenue**: Total earnings currently held or processed for business owners.
- **Transaction Density**: Total volume and average ticket size tracking.

### **Trend Visualization:**
- **Monthly Revenue Chart**: Multi-layered bar charts comparing **Total Revenue** vs. **Platform Profit** vs. **Tenant Payouts**.
- **Plan-Based Commission Breakdown**: A distribution analysis showing which subscription tiers (Monthly vs. Annual) are driving the most transaction commission.

---

## 🏆 2. Tenant Leaderboard & Performance

A competitive analysis tool used to identify top-performing businesses and high-value accounts.

### **Ranking Metrics:**
- **Dynamic Leaderboard**: Ranking tenants by **Gross Revenue**, **Net Revenue**, and **Commission Generated**.
- **Efficiency tracking**: Comparison of "Active Days" vs. "Bookings" to identify high-frequency businesses.
- **Filter Suite**: ability to segments tenants by **Subscription Plan**, **Minimum Revenue**, and **Specific Search**.

### **Data Portability:**
- **CSV Export**: Ability to generate full financial audit reports for all tenants in the current ranking for external accounting.

---

## 🕵️ 3. Granular Tenant Financial Audits

Clicking into any tenant reveals a specialized sub-dashboard for localized financial oversight.

### **A. Operational Summary**
- **Net vs. Gross**: Visual breakdown of what the tenant earned after the platform took its cut.
- **Average Booking Value (ABV)**: Insight into the tenant's pricing strategy and customer spend.

### **B. Staff-Level Commission Engine**
A deep extraction of individual employee contributions to the tenant's bottom line:
- **Value Handled**: Total riyals processed by a specific staff member.
- **Commission Earned**: Calculated payouts for employees based on their internal tenant rates.
- **Utilization**: Tracking **Hours/Days Worked** vs. **Total Appointments**.

### **C. Transaction Source Ledger**
The definitive source of truth for all financial movements:
- **Transaction Type**: Differentiation between Services, Products, and other fees.
- **Fee Transparency**: Line-item visibility into the **Platform Fee** charged on every single transaction.
- **Payment Method Auditing**: Tracking distribution of Cash vs. Credit vs. Digital Wallet payments.

---

## ⚡ 4. Administrative Logic & Guardrails

- **Period Shifting**: All financial data can be toggled between **7, 30, 90, and 365-day** windows with immediate recalculation.
- **Commission Accuracy**: The system pulls the specific `commission_rate` from the tenant's assigned Package at the time of transaction.
- **Export Control**: Specialized CSV utilities for both **Staff Performance** and **Transaction Logs** to support tenant dispute resolution.
