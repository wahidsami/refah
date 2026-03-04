# 📱 Staff Mobile App Integration & Account Management

This plan outlines the technical requirements and steps to implement individual staff accounts, enabling staff members to log in to a dedicated mobile app to view their schedules, income, and notifications.

## User Review Required

> [!IMPORTANT]
> **Staff Authentication Strategy**: We will use the existing centralized `auth_users` table (managed via the `User` model) for staff credentials. This ensures consistent security across the platform while linking to the professional `Staff` profile.
> 
> **Login Access**: A new toggle in the Tenant Dashboard will allow owners to selectively enable or disable mobile app access for each employee.

---

## Proposed Changes

### 1. Database & Models (Backend)

#### [NEW] [20260220_expand_staff_and_auth.sql](file:///d:/Waheed/MypProjects/BookingSystem/server/migrations/20260220_expand_staff_and_auth.sql)
- Add columns to `staff` table:
  - `userId` (UUID, FK to `auth_users.id`)
  - `gender` (VARCHAR)
  - `dateOfBirth` (DATE)
  - `salaryType` (VARCHAR: 'fixed', 'commission', 'both')
  - `allowOnlineBooking` (BOOLEAN, default TRUE)
  - `loginAccess` (BOOLEAN, default FALSE)
- Add `staff` role to `User.js` model if not already functional.

#### [MODIFY] [Staff.js](file:///d:/Waheed/MypProjects/BookingSystem/server/src/models/Staff.js)
- Add the new fields to the `init` and `associate` methods.
- Define relationship: `Staff.belongsTo(models.User, { foreignKey: 'userId', as: 'user' })`.

---

### 2. API & Controllers (Backend)

#### [MODIFY] [tenantEmployeeController.js](file:///d:/Waheed/MypProjects/BookingSystem/server/src/controllers/tenantEmployeeController.js)
- **`createEmployee`**: 
  - If `loginAccess` is true, create a corresponding `User` record with role `staff`, the provided `email`, and a temporary `password`.
  - Link the `userId` to the new `Staff` record.
- **`updateEmployee`**: 
  - Manage the activation/deactivation of the `User` account based on `loginAccess`.
  - Handle updating the linked `User` record if the `email` changes.

#### [NEW] [staffAuthController.js](file:///d:/Waheed/MypProjects/BookingSystem/server/src/controllers/staffAuthController.js)
- Implement `login`, `refreshToken`, and `getProfile` for staff members.
- Ensure the login specifically validates that the user role is `staff` and they are active.

---

### 3. Tenant Dashboard (Frontend)

#### [MODIFY] [Staff Creation/Edit Forms](file:///d:/Waheed/MypProjects/BookingSystem/tenant/src/app/[locale]/dashboard/employees)
- Add UI fields for:
  - **Gender** (Select)
  - **Date of Birth** (Date Picker)
  - **Salary Type** (Select: Monthly, Commission, Both)
  - **Online Booking** (Toggle)
  - **App Login Access** (Toggle)
- **Security Section**: Add a "Set/Reset Password" field that only appears when `loginAccess` is enabled.

---

## Verification Plan

### Automated Tests
1. **Model Validation**: Run existing model tests and add a new test case for `Staff` association with `User`.
   - Command: `cd server && npm test`
2. **API Interaction**: 
   - Test creating an employee with `loginAccess: true` and verify both `staff` and `auth_users` records are created.
   - Test staff login via a script (e.g., `curl` or a small JS script) to ensure JWT is issued.

### Manual Verification
1. **Tenant Dashboard**:
   - Navigate to `/dashboard/employees/new`.
   - Create a staff member with "App Login Access" enabled.
   - Verify the success message and check the database for the linked user.
2. **Staff Login**:
   - Use the created credentials to hit the new `/api/v1/staff/login` endpoint via Thunder Client or Postman.
   - Verify the response contains the staff's schedule and basic profile data.
