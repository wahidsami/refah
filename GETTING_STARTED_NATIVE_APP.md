# 🚀 Getting Started with Native App Development

## Prerequisites - What You Need First

### 1. Development Environment

#### On Your Windows PC:

**Node.js & npm** ✅ Already have it!
- Version: 20.19.4
- npm: 10.8.2

**Git** (For version control)
```bash
# Check if installed
git --version

# If not installed, download from: https://git-scm.com/
```

**Code Editor** ✅ Already have it!
- VSCode (your current editor)

**Expo CLI** (NEW - Need to install)
```bash
npm install -g expo-cli
```

**EAS CLI** (For building apps)
```bash
npm install -g eas-cli
```

---

### 2. Mobile Testing Devices

**Option A: Physical Devices** (RECOMMENDED)
- [ ] Android phone (for testing)
- [ ] iPhone (for testing iOS)

**Option B: Emulators** (Slower, but free)
- [ ] Android Studio (for Android Emulator)
- [ ] Xcode (Mac only, for iOS Simulator)

**Option C: Expo Go App** (EASIEST) ⭐
- [ ] Install "Expo Go" app on your phone (free)
- [ ] Scan QR code to test instantly
- [ ] No build needed during development

---

### 3. Apple & Google Accounts

**For iOS (Apple):**
- [ ] Apple Developer Account ($99/year)
- [ ] Required to publish to App Store
- [ ] Can wait until ready to publish

**For Android (Google):**
- [ ] Google Play Console account ($25 one-time)
- [ ] Required to publish to Play Store
- [ ] Can wait until ready to publish

**Note:** You DON'T need these for development, only for publishing!

---

### 4. Design Assets

**App Icons:**
- [ ] 1024x1024 px (high-resolution)
- [ ] Transparent or solid background
- [ ] Your Rifah logo

**Splash Screen:**
- [ ] 2048x2048 px
- [ ] Rifah logo + tagline
- [ ] Background color

**Onboarding Images:**
- [ ] 4 illustrations (1080x1920 px each)
- [ ] Screen 1: "Browse Beautiful Salons"
- [ ] Screen 2: "Book Services Easily"
- [ ] Screen 3: "Track Your Bookings"
- [ ] Screen 4: "Exclusive Deals"

**Optional:** Hire designer on Fiverr ($50-150) or use Canva

---

## Quick Start Checklist

### Step 1: Install Tools (5 minutes)

```bash
# Install Expo CLI
npm install -g expo-cli

# Install EAS CLI (for building)
npm install -g eas-cli

# Verify installation
expo --version
eas --version
```

### Step 2: Create Expo Account (2 minutes)

```bash
# Create free account at expo.dev
# or run:
expo register

# Then login:
expo login
```

### Step 3: Download Expo Go App (2 minutes)

**On your phone:**
- Android: https://play.google.com/store/apps/details?id=host.exp.exponent
- iOS: https://apps.apple.com/app/expo-go/id982107779

### Step 4: Create Project (1 minute)

```bash
# Navigate to BookingSystem directory
cd d:\Waheed\MypProjects\BookingSystem

# Create new React Native project
npx create-expo-app@latest RifahMobile --template blank-typescript

# Enter project
cd RifahMobile

# Start development server
npm start
```

### Step 5: Test on Phone (1 minute)

1. Run `npm start` in terminal
2. QR code appears
3. Open Expo Go app on phone
4. Scan QR code
5. App loads on your phone! 🎉

---

## What Happens Next?

### Week 1: Foundation (5 days)

**Day 1: Project Setup**
- [x] Install tools
- [ ] Create Expo project
- [ ] Test on phone with Expo Go
- [ ] Setup Git repo
- [ ] Install dependencies

**Day 2: Copy Reusable Code**
- [ ] Copy API client from `client/src/lib/api.ts`
- [ ] Copy contexts from `client/src/contexts/`
- [ ] Copy i18n from `client/src/i18n/`
- [ ] Copy types from `client/src/lib/api.ts`
- [ ] Test API connection to backend

**Day 3: Splash & Language**
- [ ] Create splash screen
- [ ] Create language selection screen
- [ ] Add AsyncStorage for settings
- [ ] Test on phone

**Day 4: Onboarding Screens**
- [ ] Create 4 onboarding screens
- [ ] Add swipe navigation
- [ ] Add skip button
- [ ] Add "Get Started" button

**Day 5: Navigation Setup**
- [ ] Install React Navigation
- [ ] Setup stack navigator
- [ ] Setup tab navigator
- [ ] Test navigation flow

---

### Week 2: Authentication (5 days)

**Day 6-7: Login/Register**
- [ ] Create login screen
- [ ] Create register screen
- [ ] Connect to backend API
- [ ] Add validation

**Day 8: OTP Verification**
- [ ] Create OTP screen
- [ ] Send SMS code (backend)
- [ ] Verify code
- [ ] Auto-login after verify

**Day 9-10: Auth Context**
- [ ] Setup auth context
- [ ] Token storage (AsyncStorage)
- [ ] Auto-refresh tokens
- [ ] Protected routes

---

### Week 3-4: Main Features

Continue with booking flow, tenant browsing, profile, etc.

---

## Costs Breakdown

### Immediate (Week 1):
| Item | Cost |
|------|------|
| Expo account | $0 (free tier) |
| Development tools | $0 (all free) |
| Testing (Expo Go) | $0 (free app) |
| **Total Week 1** | **$0** |

### Optional Now:
| Item | Cost |
|------|------|
| Designer (onboarding images) | $50-150 |
| Stock images (if not using designer) | $20-50 |

### Later (When Publishing):
| Item | Cost | When |
|------|------|------|
| Apple Developer | $99/year | Week 4-5 |
| Google Play | $25 one-time | Week 4-5 |
| Expo EAS Build | $29/month | Week 4-5 |

---

## FAQ

**Q: Do I need a Mac for iOS development?**
A: No! Expo EAS can build iOS apps in the cloud from Windows.

**Q: Can I test without a physical phone?**
A: Yes, but emulators are slow. Expo Go on real phone is better.

**Q: Do I need to know Swift or Kotlin?**
A: No! Everything is TypeScript/JavaScript (same as your current code).

**Q: How long until first working version?**
A: Can have splash → login → home screen working in **Week 1**!

**Q: Can I reuse my current backend?**
A: YES! 100% compatible, no changes needed.

**Q: What if I get stuck?**
A: Expo has excellent documentation + I'm here to help! 🫡

---

## Ready to Start? 🚀

**Minimal start (right now):**
```bash
# 1. Install Expo CLI
npm install -g expo-cli

# 2. Create project
cd d:\Waheed\MypProjects\BookingSystem
npx create-expo-app@latest RifahMobile --template blank-typescript

# 3. Run it
cd RifahMobile
npm start

# 4. Scan QR with Expo Go app
# 5. See "Hello World" on your phone! 🎉
```

**Then tell me:** "Captain, let's build the splash screen!" and we continue step by step! 💪

---

## Documents Created

All plans now saved in your project:

1. **NATIVE_APP_PLAN.md** - Complete migration plan
2. **ONBOARDING_ACCESSIBILITY_PLAN.md** - Onboarding flow + accessibility
3. **GETTING_STARTED_NATIVE_APP.md** - This document (what you need to start)

**Location:** `d:\Waheed\MypProjects\BookingSystem\`

Ready when you are! 🫡
