# Collins Lawncare Tracker

A mobile-friendly lawncare schedule and pay efficiency tracker.

## Features
- 🏠 Workday clock — start when you leave home, stop when you return
- ⏱ Per-job timers with GPS location logging
- ✅ Weekly mow checklist (resets every Monday)
- 💰 Pay-per-visit tracking with automatic $/hr rate calculation
- 🗺 Route map view with Google Maps integration
- 📊 Dashboard with weekly revenue and avg hourly rate
- 💾 Data backup export/import (Settings)

## Run Locally

```bash
npm install
npm run dev
```

## iOS App Store

This app ships as a native iOS app via Capacitor. See **[APP_STORE.md](./APP_STORE.md)** for the full submission checklist.

Quick start on a Mac:

```bash
npm install
npm run build:ios   # build web app + sync to ios/
npm run ios:open    # open in Xcode
```

- **Bundle ID:** `com.collins.lawncare`
- **Privacy policy template:** [docs/PRIVACY_POLICY.md](./docs/PRIVACY_POLICY.md) (host publicly before submitting)
- **Source assets:** `resources/icon.png`, `resources/splash.png`

## Firebase (project: `lawncare-72560`)

Email/password auth and Firestore cloud sync are integrated. On first sign-in, local data migrates to `users/{uid}/data/app` in Firestore.

### 1. Add your web app keys

```bash
cp .env.example .env
# Fill in VITE_FIREBASE_API_KEY, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID
# from Firebase Console → Project Settings → Your apps → Web app
```

Or auto-fetch after `firebase login`:

```bash
npm run firebase:keys lawncare-72560
```

### 2. Deploy security rules (required — production mode blocks all reads/writes by default)

```bash
npx -y firebase-tools@latest login
npm run firebase:deploy:rules
```

### 3. iOS config

```bash
npm run firebase:keys lawncare-72560
```

This also writes `ios/App/App/GoogleService-Info.plist`.

See **[docs/KEYS.md](./docs/KEYS.md)** for details.

## Built With
- React + Vite
- Capacitor (iOS native shell)
- OpenStreetMap embed
- Google Maps routing
- Browser localStorage for data persistence
