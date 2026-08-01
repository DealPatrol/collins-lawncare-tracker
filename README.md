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

Email/password auth and Firestore cloud sync are integrated. Data syncs to `users/{uid}/data/app` when signed in, with **localStorage as an offline fallback**.

```bash
cp .env.example .env   # keys are pre-filled for lawncare-72560
npm run dev
```

Deploy Firestore security rules (required for production mode):

```bash
npx -y firebase-tools@latest login
npm run firebase:deploy:rules
```

- **Security rules audit:** [docs/FIRESTORE_RULES_AUDIT.md](./docs/FIRESTORE_RULES_AUDIT.md)
- **iOS native Firebase (stubbed):** [docs/IOS_FIREBASE.md](./docs/IOS_FIREBASE.md)

## Built With
- React + Vite
- Capacitor (iOS native shell)
- OpenStreetMap embed
- Google Maps routing
- Browser localStorage for data persistence
