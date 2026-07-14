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

## Built With
- React + Vite
- Capacitor (iOS native shell)
- OpenStreetMap embed
- Google Maps routing
- Browser localStorage for data persistence
