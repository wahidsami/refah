# Firebase & in-app push notification setup

How push is wired in this project and what you need for it to work.

---

## Two different Firebase files (do not mix them)

| File | Used by | Where to get it | Where it goes |
|------|--------|------------------|----------------|
| **firebase-service-account.json** | **Backend (server)** – sends FCM messages | Firebase Console → Project Settings → Service accounts → Generate new private key | `server/firebase-service-account.json` |
| **google-services.json** | **Android app (RifahMobile)** – gets a valid FCM token | Firebase Console → Project Settings → Your apps → Android app → Download | `RifahMobile/google-services.json` |

You **cannot** create `google-services.json` from the service account. They are different formats and come from different places in the Firebase Console.

---

## 1. Backend (server) – already correct if you have the file

- **File:** `server/firebase-service-account.json`
- **Role:** Lets the API send push notifications via Firebase Admin SDK.
- **Check:** If the server starts and you see `[Firebase] ✅ Firebase Admin SDK initialized successfully.` in the logs, this part is set up.
- **If missing:** Firebase Console → your project → ⚙️ Project settings → Service accounts → Generate new private key → save as `server/firebase-service-account.json`. Do **not** commit this file (keep it in `.gitignore`).

---

## 2. Android app (RifahMobile) – need google-services.json

The customer app uses **expo-notifications** and gets an FCM token with `getDevicePushTokenAsync()`. For that token to work with your backend, the Android app must be registered in the **same** Firebase project as the server.

### Step 1: Open your Firebase project

- Go to [Firebase Console](https://console.firebase.google.com/).
- Open the **same project** you used for the service account (e.g. the one that contains `firebase-service-account.json` – e.g. `pawsitive-life-odcs0` or your real project name).

### Step 2: Add an Android app (if not already)

1. In the project overview, click **Add app** → **Android**.
2. **Android package name:** use exactly: `com.refah.mobile` (must match `app.json` → `expo.android.package`).
3. Skip “App nickname” and “Debug signing certificate” for now; you can add them later.
4. Click **Register app**.

### Step 3: Download google-services.json

1. On the next screen, click **Download google-services.json**.
2. Save the file.
3. Put it in the **RifahMobile** folder (project root), and name it exactly:
   - `RifahMobile/google-services.json`

So the path is:

```
RifahMobile/
  app.json
  google-services.json   ← here
  package.json
  src/
  ...
```

Do **not** put the server’s `firebase-service-account.json` here. The Android app only needs `google-services.json`.

### Step 4: Tell Expo to use it

In `RifahMobile/app.json`, under `expo.android`, add (or keep) the line that points to this file. For example:

```json
"android": {
  "package": "com.refah.mobile",
  "googleServicesFile": "./google-services.json",
  ...
}
```

After that, run a **new** dev/build (e.g. `npx expo prebuild --clean` then `npx expo run:android`, or `eas build --profile development --platform android`). Existing builds won’t pick up the file until you rebuild.

---

## 3. End-to-end flow (what we have in code)

1. **Customer app (RifahMobile)**  
   - After login, `useCustomerPushNotifications` runs.  
   - It calls `Notifications.getDevicePushTokenAsync()` (or Expo’s token) and sends it to the API: `api.registerFcmToken(pushToken)`.

2. **Backend**  
   - `POST /api/v1/auth/register-fcm` (or your actual route) saves the token on the user (e.g. `platform_users.fcm_token`).

3. **Sending a push**  
   - When something should notify the user (e.g. booking confirmed, service completed), the backend calls `firebaseService.sendToDevice(user.fcm_token, title, body, data)`.  
   - That uses `server/firebase-service-account.json` and FCM to deliver the notification to the device.

So:

- **Backend** = `firebase-service-account.json` in `server/`.
- **Android app** = `google-services.json` in `RifahMobile/` + `googleServicesFile` in `app.json`, then rebuild.

---

## 4. Quick checklist

- [ ] Firebase project has an **Android app** with package name `com.refah.mobile`.
- [ ] **google-services.json** downloaded from that Android app and placed at `RifahMobile/google-services.json`.
- [ ] `RifahMobile/app.json` has `"googleServicesFile": "./google-services.json"` under `expo.android`.
- [ ] **Backend:** `server/firebase-service-account.json` present (same Firebase project). Server log shows Firebase initialized.
- [ ] Rebuild the app (EAS or `expo run:android`), then install and log in so the app can register an FCM token and receive pushes.

---

## 5. If push still doesn’t work

- Confirm the device gets a token: e.g. log or network tab for `registerFcmToken` and check the backend stores it (e.g. `platform_users.fcm_token`).
- Confirm the backend uses the **same** Firebase project as the Android app (same project as in `google-services.json` and `firebase-service-account.json`).
- On Android, ensure the app has notification permission and that you’re testing on a **development build** (or release), not Expo Go (Expo Go does not support FCM on recent SDKs).
