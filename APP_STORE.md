# App Store Submission Guide

This app is packaged for the Apple App Store using [Capacitor](https://capacitorjs.com/). The web UI lives in `src/`, builds to `dist/`, and runs inside a native iOS shell in `ios/`.

## Prerequisites

1. **Apple Developer Program** membership ($99/year) — [developer.apple.com/programs](https://developer.apple.com/programs/)
2. **Mac with Xcode 15+** — required to build, sign, and upload iOS binaries
3. **Node.js 20+** — for web build and Capacitor sync

## App metadata (ready to paste)

| Field | Value |
|-------|-------|
| **App name** | Collins Lawncare |
| **Bundle ID** | `com.collins.lawncare` |
| **Version** | 1.0.0 |
| **Category** | Business or Productivity |
| **Subtitle** | Schedule & pay tracker for lawn care |
| **Keywords** | lawncare, lawn care, schedule, tracker, route, pay, hourly, mowing |
| **Support URL** | Your business website or email |
| **Privacy Policy URL** | Required — host `docs/PRIVACY_POLICY.md` on a public URL |

### App description (suggested)

> Collins Lawncare Tracker helps solo and small lawn-care crews manage their day in the field.
>
> • Start your workday clock when you leave home and stop when you return
> • Time each yard visit with GPS logging
> • Track weekly mowing progress with a checklist that resets every Monday
> • See per-visit pay and automatic hourly rate calculations
> • View your route on a map and open directions in Google Maps
> • Export and restore your data from Settings
>
> All data stays on your device. No account required.

### Location permission (already configured)

The app requests **When In Use** location access to log job arrival coordinates. The usage string is in `ios/App/App/Info.plist`:

> Collins Lawncare uses your location to log job arrival GPS coordinates and track your workday route.

## Build and open in Xcode

On your Mac, after cloning the repo:

```bash
npm install
npm run build:ios
npm run ios:open
```

This builds the web app, syncs it into the iOS project, and opens the iOS project in Xcode.

## Xcode signing setup

1. Select the **App** target in Xcode
2. Open **Signing & Capabilities**
3. Choose your **Team** (Apple Developer account)
4. Confirm **Bundle Identifier** is `com.collins.lawncare`
5. Enable **Automatically manage signing**

## Test on a real device

1. Connect an iPhone via USB
2. Select your device as the run destination
3. Press **Run** (⌘R)
4. Verify:
   - Location permission prompt appears and GPS logging works
   - Workday clock, per-job timers, and backup export/import work
   - Safe areas look correct on notched iPhones

## Create the App Store listing

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. **My Apps → + → New App**
3. Platform: **iOS**
4. Name: **Collins Lawncare**
5. Bundle ID: **com.collins.lawncare**
6. SKU: `collins-lawncare-tracker` (any unique string)

### Required assets

| Asset | Spec |
|-------|------|
| **App icon** | 1024×1024 PNG, no transparency — use `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` or `resources/icon.png` |
| **Screenshots** | At minimum: 6.7" (iPhone 15 Pro Max) and 6.5" (iPhone 11 Pro Max) — capture from Simulator or device |
| **Privacy policy** | Public HTTPS URL (see `docs/PRIVACY_POLICY.md`) |

### App Privacy questionnaire (App Store Connect)

When asked about data collection:

- **Location (Precise)** — collected, linked to user: **No**, used for **App Functionality**, not tracking
- **No account creation**, no third-party analytics, no ads
- Data stored **on device only** (localStorage)

Encryption: `ITSAppUsesNonExemptEncryption` is set to `false` in Info.plist (standard HTTPS only).

## Archive and upload

1. In Xcode, set destination to **Any iOS Device (arm64)**
2. **Product → Archive**
3. When the Organizer opens, click **Distribute App**
4. Choose **App Store Connect → Upload**
5. Follow the prompts to upload the build

After processing (usually 15–30 minutes), select the build in App Store Connect under **TestFlight** or your version's **Build** section.

## Submit for review

1. Complete all App Store Connect metadata fields
2. Add the uploaded build to the version
3. Answer export compliance (select "No" for custom encryption — already declared in Info.plist)
4. Click **Submit for Review**

Typical review time is 24–48 hours.

## Updating the app

1. Bump `version` in `package.json` and `MARKETING_VERSION` in Xcode
2. Increment `CURRENT_PROJECT_VERSION` (build number) in Xcode
3. Run `npm run build:ios`
4. Archive and upload a new build

## Regenerating icons and splash screens

Replace `resources/icon.png` (1024×1024) and `resources/splash.png` (2732×2732), then:

```bash
npm run assets:generate
npm run build:ios
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| White screen on launch | Run `npm run build:ios` to sync latest web build |
| Location not working | Check Info.plist has `NSLocationWhenInUseUsageDescription`; test on real device |
| Signing errors | Verify Apple Developer membership and Team selection in Xcode |
| Missing privacy manifest | `ios/App/App/PrivacyInfo.xcprivacy` is included in the Xcode project |
