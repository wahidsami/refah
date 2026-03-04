# RifahMobile – Production button / UX audit

Audit of buttons and actions that are non-functional or do nothing, for production readiness.

---

## Critical (fix before production)

### 1. App.tsx – Storage cleared on every launch
- **File:** `App.tsx`
- **Issue:** `await AsyncStorage.clear()` runs on every app init (inside `init` in `useEffect`). This wipes auth tokens, user data, and onboarding state on every cold start.
- **Fix:** Remove the call or guard with `__DEV__` so it only runs in development.

### 2. MoreScreen – Logout does nothing
- **File:** `src/screens/MoreScreen.tsx`
- **Issue:** "Logout" calls `handleLogout()` which only `console.log('Logout clicked')`. User stays logged in.
- **Fix:** Clear tokens/user (e.g. via `api`), then navigate back to Welcome (or switch app root to show Welcome/Login).

### 3. MoreScreen – My Appointments navigates to non-existent screen
- **File:** `src/screens/MoreScreen.tsx`
- **Issue:** Tapping "My Appointments" calls `navigation.navigate('Bookings')`. Root stack has no screen named `Bookings`; appointments live under tab `Appointments`.
- **Fix:** Navigate to the Appointments tab: `navigation.navigate('Tabs', { screen: 'Appointments' })`.

### 4. MoreScreen – Payments, Settings, About do nothing
- **File:** `src/screens/MoreScreen.tsx`
- **Issue:** Tapping "Payments", "Settings", or "About Refah" only logs to console; no navigation or UI.
- **Fix:** Either add stack screens (Payment list, Settings, About) and navigate, or navigate to existing "Payment" screen for Payments and add placeholder screens / in-app web view for Settings and About.

### 5. ProfileScreen – Edit Profile button has no action
- **File:** `src/screens/ProfileScreen.tsx`
- **Issue:** "Edit Profile" `TouchableOpacity` has no `onPress`. Tap does nothing.
- **Fix:** Add `onPress` that opens an edit-profile flow (new screen or modal) or, short-term, show an alert "Coming soon" so the button is not dead.

### 6. HomeHeader – Notifications icon does nothing
- **File:** `src/components/home/HomeHeader.tsx`
- **Issue:** Bell icon uses `onPress={() => console.log('Notifications')}`. Does not open Notifications screen.
- **Fix:** `onPress={() => navigation.navigate('Notifications')}`.

---

## Medium (confusing or incomplete UX)

### 7. TenantScreen – Heart (favorite) and Share buttons
- **File:** `src/screens/TenantScreen.tsx`
- **Issue:** Two header icon buttons (heart-outline, share-outline) have no `onPress`. They look tappable but do nothing.
- **Fix:** Implement share (e.g. `Share.share()` with tenant URL) and optional favorite (e.g. save to local list or call API if backend supports it). If not implementing soon, consider hiding or showing a "Coming soon" toast.

### 8. HomeScreen – All "See all" section links
- **File:** `src/screens/HomeScreen.tsx`
- **Issue:** "See all" for Hot Deals, New to Refah, Categories, Trending now, Top providers all use `onSeeAll={() => console.log('...')}`. No navigation.
- **Fix:** Navigate to Browse/Search with an optional filter (e.g. `navigation.navigate('Browse')` or pass a tab/filter so the search screen can show "all deals", "all categories", etc.).

### 9. CategoriesGrid – Category tiles
- **File:** `src/components/home/CategoriesGrid.tsx`
- **Issue:** Each category tile has `onPress={() => console.log('Category:', category.slug)}`. No search or filtered list.
- **Fix:** Navigate to Browse with category filter (e.g. `navigation.navigate('Browse', { categorySlug: category.slug })`) and implement category filter in SearchScreen, or open a category-specific list.

---

## Optional / Drawer (if Drawer is used)

### 10. DrawerNavigator – Language and Browse Salons
- **File:** `src/navigation/DrawerNavigator.tsx`
- **Issue:** US/SA language buttons have no `onPress` (do not switch language). "Browse Salons" button has no `onPress`. Logout only `console.log('Logout')`. Drawer only registers Dashboard and Home; other menu items (Profile, Bookings, etc.) navigate to screen names that may not exist in this navigator.
- **Note:** Main app entry uses `RootNavigator` (tabs + stack), not this Drawer. If Drawer is not used in production, this is lower priority.

---

## Summary

| Area           | Issue                          | Severity  |
|----------------|--------------------------------|-----------|
| App init       | AsyncStorage.clear() on launch | Critical  |
| MoreScreen     | Logout                         | Critical  |
| MoreScreen     | My Appointments (wrong nav)    | Critical  |
| MoreScreen     | Payments, Settings, About      | Critical  |
| ProfileScreen  | Edit Profile                   | Critical  |
| HomeHeader     | Notifications icon             | Critical  |
| TenantScreen   | Heart, Share                   | Medium    |
| HomeScreen     | See all (all sections)          | Medium    |
| CategoriesGrid | Category tap                   | Medium    |
| Drawer         | Lang, Browse, Logout, screens | Low (if used) |

---

## Recommended order of fixes

1. ~~Remove or guard `AsyncStorage.clear()` in `App.tsx`.~~ **Done** – guarded with `__DEV__ && false`.
2. ~~Implement logout in MoreScreen and fix My Appointments navigation.~~ **Done** – LogoutContext + `api.clearTokens()` + confirm dialog; My Appointments → `Tabs/Appointments`.
3. ~~Wire Notifications in HomeHeader; add Edit Profile action (or "Coming soon") in ProfileScreen.~~ **Done** – HomeHeader bell → Notifications; Edit Profile → "Coming soon" alert.
4. ~~Add navigation for Payments (and placeholders for Settings/About) from MoreScreen.~~ **Done** – Payments, Settings, About show "Coming soon" alert.
5. ~~Implement or stub Share (and optional Favorite) on TenantScreen.~~ **Done** – Share uses `Share.share()`; Heart shows "Favorites coming soon" alert.
6. ~~Wire "See all" and category taps to Browse with filters where applicable.~~ **Done** – All "See all" → navigate to Browse; category tap → Browse with `categorySlug` param; SearchScreen uses param as initial query.
