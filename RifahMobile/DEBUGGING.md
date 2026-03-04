# Debugging RifahMobile

## Web: use localhost so the app can call the backend

If you open the app in the **browser** via the **tunnel** URL (`https://....exp.direct`), the page is HTTPS. Browsers then **block** requests to your **HTTP** backend (Mixed Content). Login and API calls will fail with "Failed to fetch" or CORS.

**Fix:** Open the web app at **http://localhost:8081** (or the port Metro shows). Same WiFi is not required. Then the page is HTTP and can call `http://192.168.0.101:5000` and the server will allow it (CORS includes localhost:8081/8082).

1. Run: `npx expo start --go`
2. Press **`w`** to open web
3. If the browser opens the tunnel URL, **change the address bar** to: `http://localhost:8081` (or 8082 if Metro said "Web is waiting on http://localhost:8082")

---

# Debugging "Something went wrong" in Expo Go

## If you see "500" or "MIME type application/json" in the browser

That means **Metro failed to build the bundle**. The real error is **not** in the browser — it appears in the **terminal** where you ran `npx expo start`.

1. Run from the **RifahMobile** folder: `cd RifahMobile` then `npx expo start --go`.
2. Press **`w`** to open web. When the browser shows 500 / MIME error, **switch to the terminal**.
3. In that same terminal, look for **red error lines** or a stack trace that appeared when the page loaded. Copy that full error and share it.

Use the **exact URL** the terminal shows for web (e.g. `http://localhost:8082`). Close any old tabs that might point to another project (e.g. RifahStaff).

---

## Step 1: Get the real error in the browser (when web loads)

1. Run: `npx expo start --go` from **RifahMobile**.
2. When the QR and menu appear, press **`w`** to open the app in the **web** browser.
3. In the browser, press **F12** → **Console** tab.
4. Look for **red error messages**. Copy the full message and stack trace.

If the app loads on web but fails on the phone, the issue is likely device/Expo Go specific.

---

## Step 2: See errors in the terminal when using the phone

1. Run: `npx expo start --go --tunnel -c`.
2. **Scan the QR code** with Expo Go.
3. **Watch the same terminal** where Metro is running. When "Something went wrong" appears on the phone, check if any **new red error lines** appeared in the terminal (e.g. `[Refah] Root render error:` or a React/Metro error).

If you see `[Refah] Bundle loaded` in the terminal when you scan, the bundle is loading and the crash happens during app run. If you never see that log, the bundle or connection may be failing before the app starts.

---

## Step 3: Test with a minimal app (narrow down the cause)

This checks whether **Expo Go itself** works with your project, or only the full app fails.

1. Open **RifahMobile/.env** and add this line (or change it if it exists):
   ```
   EXPO_PUBLIC_DEBUG_MINIMAL=1
   ```
2. Save the file, then **stop Metro** (Ctrl+C) and start again:
   ```bash
   npx expo start --go --tunnel -c
   ```
3. Scan the QR code with Expo Go again.

- **If you see a purple screen with "Hello Expo Go" and "If you see this, Expo Go works."**  
  → Expo Go and the project are fine; the problem is in the full app code. Remove `EXPO_PUBLIC_DEBUG_MINIMAL=1` from `.env` (or set it to `0`) and we can focus on fixing the real app.

- **If you still get "Something went wrong"**  
  → The issue is likely project config, Expo Go version, or device. Try: update Expo Go from the store; use another phone; or try without tunnel on the same WiFi (`npx expo start --go` and scan).

When you’re done testing, remove or comment out `EXPO_PUBLIC_DEBUG_MINIMAL=1` from `.env` so the normal app runs again.
