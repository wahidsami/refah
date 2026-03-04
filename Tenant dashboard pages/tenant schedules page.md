# 📅 Tenant Schedules Page - Content Overview

This document provides a detailed breakdown of the **Schedule Management** section in the Tenant Dashboard.

---

## 🕒 1. Schedules Main Page (`/dashboard/schedules`)

The schedules page is a centralized hub for managing employee availability, work hours, and absences.

### **A. Employee Selection**
- **Selector**: A searchable dropdown to select the specific employee whose schedule is being managed.
- **Context**: All tabs and actions below the selector are scoped to the chosen employee.

### **B. Tabbed Navigation**
The management interface is divided into four distinct categories:
1.  **Shifts**: Primary work hours (recurring or one-time).
2.  **Breaks**: Scheduled pauses (lunch, prayer, cleaning).
3.  **Time Off**: Longer absences (vacations, sick leave).
4.  **Overrides**: Temporary exceptions or special day-specific hours.

---

## 📝 2. Management Forms (Add & Edit)

All schedule components are managed through modals that support both **Creation** and **Editing**.

### **Section A: Shifts (Work Hours)**
Used to define when an employee is available for bookings.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| **Recurring (Weekly)** | `Checkbox` | If checked, the shift repeats every week. |
| **Day of Week** | `Select` | (If Recurring) Sunday to Saturday. |
| **Specific Date** | `Date` | (If NOT Recurring) The exact day for the shift. |
| **Start Date** | `Date` | (Optional, for Recurring) When the pattern begins. |
| **End Date** | `Date` | (Optional, for Recurring) When the pattern stops. |
| **Start Time** | `Time` | Work start hour (e.g., 09:00 AM). |
| **End Time** | `Time` | Work end hour (e.g., 06:00 PM). |
| **Label** | `Text` | Optional tag (e.g., "Morning Shift"). |

### **Section B: Breaks**
Timed intervals where bookings are blocked.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| **Recurring (Weekly)** | `Checkbox` | If checked, the break repeats every week on a specific day. |
| **Break Type** | `Select` | Options: Lunch, Prayer, Cleaning, Other. |
| **Start/End Time** | `Time` | Interval for the break. |
| **Day/Date** | `Select/Date` | Either a weekly day or a specific date. |

### **Section C: Time Off**
Used for multi-day absences.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| **Type** | `Select` | Options: Vacation, Sick, Personal, Training, Other. |
| **Start Date** | `Date` | First day of absence. |
| **End Date** | `Date` | Last day of absence. |
| **Reason** | `Textarea` | Internal note about the absence. |

### **Section D: Overrides (Exceptions)**
Specific high-priority changes to the base schedule.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| **Date** | `Date` | The specific day for the exception. |
| **Is Available** | `Checkbox` | Uncheck to force the day as an "Off Day". |
| **Override Times** | `Time` | Custom start/end times if available (e.g., shorter hours). |
| **Reason** | `Text` | Optional reason (e.g., "Public Holiday", "Ramadan Hours"). |

---

## ✏️ 3. Edit & Delete Features

The Schedules section provides granular control over existing records:
- **Edit**: Clicking the pencil icon on any list item re-opens the corresponding form pre-filled with the item's data.
- **Delete**: Clicking the trash icon removes the specific shift, break, or override, instantly updating the employee's availability.
- **Status Indicators**: "Approved" vs "Pending" indicators for Time Off entries show current processing status.
