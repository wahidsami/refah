# 👥 Tenant Staff Management - Module Overview

This document provides a deep-dive extraction of the **Staff (Employees) Management** module within the Tenant Dashboard. It covers the workforce directory, the personnel registration funnel, and the financial configuration of team members.

---

## 📋 1. Employee Directory (The Roster)

The primary staff page provides a high-level performance and payroll summary for the entire team.

### **Key Metrics & Display Fields:**
- **Identity**: Profile photo (with status ring), Full Name, National Identity/Nationality.
- **Expertise Tags**: Dynamic "Skill" chips and Experience duration (e.g., "5 years").
- **Performance KPIs**:
  - **Rating**: 5-star aggregate based on client feedback.
  - **Total Bookings**: Lifetime counter of services fulfilled.
- **Financial Status**:
  - **Base Salary**: Formatted in local currency (SAR).
  - **Commission Rate**: Active percentage (%) for service-based payouts.
- **Availability Status**: Real-time "Active/Inactive" toggle indicator.

### **Management Actions**:
- **Bilingual Search**: Intent-based search across Name and Nationality.
- **Status Filtering**: Quick toggles for "Active", "Inactive", or "All" views.
- **Hard Delete**: Triggered via confirmation modal with record flushing.

---

## 📝 2. Staff Profiles: Fields & Data Types

The "Add" and "Edit" flows use a unified data structure, capturing 11 core data points.

### **Personnel Information**
| Field Name | Type | Requirement | Description |
| :--- | :--- | :--- | :--- |
| `name` | String | **Required** | The legal or professional name of the employee. |
| `email` | String | Optional | Used for potential internal comms or future portal access. |
| `phone` | String | Optional | Direct mobile/phone contact. |
| `nationality` | Select | Optional | Predefined list (Saudi, Egyptian, Filipino, Indian, etc.). |
| `bio` | Textarea | Optional | Short professional summary. |
| `experience` | String | Optional | Descriptive text for years of service. |
| `skills` | Array | Optional | Dynamic tags added via chip-input interface. |
| `photo` | Binary | Optional | Image upload (`.jpg`, `.png`) stored in `/uploads/`. |

### **Financial & Operational Parameters**
| Field Name | Type | Requirement | Description |
| :--- | :--- | :--- | :--- |
| `salary` | Number | **Required** | Monthly base salary in SAR. |
| `commissionRate`| Number | Optional | Percentage (0-100%) of service price earned per booking. |
| `isActive` | Boolean | Required | Toggles public visibility and booking capability. |

---

## 🔄 3. Lifecycle & Architectural Notes

### **The "New Staff" Workflow**
1. **Photo Upload**: Multi-part `FormData` handles binary photo transfer alongside JSON metadata.
2. **Skill Mapping**: Skills are managed as a dynamic array of strings, converted to JSON for backend storage.
3. **Status Default**: New employees are defaulted to `isActive: true`.

### **⚠️ Architectural Decoupling (Schedules)**
A critical finding in the source code indicates that **Working Hours** (Schedules) have been removed from the Staff profile pages. 
> *Developer Note: "workingHours removed - use Schedules section to manage employee schedules."*
This ensures a clean separation between **Personnel Identity** (Staff Section) and **Availability Logic** (Schedules Section).

---

## ⚡ 4. Technical Integration (API)

- **Listing**: Calls `tenantApi.getEmployees(params)` with support for search and status filters.
- **Creation**: Submits a `FormData` object to `POST /tenant/employees`.
- **Updating**: Submits a `FormData` object to `PUT /tenant/employees/:id`.
- **Photo Storage**: Photos are served from the backend service at `http://localhost:5000/uploads/`.
