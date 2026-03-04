# 🛍️ Tenant Products Page - Content Overview

This document provides a detailed breakdown of the **Products Management** section in the Tenant Dashboard.

---

## 📦 1. Products Main Page (`/dashboard/products`)

The products main page allows tenants to manage their retail inventory and items used as gifts.

### **A. Header & Actions**
- **Title**: "Products" (Arabic: "المنتجات").
- **Subtitle**: Manage your product catalog and inventory.
- **Add Product Button**: Redirects to the "Add New Product" form.

### **B. Search & Filtering**
- **Search Bar**: Search products by name (EN/AR).
- **Category Filter**: Filter products by categories (Hair Care, Skin Care, Makeup, Fragrance, Tools & Accessories, General).
- **Availability Filter**: Toggle between "All", "Available", and "Unavailable" products.

### **C. Products Grid**
Each product is displayed as a card containing:
- **Product Image**: A preview of the item.
- **Badges**:
  - **Featured**: Orange badge for promoted items.
  - **Status**: Green (Available) or Gray (Unavailable).
- **Product Information**:
  - Product Name and Brand.
  - Category and SKU.
- **Inventory & Pricing**:
  - **Price**: Retail price in SAR.
  - **Stock**: Current quantity in stock (color-coded: Green for >10, Yellow for low, Red for out of stock).
- **Usage Stats**:
  - Total Sold Count.
  - Used as Gift Count (for promotions).
- **Actions**:
  - **Edit**: Modify product details.
  - **Delete**: Remove the product.

---

## ✏️ 3. "Edit Product" Feature (`/dashboard/products/[id]`)

The product editing system provides full control over the retail inventory. It features:

- **Inventory Updates**: Quickly adjust stock levels as new shipments arrive.
- **Multi-Image Management**: View the gallery of up to 5 images, delete individual ones, or add new ones to the collection.
- **Bilingual Content Tuning**: Refine English and Arabic descriptions, ingredients, and usage instructions.
- **Global Settings Sync**: Tax and commission rates are consistently applied from the admin settings, even during price updates.
- **Availability Control**: Toggle the **Is Available** and **Is Featured** status to manage storefront visibility.

---

## 📝 2. "Add New Product" Form Fields

The "Add New Product" form (`/dashboard/products/new`) is a detailed form with multiple sections to manage specifications and inventory.

### **Section 1: Basic Information**
| Field Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| **Product Name (EN)** | `Text` | ✅ | Name of the product in English. |
| **Product Name (AR)** | `Text` | ✅ | Name of the product in Arabic. |
| **Description (EN)** | `Textarea` | ❌ | Detailed description in English. |
| **Description (AR)** | `Textarea` | ❌ | Detailed description in Arabic. |

### **Section 2: Product Details**
| Field Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| **Category** | `Select` | ✅ | Choose from predefined product categories. |
| **Brand** | `Text` | ❌ | Manufacturer or brand name. |
| **Size** | `Text` | ❌ | Physical size or volume (e.g., 100ml, 500g). |
| **Color** | `Text` | ❌ | Product color (if applicable). |
| **SKU** | `Text` | ❌ | Unique Stock Keeping Unit (Unique ID). |

### **Section 3: Extended Specifications**
| Field Name | Type | Description |
| :--- | :--- | :--- |
| **Ingredients (EN/AR)**| `Textarea` | List of ingredients (Bilingual). |
| **How to Use (EN/AR)** | `Textarea` | Instructions for the customer (Bilingual). |
| **Features (EN/AR)** | `Textarea` | Key highlights or selling points (Bilingual). |

### **Section 4: Media**
| Field Name | Type | Description |
| :--- | :--- | :--- |
| **Product Images** | `File (Multi)` | Upload up to **5 images**. Minimum 1 is required. |

### **Section 5: Pricing & Inventory**
| Field Name | Type | Description |
| :--- | :--- | :--- |
| **Raw Price (SAR)** | `Number` | The base cost from the tenant. |
| **Tax Rate (%)** | `Display` | Auto-calculated (15%). |
| **Commission (%)** | `Display` | System commission (10%). |
| **Final Price (SAR)** | `Display` | Total customer price: `Raw + Tax + Commission`. |
| **Stock Quantity** | `Number` | Total units available for sale/gifts. |

### **Section 6: Status & Promotion**
| Field Name | Type | Description |
| :--- | :--- | :--- |
| **Is Available** | `Checkbox` | Toggle visibility and purchasability. |
| **Is Featured** | `Checkbox` | Highlight the product in the storefront. |
