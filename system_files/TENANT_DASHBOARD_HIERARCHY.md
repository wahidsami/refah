# Tenant Dashboard Hierarchy & Analysis Report

## 1. Overview
The Tenant Dashboard is the central hub for salon/business owners to manage their operations on the Rifah Booking Platform. It is built using Next.js 14 (App Router) and features a persistent sidebar navigation layout.

**Technology Stack:**
- **Framework:** Next.js 14
- **UI Library:** Tailwind CSS, Shadcn UI, Headless UI
- **Icons:** Heroicons
- **State Management:** React Context (`TenantAuthContext`)
- **Data Fetching:** Custom `tenantApi`
- **Internationalization:** `next-intl` (English, Arabic)

## 2. Navigation Structure
The dashboard features a responsive sidebar with the following primary navigation items:
- **Dashboard** (Home)
- **Services**
- **Products**
- **Employees**
- **Schedules**
- **Appointments**
- **Orders**
- **Hot Deals**
- **Customers**
- **Financial**
- **Reports**
- **My Page**
- **Settings**

---

## 3. Detailed Section Analysis

### 3.1. Dashboard (Home)
**Path:** `/dashboard/page.tsx`
**Purpose:** Provides a high-level overview of daily operations and key performance metrics.
**Key Components:**
- **Stats Cards:**
  - Today's Bookings
  - Total Revenue
  - Active Employees
  - Total Customers
- **Todays Appointments List:** Displays a summary of appointments scheduled for the current day.
  - Columns: Customer Name, Service, Staff, Time, Status, Price.
  - Actions: None visible in summary (click to view details).

### 3.2. Services
**Path:** `/dashboard/services`
**Sub-pages:**
- **List:** `/dashboard/services/page.tsx`
- **Create/Edit:** `/dashboard/services/new/page.tsx` (and `[id]/page.tsx`)

**Service Creation Flow:**
1.  **Initiation:** User clicks "Add New Service" from the list page.
2.  **Phase 1: Basic Info:**
    -   Enter Name (En/Ar), Description, and select Category from predefined list.
    -   Set Duration (in 15-min increments).
3.  **Phase 2: Availability:**
    -   Toggle `Available in Center` and `Home Visit` options.
4.  **Phase 3: Details (Optional):**
    -   Add "Includes" items (e.g., "Shampoo", "Blowdry") via text input + Add button.
    -   Add "Benefits" (En/Ar pairs) and "What to Expect" steps.
5.  **Phase 4: Media & Pricing:**
    -   Upload Service Image.
    -   Enter **Raw Price**. System automatically calculates Tax (15%) and Commission (10%) to show **Final Price**.
6.  **Phase 5: Assignment:**
    -   Select Employees who perform this service from a checklist.
7.  **Phase 6: Promotions:**
    -   Optionally enable "Has Offer" or "Has Gift" to bundle items.
8.  **Completion:** Click "Save Service" -> API POST -> Redirect to List.

**List Page Features:**
- **Search:** Search services by name `[Input: Text]`.
- **Filter:** Category `[Select]`, Active Status `[Select]`.
- **List Items:** Service Name, Description, Price, Duration, Assigned Employees count.
- **Actions:** Edit, Delete.

**Service Form Fields:**
- **Basic Info:**
  - Name (En/Ar) `[Input: Text]`
  - Description (En/Ar) `[Textarea]`
  - Category `[Select]`
- **Service Details:**
  - Duration (minutes) `[Input: Number]`
  - Price (Base Price) `[Input: Number]`
  - Discount Price (Optional) `[Input: Number]`
  - Buffer Time (Before/After) `[Input: Number]`
- **Media:**
  - Service Image Upload `[File Upload: Image]`
- **Assignment:**
  - Assign Employees `[Checkbox List]`
- **Additional Info:**
  - "Includes" (What's included) `[Array Input: Text]`
  - "Benefits" `[Array Input: Text]`
  - "What to Expect" `[Array Input: Text]`
- **Settings:**
  - Gender (Men, Women, Both) `[Radio Group / Select]`
  - Active Status `[Switch]`
  - Featured Service `[Switch]`

### 3.3. Products
**Path:** `/dashboard/products`
**Sub-pages:**
- **List:** `/dashboard/products/page.tsx`
- **Create/Edit:** `/dashboard/products/new/page.tsx`

**List Page Features:**
- **Search:** Search products by name `[Input: Text]`.
- **Filter:** Category `[Select]`, Availability `[Select]`.
- **List Items:** Image, Name, Brand, Price, Stock, Active Status.
- **Actions:** Edit, Delete.

**Product Form Fields:**
- **Basic Info:**
  - Name (En/Ar) `[Input: Text]`
  - Description (En/Ar) `[Textarea]`
  - Category `[Select]`
  - Brand `[Select]`
- **Product Details:**
  - SKU `[Input: Text]`
  - Barcode (Optional) `[Input: Text]`
  - Size/Volume `[Input: Text]`
  - Color `[Input: Text]`
- **Pricing & Inventory:**
  - Price `[Input: Number]`
  - Cost Price (for profit calc) `[Input: Number]`
  - Discount Price `[Input: Number]`
  - Stock Quantity `[Input: Number]`
  - Low Stock Threshold `[Input: Number]`
- **Media:**
  - Product Images (Main + Gallery) `[File Upload: Multiple Images]`
- **Additional Specs:**
  - Ingredients `[Textarea]`
  - Usage Instructions `[Textarea]`
  - Features `[Tags Input]`
- **Settings:**
  - Active Status `[Switch]`
  - Featured Product `[Switch]`

### 3.4. Employees
**Path:** `/dashboard/employees`
**Sub-pages:**
- **List:** `/dashboard/employees/page.tsx`
- **Create/Edit:** `/dashboard/employees/new/page.tsx`

**List Page Features:**
- **Search:** Search by name `[Input: Text]`.
- **Filter:** Role `[Select]`, Active Status `[Select]`.
- **List Items:** Avatar, Name, Role, Phone, Rating, Active Status.
- **Actions:** Edit, Delete, View Schedule.

**Employee Form Fields:**
- **Personal Info:**
  - First Name, Last Name `[Input: Text]`
  - Email (for login) `[Input: Email]`
  - Phone Number `[Input: Tel]`
  - Nationality `[Select]`
  - Gender `[Select]`
  - Date of Birth `[Input: Date]`
- **Professional Info:**
  - Role/Title (En/Ar) `[Input: Text]`
  - Bio (En/Ar) `[Textarea]`
  - Experience (Years) `[Input: Number]`
  - Skills `[Tags Input]`
- **Employment Details:**
  - Joining Date `[Input: Date]`
  - Salary Type (Fixed, Commission, Both) `[Select]`
  - Base Salary `[Input: Number]`
  - Commission Rate (%) `[Input: Number]`
- **Settings:**
  - Active Status `[Switch]`
  - Allow Online Booking `[Switch]`
  - Login Access `[Switch]`
- **Media:**
  - Profile Photo `[File Upload: Image]`

### 3.5. Schedules
**Path:** `/dashboard/schedules/page.tsx`
**Purpose:** Manage employee working hours, shifts, breaks, and time-off.

**Key Components:**
- **Employee Selector:** `[Select]`
- **Tabs:** Weekly Shifts, Breaks, Time Off, Overrides.

**Modals (Forms):**
- **Shift Modal:**
  - Day of week `[Select]`
  - Start Time `[Time Picker]`
  - End Time `[Time Picker]`
  - Is Working `[Switch]`
- **Break Modal:**
  - Type (Lunch/Prayer/etc) `[Select]`
  - Start Time `[Time Picker]`
  - End Time `[Time Picker]`
  - Is Recurring `[Switch]`
- **Time Off Modal:**
  - Start Date `[Date Picker]`
  - End Date `[Date Picker]`
  - Type (Vacation/Sick/Personal) `[Select]`
  - Reason `[Textarea]`
- **Override Modal:**
  - Specific Date `[Date Picker]`
  - Start Time `[Time Picker]`
  - End Time `[Time Picker]`
  - Is Available `[Switch]`
  - Reason `[Textarea]`

### 3.6. Appointments
**Path:** `/dashboard/appointments`
**Sub-pages:**
- **List:** `/dashboard/appointments/page.tsx`
- **Details:** `/dashboard/appointments/[id]/page.tsx`

**Management Flow (Lifecycle):**
1.  **Creation:** Appointments are primarily created by *Customers* via the Mobile App or Client Web. Tenants view them here.
2.  **Review (Pending):**
    -   New appointments appear as "Pending" (Yellow).
    -   Tenant reviews time/staff.
    -   **Action:** Click `Confirm` button -> Status becomes "Confirmed" (Green).
3.  **Execution:**
    -   Service is performed.
    -   **Action:** Tenant marks as `Completed` via details page or quick action -> Status becomes "Completed" (Blue).
4.  **Exceptions:**
    -   **Cancel:** Tenant can cancel -> Status "Cancelled".
    -   **No Show:** If customer fails to arrive -> Status "No Show".
5.  **Payment:** Payment status (Paid/Pending) is tracked separately but often correlates with completion.

**List Page Features:**
- **Filters:**
  - Date Range (Start/End) `[Date Picker]`
  - Status `[Select]`
  - Staff Member `[Select]`
  - Service `[Select]`
- **Views:** List View, Calendar View.

**Details Page Features (Form Actions):**
- **Status Update:** `[Button Group: Confirm | Complete | Cancel]`
- **Payment Update:** `[Button: Mark as Paid]` (No explicit form, changes state directly).
- **Note:** This page is primarily read-only for appointment details (Time, Service, Customer).

### 3.7. Orders
**Path:** `/dashboard/orders`
**Sub-pages:**
- **List:** `/dashboard/orders/page.tsx`
- **Details:** `/dashboard/orders/[id]/page.tsx`

**List Page Features:**
- **Filters:** Order Status `[Select]`, Payment Status `[Select]`.
- **List Items:** Order ID, Customer, Items Count, Total Amount, Status.

**Details Page Features (Forms):**
- **Update Status Modal:**
  - New Status `[Select]`
  - Tracking Number `[Input: Text]` (Conditional: if status=Shipped)
  - Estimated Delivery Date `[Date Picker]` (Conditional: if status=Shipped)
- **Update Payment Status Modal:**
  - newPaymentStatus `[Select]`

### 3.8. Hot Deals
**Path:** `/dashboard/hot-deals/page.tsx`
**Purpose:** Manage promotional offers and flash sales.

**List Page Features:**
- **List Items:** Banner Image, Title, Discount Type, Start/End Date, Status.
- **Actions:** Create New, Edit, Delete, Toggle Active.

**Deal Form Fields:**
- **Details:**
  - Title (En/Ar) `[Input: Text]`
  - Description `[Textarea]`
- **Offer Configuration:**
  - Type (Flat/Percent) `[Select]`
  - Value `[Input: Number]`
  - Applicable Services/Products `[Select: Multi-Select]`
- **Schedule:**
  - Start Date/Time `[DateTime Picker]`
  - End Date/Time `[DateTime Picker]`
- **Media:**
  - Promotional Banner Image `[File Upload: Image]`

### 3.9. Customers
**Path:** `/dashboard/customers`
**Sub-pages:**
- **List:** `/dashboard/customers/page.tsx`
- **Details:** `/dashboard/customers/[id]/page.tsx`

**List Page Features:**
- **Search:** Search by name/phone/email `[Input: Text]`.
- **Filters:** Loyalty Tier `[Select]`, Customer Type `[Select]`.
- **Sort:** Sort By `[Select]`.

**Details Page Features (Form):**
- **Edit Notes & Tags Form:**
  - Notes `[Textarea]`
  - Tags Display `[Tags List]`
  - Add Tag `[Input: Text] (w/ Add Button)`

### 3.10. Financial
**Path:** `/dashboard/financial/page.tsx`
**Purpose:** Financial reporting and revenue tracking.

**Report Controls:**
- **Date Range:** `[Date Picker Range]`

### 3.11. Reports
**Path:** `/dashboard/reports/page.tsx`
**Purpose:** Detailed analytical reports beyond just financials.

**Report Controls:**
- **Date Range:** `[Date Picker Range]`
- **View Selection:** `[Tabs]`

### 3.12. My Page (Public Profile Manager)
**Path:** `/dashboard/mypage/page.tsx`
**Purpose:** Customize the tenant's public-facing landing page.

**Tabs (Forms):**
1.  **General Settings (`GeneralSettingsTab.tsx`):**
    - **Theme:** Primary/Secondary Colors `[Color Picker]`
    - **Logo:** Upload Logo `[File Upload: Image]`
    - **Template:** Select layout template `[Select/Card Selector]`
    - **Visibility:** Toggle sections (Hero, Featured Services, etc.) `[Switch]`

2.  **Hero Slider (`HeroSliderTab.tsx`):**
    - **Slides:**
      - Image `[File Upload: Image]`
      - Title (En/Ar) `[Input: Text]`
      - Subtitle (En/Ar) `[Input: Text]`
      - CTA Button Text `[Input: Text]`
      - CTA Button Link `[Input: URL]`

3.  **Pages Banners (`PagesBannersTab.tsx`):**
    - **Banners:** Services Page, About Page, Contact Page `[File Upload: Image]`

4.  **About Us (`AboutUsTab.tsx`):**
    - **Our Story:** Title `[Input: Text]`, Content (En/Ar) `[Textarea]`
    - **Mission/Vision:** Dynamic list of items `[Array Input: Text + Icon Select]`
    - **Facilities:** Gallery Images `[File Upload: Multiple Images]`
    - **Final Word:** Closing statement `[Textarea]`

5.  **Reviews (`ReviewsTab`):** Placeholder ("Coming Soon").

### 3.13. Settings (Global)
**Path:** `/dashboard/settings/page.tsx`
**Purpose:** General configuration for the tenant's account. This page contains multiple tabs, each serving as a form.

**Tabs (Forms):**
1.  **Business Info:**
    - **Identity:**
      - Logo `[File Upload: Image]`
      - Name (En/Ar) `[Input: Text]`
    - **Contact:**
      - Email `[Input: Email]`
      - Phone `[Input: Tel]`
      - Mobile `[Input: Tel]`
      - Website `[Input: URL]`
    - **Address:**
      - Building, Street, District, City, Postal Code `[Input: Text]`
      - Google Map Link `[Input: URL]`
    - **Social Media:**
      - WhatsApp, Facebook, Instagram, Twitter, LinkedIn, TikTok, YouTube, Snapchat, Pinterest `[Input: URL/Text]`

2.  **Working Hours:**
    - **Grid:** Sunday-Saturday `[List]`
    - **Fields:**
      - Is Open `[Checkbox]`
      - Open Time `[Time Picker]`
      - Close Time `[Time Picker]`

3.  **Booking Settings:**
    - **Preferences:**
      - Auto-Approve Bookings `[Checkbox]`
    - **Times:**
      - Buffer Time `[Select]` (0, 5, 10, 15, 30 min)
      - Max Advance Booking `[Select]` (7, 14, 30, 60, 90 days)
      - Cancellation Window `[Select]` (1, 2, 6, 12, 24, 48 hours)

4.  **Notifications:**
    - **Channels:**
      - Email `[Checkbox]`
      - SMS `[Checkbox]`
      - WhatsApp `[Checkbox]`
      - Voice Alerts `[Checkbox]`

5.  **Payment:**
    - **Methods:**
      - Accept Cash `[Checkbox]`
      - Accept Card `[Checkbox]`
      - Accept Wallet `[Checkbox]`

6.  **Localization:**
    - **Preferences:**
      - Default Language `[Select]` (Ar/En)
      - Timezone `[Select]`
      - Currency `[Select]`
