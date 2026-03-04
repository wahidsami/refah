# 🏢 Admin Clients Management - Content Overview

This document provides an exhaustive extraction of the **Client (Tenant) Management** module in the Admin Dashboard. This section is the core of platform operations, handling the lifecycle of every business registered on the system.

---

## 📋 1. Client Management Lifecycle

The module is designed to handle businesses from their initial application through to active performance monitoring and potential suspension.

### **Workflow Stages:**
1.  **Pending Application**: New signup requiring admin review.
2.  **Verification**: Manual check of commercial and legal documents.
3.  **Active Management**: Monitoring bookings, revenue, and ratings.
4.  **Lifecycle Actions**: Capability to Suspend or Reactivate accounts based on compliance.

---

## 🔍 2. Detailed Component Extraction

### **A. Global Clients Directory (`/dashboard/clients`)**
A high-capacity data table for searching and filtering the entire tenant database.
- **Search System**: Real-time filtering by Business Name, Email, or Phone Number.
- **Filter Matrix**:
  - **Status**: Pipeline view (Pending, Approved, Rejected, Suspended).
  - **Business Type**: Niche segmentation (Salon, Spa, Barbershop, Beauty Center, Nail Studio).
  - **Plan**: Subscription tier tracking (Free Trial, Basic, Pro, Enterprise).
- **Core Table Data**: Summary of Business Name, Owner, City, Status, Subscription Plan, and Joining Date.

### **B. Pending Approvals Queue (`/dashboard/clients/pending`)**
A specialized, high-priority workflow for reviewing new applications.
- **Verification Cards**: Each application displays a summary of the business and its owner.
- **Document Checklist**: A visual indicator of uploaded legal files:
  - Commercial Register (CR)
  - Business License
  - Owner ID Card
- **Approval Logic**: 
  - **✓ Approve**: Standard confirmation dialog to activate the tenant.
  - **Reject**: Opens a **Rejection Modal** requiring a formal reason, which is sent to the applicant.

### **C. Deep Profile View (`/dashboard/clients/[id]`)**
A 4-tab command center for managing individual tenants.

#### **1. Overview (Performance & Identity)**
- **KPI Dashboard**: Real-time cards for **Total Bookings**, **Total Revenue**, **Customer Count**, and **Average Rating**.
- **Business Identity**: Bilingual names (EN/AR), Slug ID, and live Logo preview.
- **Contact Ecosystem**: Primary business contacts (Email, Phone, WhatsApp, Website) and physical location with Google Maps integration.
- **Owner & Representative**: Contact details for both the legal owner and the day-to-day contact person.
- **Subscription Tracker**: Visibility of current plan, start date, expiration date, and approval timestamps.

#### **2. Documents (Compliance)**
- **File Repository**: Direct access to view uploaded CR, Tax Certificate, and Business License.
- **Verification Status**: Badges indicating if a document is "Uploaded" or "Missing".

#### **3. Activity Log (Audit Trail)**
- **Historical Actions**: A chronologically sorted feed of all admin actions taken on this specific client (e.g., "Approved by System", "Suspended by Admin").
- **Metadata**: Timestamps, performer names, and JSON activity details.

#### **4. System Settings (Raw Configuration)**
- **Technical View**: A JSON-based explorer showing the tenant's internal system configuration beyond UI fields.

---

## ⚙️ 3. Administrative Action Modals

Documentation of interactive flows within the client module:

### **Rejection Modal**
- **Trigger**: Click "Reject" on a pending application.
- **Field**: Multi-line Textarea for the Rejection Reason.
- **Outcome**: Marks account as "Rejected" and notifies owner.

### **Suspension Modal**
- **Trigger**: Click "Suspend" on an active approved client.
- **Field**: Multi-line Textarea for the Suspension Reason.
- **Logic**: Immediately revokes dashboard and public page access for the tenant while preserving data.

### **Reactivation Flow**
- **Trigger**: Click "Reactivate" on a suspended client.
- **Logic**: Restores all platform features and moves status back to "Approved".
