# Dev app with push notifications (fast path)

Local `npx expo run:android` is slow (Gradle, native compile). Use **EAS Build** so the heavy work runs in the cloud and you just download the APK.

---

## Quick commands (deploy a new build for push)

**First time only:**

```bash
npm install -g eas-cli
eas login
cd "D:\Waheed\MypProjects\BookingSystem 2\RifahMobile"
eas init
```

**Every time you want a new build (push-enabled, not Expo Go):**

```bash
cd "D:\Waheed\MypProjects\BookingSystem 2\RifahMobile"
npm run build:dev
```

- Wait for the build to finish (~10–15 min). You’ll get a **download link** in the terminal (and at [expo.dev](https://expo.dev) → your project → Builds).
- **Download the APK** from that link on your phone (or transfer from PC).
- **Install** the APK (allow “Install from unknown sources” if asked).
- **Run your dev server** so the app can load JS:  
  `npm start`  
  Then open the **Refah** app on the device; it will connect to Metro. Push will work in this build.

---

## One-time setup (about 2 minutes)

1. **Install EAS CLI** (if not already):
   ```bash
   npm install -g eas-cli
   ```

2. **Log in to Expo** (free account at [expo.dev](https://expo.dev)):
   ```bash
   eas login
   ```

3. **Link this project** (first time only, from `RifahMobile` folder):
   ```bash
   cd RifahMobile
   eas init
   ```
   When asked, choose **Create a new project** (or link existing). This sets the EAS project ID.

## Build a dev APK (push enabled)

From the `RifahMobile` folder:

```bash
npm run build:dev
```

- Build runs on Expo’s servers (typically 10–15 min, no load on your PC).
- When it finishes, you get a **link to download the APK** in the terminal and in [expo.dev](https://expo.dev) → your project → Builds.

**Install the APK on your Android device:**

- Download the APK from the link.
- On the phone: allow “Install from unknown sources” for your browser or file manager if prompted.
- Install and open the app.

**Run your dev server and connect:**

```bash
npm start
```

- Open the **Refah** app on the device (the one you installed from the build).
- It will try to connect to Metro. Use the same Wi‑Fi as your PC, or follow the on-screen URL (e.g. `exp://192.168.x.x:8081`).
- Push notifications work in this build (native client, not Expo Go).

## Optional: standalone preview APK (no Metro)

If you want an APK that runs **without** running `npm start` (e.g. to test push only):

```bash
npm run build:preview
```

- Install the APK from the link.
- App runs standalone and uses your backend (set `EXPO_PUBLIC_SERVER_URL` in EAS or in `.env` when you build).
- Good for “install once and test push” without opening the dev server.

## Summary

| Goal                         | Command              | Then |
|-----------------------------|----------------------|------|
| Dev app + push, use with Metro | `npm run build:dev`  | Install APK → run `npm start` → open app on device |
| Standalone APK + push       | `npm run build:preview` | Install APK → use app (no Metro) |

First build is ~10–15 min in the cloud. Later builds are faster. No Gradle or long native builds on your machine.
