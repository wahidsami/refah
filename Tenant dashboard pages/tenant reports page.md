# 📊 Tenant Reports Page - Content Overview

This document provides a detailed breakdown of the **Reports & Analytics** section in the Tenant Dashboard.

---

## 📈 1. Business Intelligence Overview (`/dashboard/reports`)

The reports page serves as the central hub for monitoring business health, identifying growth patterns, and analyzing performance across multiple dimensions.

### **A. Time-Based Analytics**
Tenants can filter all data using presets to identify trends over different periods:
- **Presets**: Last Week, Last Month (Default), Last Quarter, and Last Year.
- **Dynamic Charting**: Trends adjust granularity (Daily vs. Monthly) based on the selected range.

### **B. Core Performance Cards**
- **Sales Volume**: Total bookings vs. completed appointments.
- **Financial Health**: Gross revenue and average booking value.
- **Success Metrics**: Completion percentage and cancellation/no-show tracking.
- **Client Base**: Number of unique customers served in the period.

---

## 🔍 2. Detailed Performance Tabs

The page is organized into five specialized views to allow for granular data exploration.

### **A. Overview Tab (Default)**
- **Booking Trends Chart**: A visual bar chart showing the daily distribution of appointments over the last 30 units (days or months).
- **Snapshot Cards**: The 4 core KPIs listed above.

### **B. Services Performance Tab**
A table-driven view of what's selling:
- **Booking Frequency**: Total vs. Completed counts per service.
- **Revenue Contribution**: Total and average revenue generated per treatment.
- **Reliability**: Completion rate percentage per service to identify high-cancellation items.

### **C. Employee Performance Tab**
Efficiency and productivity tracking for the team:
- **Workload**: Total appointments handled.
- **Revenue Impact**: Gross sales and calculated commissions.
- **Efficiency**: Personal completion rates for each staff member.

### **D. Peak Hours Analysis Tab**
Data visualization for staffing optimization:
- **Hourly Distribution**: Bar chart showing volume per hour of the day.
- **Daily Distribution**: Weekly heatmap showing the busiest days (e.g., Friday/Saturday).
- **Recommendations**: Explicit labels for "Peak Hours" and "Busiest Days" based on history.

### **E. Customer Analytics Tab**
Insights into client loyalty and retention:
- **Engagement Stats**: Total, New, and Returning customer counts.
- **Loyalty Segments**: 
  - **One-time**: Customers with a single visit.
  - **Occasional/Regular**: Incremental loyalty levels.
  - **Loyal**: High-frequency VIP clients.
- **Revenue per Segment**: Comparison of how much each group contributes to total sales.

---

## ⚙️ 3. Reporting Characteristics
- **Multilingual UI**: Full support for English and Arabic layout (RTL).
- **Interactive Tooltips**: Hovering over charts provides specific data points.
- **Automatic Sync**: Data is pulled directly from the tenant API, ensuring reports reflect the most recent bookings and orders.
