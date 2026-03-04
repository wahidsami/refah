# 💰 Tenant Financials Page - Content Overview

This document provides a detailed breakdown of the **Financial Management** section in the Tenant Dashboard.

---

## 📊 1. Financial Overview (`/dashboard/financial`)

The financials page is a comprehensive reporting tool for tracking revenue, deducting fees, and managing payouts.

### **A. Time-Based Filtering**
- **Quick Selectors**: Buttons for Today, This Week, This Month, and This Year.
- **Custom Range**: Start and End date pickers to scope all financial data.

### **B. Key Performance Indicators (KPIs)**
- **Total Revenue**: Gross income from all bookings and product sales (including VAT).
- **Tenant Revenue**: Income remaining after platform commission (Platform Fees).
- **Net Revenue**: The final profit after deducting employee commissions and base salaries.
- **Pending Payments**: Revenue from bookings/orders that are confirmed but not yet "Paid".

### **C. Profit & Loss Breakdown**
A detailed vertical summary of the money flow:
1.  **Raw Price**: Base price of items/services.
2.  **Tax (15% VAT)**: Value-added tax collected.
3.  **Platform Fees**: System-level deduction (shown in red).
4.  **Appointment vs. Product Revenue**: Scoped totals for each business line.
5.  **Employee Commissions**: Total percentage-based payouts to staff.
6.  **Actual Net Revenue**: The final bottom-line amount.

---

## 👥 2. Employee Revenue Analysis

A management tab focused on staff productivity and specialized payroll info.

### **A. Payroll Summary**
- **Total Employees**: Count of active staff in the period.
- **Total Revenue Generated**: Sum of services performed by all staff.
- **Total Commissions**: Cumulative percentage earnings.
- **Total Payroll**: The sum of base salaries and commissions.

### **B. Employee Table**
| Field | Description |
| :--- | :--- |
| **Employee Name** | Name and individual commission rate (%). |
| **Bookings** | Total number of appointments (with paid/unpaid split). |
| **Revenue Generated** | The gross amount brought in by this specific employee. |
| **Base Salary** | Monthly fixed cost for the staff member. |
| **Commission** | Calculated payout based on their specific rate. |
| **Total Earnings** | The final amount owed to the employee (Salary + Commission). |

---

## 💇 3. Service & Product Performance

Dedicated tabs for identifying top-performing inventory and salon offerings.

### **A. Service Revenue Tab**
- Lists services with their Category and specific Unit Price.
- **Bookings**: Tracks popularity of specific treatments.
- **Revenue**: Gross income per service type.
- **Tenant Revenue**: Net income per service after platform deductions.

### **B. Product Revenue Tab**
- Lists retail products with their Category and Unit Price.
- **Orders & Quantity**: Tracks sales volume and specific unit counts.
- **Revenue**: Total retail income.
- **Tenant Revenue**: Net retail income after platform deductions.

---

## 📝 4. System Logic
- **VAT Calculation**: Automatically figured at 15% across all items.
- **Platform Fee**: Variable deduction handled automatically by the system.
- **Real-time Sync**: Financial data updates instantly as soon as a booking or order status changes.
