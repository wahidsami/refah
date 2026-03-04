# 💇 Tenant Services Page - Content Overview

This document provides a detailed breakdown of the **Services Management** section in the Tenant Dashboard.

---

## 📅 1. Services Main Page (`/dashboard/services`)

The services main page allows tenants to view, search, and manage their service catalog.

### **A. Header & Actions**
- **Title**: "Services" (Arabic: "الخدمات").
- **Subtitle**: Manage your service catalog and pricing.
- **Add Service Button**: Redirects to the "Add New Service" form.

### **B. Search & Filtering**
- **Search Bar**: Search services by name.
- **Category Filter**: Filter services by categories (Hair, Facial, Massage, Nails, Makeup, Bridal, General).
- **Status Filter**: Toggle between "All", "Active", and "Inactive" services.

### **C. Services List (Grid View)**
Each service is displayed as a card containing:
- **Service Image**: A preview thumbnail of the service.
- **Badges**:
  - **Offer**: Displayed if an active offer is attached.
  - **Gift**: Displayed if a gift is included.
  - **Status**: Green (Active) or Gray (Inactive) indicator.
- **Information**:
  - Service Name (Bilingual).
  - Category and Duration.
  - Number of Assigned Employees.
- **Pricing Breakdown**:
  - Raw Price (SAR).
  - Tax Rate (e.g., 15%).
  - System Commission Rate (e.g., 10%).
  - **Final Price**: The total price shown to customers.
- **Actions**:
  - **Edit**: Modify service details.
  - **Delete**: Remove the service from the catalog.

---

## ✏️ 3. "Edit Service" Feature (`/dashboard/services/[id]`)

The Edit feature allows tenants to modify any existing service. It uses the same robust form as the "Add Service" section with the following behaviors:

- **Pre-filled Data**: All fields (names, descriptions, pricing, etc.) are automatically populated from the database.
- **Image Persistence**: The existing service image is displayed, with an option to upload a new one to replace it.
- **Assignment Management**: Tenants can add or remove employees assigned to the service at any time.
- **Toggle Status**: Easily switch the service between **Active** and **Inactive** for seasonal offerings.
- **Pricing Updates**: Changes to the raw price immediately update the final price calculation based on current tax and commission rates.

---

## 📝 2. "Add New Service" Form Fields

The "Add New Service" form (`/dashboard/services/new`) is a comprehensive multi-section form designed to capture all operational details.

### **Section 1: Basic Information**
| Field Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| **Service Name (EN)** | `Text` | ✅ | Name of the service in English. |
| **Service Name (AR)** | `Text` | ✅ | Name of the service in Arabic. |
| **Description (EN)** | `Textarea` | ❌ | Detailed description in English. |
| **Description (AR)** | `Textarea` | ❌ | Detailed description in Arabic. |
| **Category** | `Select` | ✅ | Choose from predefined service categories. |
| **Duration (Minutes)** | `Number` | ✅ | Service length (increments of 15 min). |

### **Section 2: Service Availability**
| Field Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| **Available in Center** | `Checkbox` | ❌ | Set if the service is available at the shop. |
| **Available Home Visit** | `Checkbox` | ❌ | Set if the service is available for home booking. |

### **Section 3: Feature Lists**
| Field Name | Type | Description |
| :--- | :--- | :--- |
| **Includes** | `Dynamic List` | Bullet points of what's included (e.g., Shampoo). |
| **Benefits List** | `Dynamic List` | Key benefits of the service (Bilingual). |
| **What to Expect** | `Dynamic List` | Steps or preparation for the service (Bilingual). |

### **Section 4: Media**
| Field Name | Type | Description |
| :--- | :--- | :--- |
| **Service Image** | `File Upload` | High-quality image for the catalog (with preview). |

### **Section 5: Pricing**
| Field Name | Type | Description |
| :--- | :--- | :--- |
| **Raw Price (SAR)** | `Number` | The base price set by the tenant. |
| **Tax Rate (%)** | `Display` | Auto-fetched from global settings (e.g., 15%). |
| **Commission Rate (%)** | `Display` | Auto-fetched from global settings (e.g., 10%). |
| **Final Price (SAR)** | `Display` | Calculated: `Raw + Tax + Commission`. |

### **Section 6: Staff Assignment**
| Field Name | Type | Description |
| :--- | :--- | :--- |
| **Assign Employees** | `Multi-select` | Select which active staff can perform this service. |

### **Section 7: Promotional Features**
| Field Name | Type | Description |
| :--- | :--- | :--- |
| **Has Offer** | `Checkbox` | Enable a promotional tag. |
| **Offer Details** | `Textarea` | Description of the offer (e.g., "Season Discount"). |
| **Has Gift** | `Checkbox` | Enable a gift for the customer. |
| **Gift Type** | `Select` | Choose between "Text" (manual) or "Product" (catalog). |
| **Gift Details** | `Text / Select`| Custom gift text or product selection from inventory. |
