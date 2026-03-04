# Mobile App (Customer) Hierarchy & Analysis Report

## 1. Overview
The Rifah Mobile App is the customer-facing interface for booking services and purchasing products from tenants. It is built with React Native (Expo) and serves as the primary touchpoint for end-users.

**Technology Stack:**
- **Framework:** React Native (Expo)
- **Navigation:** React Navigation (Stack + Bottom Tabs + Drawer)
- **Styling:** StyleSheet (Custom Theme System)
- **State Management:** React Context (Language, Auth)

## 2. Navigation Structure

### 2.1. Root Level (`App.tsx`)
The app uses a state-based screen switcher for the initial authentication flow, then switches to `RootNavigator` upon login.

**Flow:**
1.  **Splash Screen:** Initial load.
2.  **Language Selection:** English / Arabic toggle.
3.  **Onboarding:** Multi-step introduction guide.
4.  **Welcome:** Decision point (Login / Register / Guest).
5.  **Auth Screens:** Login / Register forms.
6.  **Authenticated App:** `RootNavigator`.

### 2.2. Main Navigation (`RootNavigator`)
**Type:** Native Stack Navigator
**Screens:**
-   **Tabs:** Main Tab Navigator (Home/Dashboard).
-   **Tenant:** Tenant Profile & Service List (`TenantScreen`).
-   **Booking:** Booking Wizard Flow (`BookingFlow`).
-   **MyPurchases:** Product Order History (`PurchasesScreen`).
-   **Payment:** Payment Processing (`PaymentScreen`).

### 2.3. Tab Navigation (`TabNavigator`)
**Type:** Bottom Tab Navigator
**Tabs:**
1.  **Dashboard (Home):** User overview and quick actions.
2.  **Browse (Search):** Salon discovery list.
3.  **Bookings:** Customer appointment history.
4.  **Profile:** User settings and details.
5.  **More:** Settings and additional menu items.

---

## 3. Detailed Screen Analysis

### 3.1. Dashboard (`DashboardScreen.tsx`)
**Purpose:** Personalized landing page for logged-in users.
**Features:**
-   **Greeting:** Time-based greeting with User Name.
-   **Stats:** Upcoming Bookings count, Pending Payments count.
-   **Quick Actions:** Shortcuts to "Find Salon", "Bookings", "My Purchases".
-   **Recent Activity:** Preview of the next 3 upcoming bookings.
-   **Empty State:** "Book Now" call-to-action if no bookings exist.

### 3.2. Browse / Home (`HomeScreen.tsx`)
**Purpose:** Discovery of Service Providers (Tenants).
**Features:**
-   **Search:** Text input for filtering tenants by name.
-   **Tenant List (FlatList):**
    -   **Card Content:** Logo, Name, Status (Open/Closed), Service Count, Staff Count.
    -   **Action:** Tap to view Tenant Details (`TenantScreen`).
-   **Pull-to-Refresh:** Refreshes tenant list from API.

### 3.3. Tenant Profile (`TenantScreen.tsx`)
**Purpose:** Detailed view of a specific salon/provider.
**Features:**
-   **Header:** Banner image, Logo, Business Info.
-   **Tabs/Sections:**
    -   **Services:** List of available services with prices and "Book" button.
    -   **Products:** Store items available for purchase.
    -   **About:** Description, Location, Opening Hours.
-   **Booking Trigger:** Selecting a service initiates the `BookingFlow`.

### 3.4. Booking Flow (`BookingFlow.tsx`)
**Purpose:** Multi-step wizard for creating an appointment.
**Steps:**
1.  **Staff Selection:**
    -   Option: "Any Professional" (Maximum Availability).
    -   List: Specific staff members with avatars and roles.
2.  **Date & Time:**
    -   Date Picker: Horizontal scroll of next 14 days.
    -   Time Slots: Grid of available times (e.g., 10:00, 10:30).
3.  **Review:**
    -   Summary of Service, Staff, Date, Time, and Price.
4.  **Confirmation:**
    -   Submits booking to API.
    -   Displays Success Alert and redirects to Bookings tab.

### 3.5. Bookings List (`BookingsScreen.tsx`)
**Purpose:** Management of past and upcoming appointments.
**Tabs:** "Upcoming" vs "Past".
**Card Details:**
-   Service Name, Tenant Name.
-   Date & Time.
-   Status Badge (Confirmed, Pending, Completed).
-   **Actions:** Cancel (if eligible), View Details.

### 3.6. Profile (`ProfileScreen.tsx`)
**Purpose:** User account management.
**Features:**
-   **Edit Profile:** Name, Email, Phone.
-   **Avatar:** Upload/Change profile picture.
-   **Preferences:** Language toggle, Notifications.
-   **Logout:** Ends session and returns to Welcome screen.

## 4. Current Status & Observations
-   **Mock Data:** Some areas (like Time Slots in `BookingFlow`) currently use mock data and need backend integration for real-time availability.
-   **Payment Integration:** The endpoint is stubbed; real payment gateway integration is required.
-   **Guest Mode:** Supported in `App.tsx` but functionality limited compared to logged-in users.
-   **Styling:** Uses a custom theme system consistent with the brand (purple/primary colors).
