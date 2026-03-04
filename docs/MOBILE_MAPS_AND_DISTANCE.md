# Mobile App: Distance & Google Maps Integration

## What’s already in place

### 1. Distance (customer ↔ tenant)

- **Where:** Tenant page hero subtitle (e.g. “2.3 km away” or “450 m away”) and in the About tab context.
- **How:**  
  - Customer location: **expo-location** (`getCurrentPositionAsync`) after permission.  
  - Tenant location: **coordinates** from API (`tenant.coordinates`: `{ lat, lng }`).  
  - **Formula:** Haversine (straight-line distance in km).  
- **Meaning:** “As the crow flies” distance, not driving/road distance.  
- **Requirements:**  
  - Tenant has **coordinates** set in the dashboard.  
  - User grants **location permission**; otherwise distance is hidden.

### 2. “View on Map” and “Get directions”

- **Location section (About tab):**
  - **View on Map:** Opens the tenant’s Google Map link (or `https://www.google.com/maps?q=lat,lng`) in the in-app WebView or in the browser/Maps app when tapping the button.
  - **Get directions:** Opens **Google Maps** (app or browser) with **directions** from the customer’s current location to the tenant.
    - URL: `https://www.google.com/maps/dir/?api=1&destination=lat,lng&travelmode=driving`
    - If we have the user’s location we add `&origin=userLat,userLng` so the route starts from their position; otherwise Google Maps uses “My location” on mobile.
- **No API key** is required for these links; they use the public Google Maps URLs.

---

## Showing the route in Google Maps (current behavior)

- User taps **“Get directions”** in the Location section.
- The app opens the Google Maps directions URL above.
- The **Google Maps app** (if installed) or the browser shows the **route** from current location to the tenant. No extra integration is needed for this flow.

---

## Optional: In-app map with route (Google Maps SDK)

To show the **map and the route inside the app** (instead of opening the Maps app):

1. **Google Cloud**
   - Create a project and enable:
     - **Maps SDK for Android**
     - **Maps SDK for iOS**
     - **Directions API** (for the route polyline).
   - Create an API key and restrict it (per platform and/or referrer).

2. **React Native**
   - Install **react-native-maps** and configure the Google Maps provider (and API key) for Android/iOS.
   - Use **Directions API** (HTTP) to get the route (e.g. `origin`, `destination`, get back `routes[0].overview_polyline`), then decode the polyline and draw it on the map.
   - Or use a library that wraps Directions (e.g. `react-native-maps-directions`) if you want to avoid low-level polyline handling.

3. **Expo**
   - Use a config plugin for `react-native-maps` and pass the Google API key in `app.json` / `app.config.js` so the native projects get the key.

4. **Cost**
   - Directions API and Maps SDK are billable (with free tier). Check Google Maps Platform pricing.

**Summary:** Distance is already integrated (Haversine). The route is shown by opening Google Maps via “Get directions.” In-app map + route is optional and requires Google Maps SDK + Directions API and an API key.
