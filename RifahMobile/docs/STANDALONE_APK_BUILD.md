# Standalone APK (no dev server, no QR code)

If you built with **development** and the app shows **"Error loading app"** / **"failed to connect to ... (port 8081)"** and asks for a dev server or QR code, that’s because **development** builds don’t include the app bundle—they expect a running Metro server.

To get an APK that **runs by itself** (no server, no QR code):

---

## Build a standalone APK

From the **RifahMobile** folder:

```bash
cd "D:\Waheed\MypProjects\BookingSystem 2\RifahMobile"
npm run build:preview
```

Or for a production build:

```bash
npm run build:production
```

- When EAS finishes, use the **download link** from the terminal or from [expo.dev](https://expo.dev) → your project → Builds.
- Install that APK on the device. The app will open and run **without** needing a dev server or QR code.

---

## Build profiles (summary)

| Profile       | Command / script           | Use case |
|---------------|----------------------------|----------|
| **development** | `npm run build:dev`       | Dev client: loads JS from your PC’s Metro server (same Wi‑Fi). Needs `npx expo start`. |
| **preview**     | `npm run build:preview`   | Standalone APK for testing (e.g. internal). **No server needed.** |
| **production**  | `eas build -p android --profile production` | Standalone APK for store/release. **No server needed.** |

For “download APK and use it without a server”, use **preview** or **production**, not development.
