# 📱 Rifah Mobile - React Native App

## Quick Start

### 1. Install Dependencies (if not done already)
```bash
npm install
```

### 2. Start Development Server
```bash
npm start
```

### 3. Test on Your Phone

**Option A: Expo Go (Easiest)**
1. Install "Expo Go" app on your phone:
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent
   - iOS: https://apps.apple.com/app/expo-go/id982107779

2. Scan the QR code that appears in terminal

3. App loads on your phone! 🎉

**Option B: Run on Emulator**
```bash
# Android
npm run android

# iOS (Mac only)
npm run ios
```

---

## Project Structure

```
RifahMobile/
├── src/
│   ├── api/           # API client (copied from client app)
│   ├── components/    # Reusable React Native components
│   ├── screens/       # App screens (Splash, Login, Home, etc.)
│   ├── contexts/      # React Context (Auth, Language)
│   ├── i18n/          # Translations (AR/EN)
│   ├── utils/         # Helper functions
│   └── types/         # TypeScript types
├── assets/            # Images, fonts, icons
├── App.tsx            # Root component
├── app.json           # Expo configuration
└── .env               # Environment variables
```

---

## Development Workflow

### Day 1: Setup ✅
- [x] Create Expo project
- [x] Create src directory structure
- [x] Configure app.json
- [x] Add .env file

### Day 2: Copy Reusable Code
- [ ] Copy API client from `../client/src/lib/api.ts`
- [ ] Copy contexts from `../client/src/contexts/`
- [ ] Copy i18n from `../client/src/i18n/`
- [ ] Test API connection

### Day 3: Splash & Language
- [ ] Create splash screen
- [ ] Create language selection
- [ ] Add AsyncStorage

### Day 4: Onboarding
- [ ] Create 4 onboarding screens
- [ ] Add swipe navigation

### Week 2+: Main Features
- [ ] Auth (Login/Register/OTP)
- [ ] Browse tenants
- [ ] Booking flow
- [ ] Profile

---

## Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android emulator
- `npm run ios` - Run on iOS simulator (Mac only)
- `npm run web` - Run in web browser

---

## Environment Variables / Build Configuration

The app determines the backend address from (in priority order):

1. `Constants.expoConfig.extra.serverUrl` – set in `app.json` or via an
   EAS build profile (`EAS_BUILD_PROFILE_EXTRA_SERVERURL`).
2. `EXPO_PUBLIC_SERVER_URL` – useful during development when using Expo Go.
3. Fallback hard‑coded value (`http://10.0.2.2:5000`, which works only in the
   Android emulator).

You can still use a `.env` file for convenience when running the dev server, e.g.: 

```bash
# for localhost (web/emulator)
EXPO_PUBLIC_SERVER_URL=http://localhost:5000

# for physical device (update to your machine's IP on the LAN)
EXPO_PUBLIC_SERVER_URL=http://192.168.1.100:5000
```

> 🎯 **Important:** When creating a stand‑alone build (APK/IPA) you **must**
> override `serverUrl` in `app.json` or via EAS, otherwise the default
> `10.0.2.2` address will not be reachable from a real device and you'll see
> network errors during login.

To find your PC's IP address:

```bash
ipconfig  # Windows
# or `ifconfig` / `ip addr` on macOS/Linux
```
Look for the "IPv4 Address" of the adapter you're using for Wi‑Fi.

---

## RTL Support (Arabic)

The app is configured for RTL support:
- `supportsRTL: true` in app.json
- Automatic direction switching based on language
- Proper Arabic font rendering

---

## Next Steps

1. **Copy API Client**
   ```bash
   cp ../client/src/lib/api.ts src/api/client.ts
   ```

2. **Install Additional Dependencies**
   ```bash
   npm install @react-native-async-storage/async-storage expo-secure-store
   ```

3. **Create First Screen**
   - Start with splash screen
   - Then language selection
   - Then onboarding

---

## Troubleshooting

### QR Code not working?
- Make sure phone and PC are on same WiFi
- Try manual connection: type the URL shown in terminal

### "Unable to resolve module"?
- Run `npm install` again
- Clear cache: `npx expo start -c`

### Changes not reflecting?
- Shake phone → tap "Reload"
- Or press 'r' in terminal

---

## Resources

- **Expo Docs**: https://docs.expo.dev/
- **React Native Docs**: https://reactnative.dev/
- **Native App Plan**: ../NATIVE_APP_PLAN.md
- **Onboarding & Accessibility**: ../ONBOARDING_ACCESSIBILITY_PLAN.md

---

**Ready to build?** Start with `npm start`! 🚀
