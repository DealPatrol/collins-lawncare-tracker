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

## Firebase keys (cloud sync / auth)

The app runs offline with localStorage today. To add Firebase (sync, auth, Firestore), see **[docs/KEYS.md](./docs/KEYS.md)**.

Quick setup on your Mac:

```bash
npx -y firebase-tools@latest login
npm run firebase:keys
```

This writes `.env` and `ios/App/App/GoogleService-Info.plist`.

## Built With
- React + Vite
- Capacitor (iOS native shell)
- OpenStreetMap embed
- Google Maps routing
- Browser localStorage for data persistence
