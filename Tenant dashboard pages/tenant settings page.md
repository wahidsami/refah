# ⚙️ Tenant Settings Page - Content Overview

This document provides a detailed breakdown of the **System Settings & Configuration** section in the Tenant Dashboard.

---

## 🛠️ 1. Settings Overview (`/dashboard/settings`)

The settings page is the core configuration hub for the tenant's business operations. It is organized into six functional tabs, ensuring a logical flow from identity to operational rules.

---

## 📂 2. Functional Management Tabs

### **A. Business Profile (Identity & Contact)**
Manages the public-facing identity and communication channels.
- **Branding**:
  - **Logo**: Dynamic upload for business avatar/logo.
  - **Cover Image**: Upload for profile header.
- **Identity (EN/AR)**: Bilingual business names.
- **Contact Info**: Professional email, office phone, mobile number, and official website.
- **Location Detail**:
  - Full address stack: Building Number, Street, District, City, Country, and Postal Code.
  - **Map Integration**: Field for Google Maps location links.
- **Social Ecosystem**: Support for WhatsApp, Facebook, Instagram, Twitter/X, LinkedIn, TikTok, YouTube, Snapchat, and Pinterest.

### **B. Working Hours (Operational Schedule)**
Define the weekly availability of the business.
- **Daily Toggle**: Enable/Disable specific days (e.g., set Friday to 'Closed').
- **Standard Shifts**: Define "From" and "To" times for each open day.
- **Localization**: Supports Arabic weekday names and RTL hour selectors.

### **C. Booking Settings (Constraint Management)**
Sets the logic for how customers interact with the calendar.
- **Workflow**: Toggle for "Auto-Approve Bookings" (Instant Booking vs. Manual Review).
- **Buffer Time**: Management of transition time between appointments (0, 5, 10, 15, or 30 minutes).
- **Advance Window**: Control how far in advance a client can book (7 to 90 days).
- **Cancellation Logic**: 
  - Define minimum notice period (1 to 48 hours).
  - Explicit specialized field for "Cancellation Policy" text.

### **D. Notifications (Automated Alerts)**
Configure how the tenant and customers receive updates.
- **Channel Controls**: Individual toggles for **Email**, **SMS**, and **WhatsApp**.
- **System Alerts**: Toggle for **Voice Alerts** within the browser dashboard for new incoming orders/bookings.

### **E. Payment (Financial Intake)**
Defines the checkout experience for customers.
- **Accepted Methods**: Toggle switches for enabling **Cash**, **Card**, and **Digital Wallet** payments.

### **F. Localization (Regional Settings)**
Configures the system's language and regional behavior.
- **Language**: Set the default UI language (Arabic or English).
- **Timezone**: Set regional time for accurate booking syncing (e.g., Asia/Riyadh).
- **Currency**: Define business currency (SAR, AED, KWD).

---

## 🔒 3. System Characteristics
- **Bilingual Interface**: Seamless switching between English and Arabic with full RTL support for all forms.
- **Real-time Persistence**: Individual save actions per tab to ensure data integrity during configuration.
- **API Integrated**: All settings directly influence the public page, booking engine, and notification dispatcher.
