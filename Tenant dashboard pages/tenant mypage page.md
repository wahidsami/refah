# 🏠 Tenant My Page - Content Overview

This document provides a detailed breakdown of the **My Page (Website Configuration)** section in the Tenant Dashboard. This section acts as a Content Management System (CMS) for the tenant's public-facing landing page.

---

## 🎯 1. Purpose & Core Logic

The **My Page** section allows tenants to personalize their brand presence without technical knowledge. It centralizes all visual and informational elements that appear on the public booking site (`/t/[tenant-slug]`).

### **How it works:**
- **Dynamic Configuration**: All settings (colors, sliders, text) are stored in a `publicPageData` object within the tenant's profile.
- **Port/Domain Separation**: While the dashboard runs on the tenant management port, the public page (typically port `3004` or a custom domain) fetches this data via the API in real-time.
- **Multilingual Sync**: Every text field (titles, descriptions, CTAs) is available in both **English** and **Arabic**, ensuring the public page remains fully localized.

---

## 🛠️ 2. Detailed Feature Breakdown

The section is divided into four main management tabs.

### **A. General Settings**
Focuses on core branding and site-wide structure.
- **Public Page Logo**: Upload and preview the primary brand mark for the landing page.
- **Website Template**: Choice of 3 pre-defined layouts:
  - **Template 1**: Modern layout with sidebar navigation.
  - **Template 2**: Classic layout with top navigation.
  - **Template 3**: Minimalist layout with centered content.
- **Theme Colors**: Color pickers for:
  - **Primary Color**: Used for buttons, active states, and highlights.
  - **Secondary Color**: Used for accents and secondary UI elements.
  - **Helper Color**: Used for status indicators and subtle decorations.
- **Section Toggles**: Global "Show/Hide" switches for major landing page blocks:
  - Hero Slider, Services Section, Products Section, and Call to Action (CTA).

### **B. Hero Slider**
Allows creation of a high-impact, multi-slide carousel.
- **Slider Management**: Add, edit, or delete multiple slides.
- **Visuals**: Individual background image uploads for each slide with real-time overlay previews.
- **Text & Styling**:
  - **Tagline (EN/AR)**: Short text appearing above the title.
  - **Title (EN/AR)**: The main heading with a dedicated color picker.
  - **Subtitle (EN/AR)**: Narrative text with a dedicated color picker.
  - **Alignment**: Choice of Left, Center, or Right text positioning.
- **Dynamic Call to Action (CTA)**:
  - Custom button text (EN/AR).
  - Link type: Redirect to a specific "Service" or "Product".
  - Item Selector: A searchable list of active services/products to link the button directly to a booking or purchase.

### **C. Pages Banners**
Standardized header management for sub-pages.
- **Target Pages**: Services, Products, About Us, and Contact Us.
- **Functionality**: Upload large, high-resolution banners (recommended 1920x400) to provide visual continuity across the site.

### **D. About Us**
A deep storytelling section comprising several sub-blocks.
- **Our Story**: Choice of heading (Our Story, About Us, Who We Are, Our Journey) and large-form narrative text.
- **Missions, Visions, & Values**:
  - List-based manager for each category.
  - Each item includes: Title (EN/AR), Details (EN/AR), and a "Display Type" toggle (Heroicon vs. Custom Image upload).
- **Facilities Gallery**: 
  - Narrative description of the business location/equipment.
  - **Multi-Image Uploader**: Support for up to 10 facility photos with a drag-and-drop or click-to-upload interface.
- **Final Word**: A closing statement or mission summary with a title, body text, and a signature icon or image.

---

## 🧭 3. Connection & Previewing
- **View Page Button**: A persistent header action that opens the tenant's public URL in a new tab for immediate validation of changes.
- **Draft/Published State**: All changes are applied instantly to the public API upon clicking "Save" in any tab.
