# 🏢 Tenant Main Dashboard Page - Content Overview

This document provides an organized breakdown of the **Tenant Dashboard** main page and its associated sub-pages within the Rifah Booking System.

---

## 📊 1. Main Dashboard Page (`/dashboard`)

The main dashboard serves as the central hub for salon and spa owners to monitor their daily operations at a glance.

### **A. Welcome & Header Section**
- **Personalized Greeting**: Displays "Welcome [Business Name] 👋" (Arabic: "أهلاً بك").
- **Sub-header**: Provides a brief summary text: "Here's an overview of your salon's performance today" (Arabic: "نظرة عامة على أداء صالونك اليوم").
- **Language Switcher**: Quick toggle between Arabic (default) and English.
- **Business Identity**: Displays the business logo and type (e.g., Salon, Spa).

### **B. Key Performance Indicators (KPI cards)**
Four primary metrics are displayed prominently:
1.  **Today's Bookings**: Count of scheduled appointments for the current day.
2.  **Total Revenue**: Total earnings in **Saudi Riyal (SAR)** with localized formatting.
3.  **Active Employees**: Number of staff members currently on duty or active in the system.
4.  **Total Customers**: Total size of the customer database.

### **C. Recent Appointments List**
A detailed list of the latest or upcoming appointments for the day:
- **Customer Identity**: Full name of the client.
- **Service Details**: The specific service booked (e.g., Haircut, Massage).
- **Time Slot**: Start and end times for the appointment.
- **Booking Status**: Visual badge indicating if the status is **Confirmed** or **Pending**.
- **Service Price**: Individual cost of the booking.
- **Action**: "View All" button for deep-diving into the full calendar.

---

## 📂 2. Dashboard Sub-pages (Navigation)

The dashboard includes a comprehensive sidebar navigation with the following sub-pages:

| Icon | Page | Description |
| :--- | :--- | :--- |
| ✨ | **Services** | Manage service catalog, descriptions, images, and pricing. |
| 🛍️ | **Products** | Inventory management and retail product catalog. |
| 👥 | **Employees** | Staff profiles, bio, nationality, experience, and salary settings. |
| 📅 | **Schedules** | Detailed working hours and shifts for employees. |
| 📅 | **Appointments** | Full calendar view (Day/Week/Month) and booking management. |
| 📦 | **Orders** | Tracking product sales and customer orders. |
| 🔥 | **Hot Deals** | Create and manage promotional offers and discounts. |
| 🤝 | **Customers** | Customer CRM with history and contact details. |
| 💰 | **Financial** | Revenue analysis, earnings breakdown, and platform fees. |
| 📈 | **Reports** | Business performance analytics and downloadable reports. |
| 🌐 | **My Page** | Configuration for the tenant's public-facing booking page. |
| ⚙️ | **Settings** | General business settings, profile updates, and logout. |

---

## 🛠️ 3. Technical & Design Features
- **Bilingual (i18n)**: Full support for Arabic and English using `next-intl`.
- **RTL/LTR Support**: Layout dynamically adjusts based on the selected language.
- **Aesthetics**: Modern UI with glassmorphism effects, gradients, and soft transitions.
- **Real-time Data**: Fetches data from the backend API for stats and appointments.
- **Responsive**: Fully optimized for Desktop, Tablet, and Mobile views.
