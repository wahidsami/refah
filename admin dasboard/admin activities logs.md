# 📋 Admin Activities Logs - Content Overview

This document provides a "deep-dive" extraction of the **Activity Log & Audit Trail** module in the Admin Dashboard. This section ensures transparency and accountability for every administrative and system-level action on the platform.

---

## 🏛️ 1. Audit Trail Architecture

The logging system tracks interactions across multiple entity types and provides a chronological history of platform-wide changes.

### **Entity Tracking Matrix:**
| Category | Identity Icon | Managed Entities |
| :--- | :--- | :--- |
| **Business** | 🏢 Tenant | Onboarding, Approvals, Suspensions. |
| **Consumer** | 👤 Platform User | Profile changes, Balance adjustments. |
| **Governance** | 🔐 Super Admin | Login events, Permission changes. |
| **Operations** | 📅 Appointment | Global booking lifecycle changes. |
| **Financial** | 💳 Transaction | Refund triggers and manual overrides. |
| **System** | ⚙️ System | Automated health checks and configuration updates. |

---

## 🔍 2. Activity Metadata Extraction

Each log entry captures a high-density "snapshot" of the event:

- **Action Categorization**: Color-coded verbs for instant scanning:
  - **Success (Green)**: Approved, Activated.
  - **Warning (Yellow)**: Password Change.
  - **Danger (Red)**: Rejected, Suspended, Deleted.
  - **Neutral (Blue/Teal)**: Created, Updated, Login.
- **Actor Identity**: Differentiation between human actions (Performed by Admin Name) and automated triggers (Performed by System).
- **Technical Context**: Collection of the actor's **IP Address** and **User Agent** for security auditing.
- **Granular Payload**: A nested `details` object (expandable JSON) containing the specific key-value changes related to the action.

---

## ⚡ 3. Administrative Logic

- **Density Control**: Administrators can toggle between **Last 25** to **Last 200** events to balance visibility and performance.
- **Real-time Synchronization**: A manual "Refresh" trigger allows admins to see live updates from concurrent administrators.
- **ID Traceability**: Every event links back to a specific `Entity ID` and `Performed By ID`, allowing for deep cross-referencing in the database.
