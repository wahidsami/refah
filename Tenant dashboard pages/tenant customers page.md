# 👥 Tenant Customers Page - Content Overview

This document provides a detailed breakdown of the **Customer Management** section in the Tenant Dashboard.

---

## 👥 1. Customers Main Page (`/dashboard/customers`)

The customers page allows tenants to manage their client database, track loyalty, and analyze spending patterns.

### **A. Performance Metrics**
- **Total Customers**: The complete count of unique users in the system.
- **New This Month**: Number of customers who joined in the current calendar month.
- **Returning Rate**: Percentage of customers with more than one booking/order.
- **Avg Bookings**: The average number of appointments per customer.

### **B. Search & Discovery**
- **Unified Search**: Search by name, email, or phone number.
- **Sort Options**: Last Visit, Total Spent, Total Bookings, or Name.
- **Filtering**:
  - **Loyalty Tier**: Filter by Bronze, Silver, Gold, or Platinum.
  - **Customer Type**: Scope the list to "Services Only", "Products Only", or "Both".

### **C. Customers Table**
- **Identity**: Profile photo (or initials), Name, and behavioral Tags (e.g., "Frequent", "VIP").
- **Contact**: Quick-view icons for Email and Phone.
- **Engagement**: 
  - **Bookings Count**: Includes a red "No-Show" warning if applicable.
  - **Orders Count**: Total product purchases.
- **Commercials**: Total Spent (SAR) and Loyalty Tier badge.
- **Activity**: Date of the most recent visit.

---

## 👤 2. Customer Profile Details (`/dashboard/customers/[id]`)

A deep-dive view into an individual customer's journey and preferences.

### **A. Comprehensive Profile**
- **Identity Header**: Large profile image, Name, Loyalty Points balance, and Customer Type badge.
- **Demographics**: View Gender, Date of Birth, and Preferred Language (Arabic/English).

### **B. Notes & Tags Form (Editable)**
Tenants can maintain internal records through a dedicated management block:
- **Internal Notes**: A free-text area for styling preferences, allergies, or special requirements.
- **Tag Management**: A dynamic list where tags can be added (via input) or removed (via "X" button).
- **Behavior**: Saves via a "Save" button to ensure intentional updates.

### **C. Advanced Statistics Grid**
- **Total Bookings**: Lifetime appointment count.
- **Total Orders**: Lifetime product purchase count.
- **Lifetime Value**: Total revenue generated from this customer.
- **Success Rate**: Number of "Completed" appointments.

### **D. Preference Insights**
Visual blocks showing the customer's most frequent choices:
- **Favorite Services**: List of top services with usage counts.
- **Favorite Products**: List of most-purchased items.
- **Preferred Staff**: The employee(s) the customer chooses most often.
- **Delivery Mode**: Preferred fulfillment method (Pickup vs. Delivery).

---

## 🕒 3. Complete History Feed

A unified, filterable timeline of every interaction the customer has had with the business.

### **A. Discovery Tabs**
- **All**: Unified chronological list of both appointments and purchases.
- **Appointments**: Scoped view of service bookings with staff and time details.
- **Purchases**: Scoped view of product orders with item counts.

### **B. Status Optimization**
Filter the history feed by specific outcomes:
- **Completed**: Only successful visits/deliveries.
- **Pending**: Upcoming bookings or processing orders.
- **Cancelled**: Voided or refunded entries.

### **C. Entry Details**
- **Appointment Cards**: Display Service Name, Staff Member, Date/Time, Status, and Price.
- **Order Cards**: Display Order Number, Item Previews (e.g., "Shampoo x2"), Fulfillment Type, and Total Amount.
