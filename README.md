# Collins Lawncare Tracker

A crew-ready lawncare operations app: GPS-automated time tracking, route planning, and pay efficiency — built for the field.

## Features

### GPS automation
- 🎯 **Geofence auto-stop** — the job timer stops and saves itself when the crew drives out of the job site zone (per-job radius, 60–400 m)
- 📍 **Arrival detection** — pull up to a pinned yard and the app suggests starting the timer
- 🛣 **Automatic mileage** — an odometer runs while you're clocked in, feeding the crew distance leaderboard

### Crew
- 👷 Crew profiles (member / manager) — each device tracks hours, stops, and miles to the right person
- 🏆 Distance leaderboard (today / this week) with yards, mower time, and earnings per member
- 📋 Live "Today's Activity" view for crew managers

### Planning & money
- 🗺 **Route Planner** — optimized stop order (nearest-neighbor + 2-opt), per-leg drive estimates, rolling ETAs, and one-tap Google Maps navigation
- 📈 **Growth Zones** — groups pinned yards into geographic zones and scores each zone's true $/hr *with drive time included*; shows which zones are anchors, which need 1–2 more yards to be worth the trip, and flags isolated "route drag" yards where the detour eats the pay
- 🎯 **Lead tracker** — log prospects zone-by-zone while you're already in the neighborhood (New → Quoted → Won), set a target monthly rate, and convert a won lead straight into a job
- 📄 **Monthly contracts** — jobs can bill per-visit or as year-round monthly contracts; zone revenue and growth math use real contract value
- 🌦 Weather on the dashboard with rain-window warnings (Open-Meteo, no API key)
- ⏱ Per-job timers, weekly mow checklist (resets every Monday), $/hr rate scoring
- 📊 Workday clock, 7-day earnings chart, weekly revenue
- 💾 Data backup export/import (Settings) — also used to merge data between crew devices

> **Note:** GPS tracking runs while the app is open (foreground). True background geofencing on iOS requires a background-location entitlement and is a good next step.

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
npm run firebase:env   # writes .env from config/firebase/web.config.json
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
