# 📦 Tenant Orders Page - Content Overview

This document provides a detailed breakdown of the **Orders Management** section in the Tenant Dashboard.

---

## 📋 1. Orders Main Page (`/dashboard/orders`)

The orders main page allows tenants to track and manage all customer orders.

### **A. Header & Stats**
- **Title**: "Orders" (Arabic: "الطلبات").
- **Subtitle**: View and manage your product orders.
- **Summary Cards**:
  - **Total Orders**: All-time order count.
  - **Pending Orders**: Orders awaiting confirmation or processing.
  - **Completed Orders**: Successfully fulfilled orders.
  - **Cancelled Orders**: Orders that were voided or returned.

### **B. Advanced Filtering**
- **Date Range**: Filter orders by "Start Date" and "End Date".
- **Order Status Filter**: (Pending, Confirmed, Processing, Ready for Pickup, Shipped, Delivered, Completed, Cancelled).
- **Payment Status Filter**: (Pending, Paid, Failed, Refunded).
- **Search**: Search by customer name, phone, or order number.

### **C. Orders Table**
Each row represents a specific purchase with the following details:
- **Order Number**: Unique identifier (e.g., #ORD-123).
- **Customer**: Profile photo, name, and contact phone.
- **Items**: Count and partial list of names with quantities.
- **Conditions**: Payment Method (Online, COD, Pay on Visit) and Delivery Type (Pickup, Delivery).
- **Status Badges**: Color-coded indicators for both Order and Payment state.
- **Financials**: Total amount in SAR.

---

## 🔍 2. Order Details Page (`/dashboard/orders/[id]`)

The details page provides a 360-degree view of a single transaction and management tools.

### **A. Status Management**
- **Update Status**: A button triggering a modal to advance the order lifecycle (e.g., from *Pending* to *Confirmed*).
- **Confirm Payment**: Manual payment confirmation for offline methods (COD or Pay on Visit).
- **Shipping Logistics**: For "Shipped" status, tenants can input:
  - **Tracking Number**.
  - **Estimated Delivery Date**.

### **B. Customer & Logistics**
- **Customer Profile**: Detailed contact info (Email/Phone).
- **Delivery Information**: 
  - Pickup location/time (if applicable).
  - Shipping Address (Street, City, Building) for deliveries.
- **Notes**: Any special instructions provided by the customer at checkout.

### **C. Inventory & Items**
A detailed list of products purchased:
- Product Thumbnail and Bilingual Name.
- Quantity ordered.
- Unit Price and Total Line item Price.

### **D. Financial Breakdown**
A transparent summary of the order total:
- **Subtotal**: Sum of item prices.
- **Tax (15%)**: Computed VAT.
- **Shipping Fee**: Cost for delivery (if applicable).
- **Platform Fee**: Deducted system commission.
- **Total Amount**: Final value paid by the customer.

---

## ✏️ 3. Lifecycle Features
- **Real-time Updates**: Order and Payment statuses are updated instantly via API.
- **Tracking Integration**: Tracking info is attached directly to the order record for customer visibility.
- **Navigation**: "Go Back" and breadcrumb-style navigation for quick return to the main list.
