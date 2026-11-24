# TurfRoute for iPhone — App Store checklist

TurfRoute (formerly *Collins Lawncare Tracker*) is the same React web app, **bundled inside the binary** with
Capacitor 8 (Swift Package Manager) and extended with native iOS features. The live web app on Vercel keeps
working exactly as before; nothing in this branch is deployed until it is merged.

The brand lives in one file: **`src/brand.js`**. Change the name, bundle ID, URL scheme or product IDs there,
then run `npm run brand:apply` (updates `capacitor.config.json`, `Info.plist`, the Xcode project, the `.storekit`
file and `public/privacy.html`). `npm run brand:check` fails CI and Xcode Cloud if they drift.

## Identity

| Field | Value |
|---|---|
| App name | **TurfRoute** (App Store name suggestion: `TurfRoute: Lawn Crew Tracker`, ≤ 30 chars) |
| Subtitle | `Lawn crew routes, time & pay` |
| Bundle ID | `com.colecollins.turfroute` |
| URL scheme | `turfroute://` (`turfroute://route`, `turfroute://crew`, `turfroute://settings`, `turfroute://pro`) |
| SKU | `turfroute-ios-001` |
| Version / build | 1.0 / 1 (`MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` in Xcode) |
| Category | Business · secondary: Productivity |
| Devices | iPhone only, portrait, iOS 15+ (`TARGETED_DEVICE_FAMILY = 1`) |
| Age rating | 4+ |
| Price | Free, with optional **TurfRoute Pro** auto-renewable subscription |
| Encryption | `ITSAppUsesNonExemptEncryption = NO` (standard HTTPS only) |

## Why this passes App Review

| Guideline | How TurfRoute meets it |
|---|---|
| **4.2 Minimum functionality** | No `server.url`: the whole web app ships in the binary (`webDir: dist`). Native features: GPS geofence auto-start/stop + mileage (Core Location via `@capacitor/geolocation`), native share sheet for JSON backups, mileage CSV, routes, crew invites, outreach messages and customer invoice/portal links (`@capacitor/share` + `@capacitor/filesystem`), haptics on taps and geofence events (`@capacitor/haptics`), status bar theming, splash screen, app-switcher privacy cover (`AppDelegate.swift`), `turfroute://` deep links, StoreKit 2 subscriptions. |
| **5.1.1(v) Account deletion** | Settings → Account → **Delete Account**. Confirmation sheet (type `DELETE`), deletes the Firestore document `users/{uid}/data/app`, deletes the Firebase Auth user, wipes the local copy. If the sign-in is older than ~5 min (Firebase `requires-recent-login`) it asks for the password *before* deleting anything and re-authenticates. Warns that an Apple subscription is not cancelled by deleting the account and links to Manage Subscriptions. Code: `src/accountDeletion.js` (unit-tested), `src/AuthProvider.jsx`, `src/views/DeleteAccountSheet.jsx`. |
| **4.8 Sign in with Apple** | **Not required today**: the only sign-in method is Firebase email/password (no Google, Facebook or other third-party/social login). If you ever add Google sign-in, add Sign in with Apple at the same time — steps below. |
| **3.1.1 In-App Purchase** | The only digital upgrade, **TurfRoute Pro**, is sold with StoreKit 2 (`ios/App/App/TurfRouteNativePlugin.swift`, no RevenueCat / no third-party SDK): product loading, purchase, **Restore Purchases**, `Transaction.updates` listener, `Transaction.currentEntitlements`, Manage Subscriptions sheet. Pro gating is active **only in the native iOS app** (`src/proPolicy.js`); the web app is never gated and shows no paywall. There is no Stripe checkout, web upgrade link or external purchase call-to-action for Pro anywhere in the app. |
| **3.1.2 Subscriptions** | Paywall (`src/views/ProSheet.jsx`) shows price + period from StoreKit, auto-renew terms, Restore Purchases, Terms of Use (Apple standard EULA) and Privacy Policy links. Pro adds ongoing value (multi-crew features); all single-operator features stay free. |
| **3.1.3(e) / 3.1.5 Physical services** | Stripe stays for **homeowners paying for real-world lawn-care services** through the customer portal and emailed invoices (web). That is a physical service, so Apple IAP does not apply. Stripe code and the web checkout are untouched. |
| **5.1.1 / 5.1.2 Privacy** | Location "When In Use" only, with a specific purpose string. `PrivacyInfo.xcprivacy` declares email, precise location and user content (linked, app functionality, no tracking) plus required-reason APIs. Public policy at `/privacy.html`. Optional third-party services (Regrid parcel lookup, Anthropic AI yard estimate, user webhook) only run when the user configures their own key and taps the feature; disclosed in the policy. |
| **2.1 App completeness** | Login is required when Firebase is configured → **provide a demo account** in App Review Information (see below). |
| **4.3 Spam / 2.3 metadata** | Generic brand (no personal business name), original niche. Screenshots must come from the iPhone build; don't mention "web app" or Android. |

### TurfRoute Pro (StoreKit 2)

| | |
|---|---|
| Subscription group | `TurfRoute Pro` |
| Products | `com.colecollins.turfroute.pro.monthly` (suggested $9.99/mo) · `com.colecollins.turfroute.pro.yearly` (suggested $79.99/yr, rank 1) |
| Free on iOS | Everything for one operator: jobs, timers, GPS geofencing, route planner, Growth Zones, Prospector, expenses, mileage, backups, customer invoices/portal, **joining** a crew via invite code |
| Pro on iOS | More than 1 crew profile on a device, **sharing** crew invite codes, the whole-crew leaderboard |
| Local testing | `ios/App/App/TurfRoute.storekit` is wired into the shared `App` scheme (Run → Options → StoreKit Configuration). If Xcode shows "None", pick `TurfRoute.storekit` once. |
| Turn off gating | `BRAND.pro.iosGatingEnabled = false` in `src/brand.js` (then remove the IAPs from the submission) |

## App Privacy ("nutrition label") answers

App Store Connect → App Privacy → **Yes, we collect data**:

| Data type | Linked to user | Tracking | Purpose |
|---|---|---|---|
| Contact Info → **Email Address** | Yes | No | App Functionality (account) |
| Contact Info → **Name, Phone Number, Physical Address** (customers' details the user enters) | Yes | No | App Functionality |
| Location → **Precise Location** | Yes | No | App Functionality (geofence timers, mileage) |
| User Content → **Other User Content** (jobs, notes, expenses, crew) | Yes | No | App Functionality |
| Purchases → **Purchase History** | No — Apple processes StoreKit; the app only reads entitlement status on device. Answer "not collected" unless you add server-side receipt storage. |

No third-party advertising, no analytics SDK, no data broker sharing. Privacy Policy URL:
`https://collins-lawncare-tracker.vercel.app/privacy.html` (live after this PR merges; update `BRAND.privacyPolicyUrl`
if you move domains). Fill in `BRAND.supportEmail` / a Support URL before submitting.

## Metadata draft

**Promotional text:** Clock in, drive your route, and let GPS start and stop job timers for you. Know your real $/hr per yard — with drive time included.

**Description:**
> TurfRoute is the field app for solo operators and small lawn-care crews.
>
> • **GPS automation** — arrive at a pinned yard and the timer starts; drive away and the visit is saved automatically.
> • **Route planner** — optimized stop order, drive estimates, rolling ETAs and one-tap navigation.
> • **Pay that's honest** — per-visit and monthly contracts, true $/hr with drive time, 7-day earnings and profit.
> • **Growth Zones** — see which neighborhoods are worth the trip and where one more yard pays off.
> • **Mileage & expenses** — every mile you drive on the clock becomes an IRS-ready mileage log.
> • **Customer invoices** — send a secure link where homeowners can see the job and pay their lawn-care invoice by card.
> • **Weather** — rain-window warnings on your dashboard.
> • **Backups** — export to Files, AirDrop or Mail with the share sheet.
>
> **TurfRoute Pro** (optional subscription): run a whole crew from one phone — unlimited crew profiles, crew invite codes and a crew-wide hours/miles/earnings leaderboard. Payment is charged to your Apple ID; subscriptions renew automatically unless cancelled at least 24 hours before the period ends. Terms: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

**Keywords (100):** `lawn care,mowing,landscaping,crew,route planner,gps timer,mileage log,invoice,yard,lawn business`

**Screenshots:** 6.9" iPhone (1320×2868) set from the Simulator (iPhone 16 Pro Max): Today dashboard, Route planner, Job detail with timer, Growth Zones, Crew, Settings → TurfRoute Pro. Add an IAP review screenshot of the Pro sheet.

## App Review notes (paste into App Store Connect)

> Sign in with the demo account below (Settings → Account shows it). Create a crew profile, add a job and tap Start to see the job timer; GPS geofencing starts/stops timers automatically while the app is open (location "When In Use" only).
>
> **Account deletion:** Settings → Account → Delete Account (type DELETE to confirm).
>
> **In-app purchase:** TurfRoute Pro (auto-renewable, group "TurfRoute Pro"). Crew tab → "Add to Crew" a second member, or Settings → TurfRoute Pro → See Plans. Restore Purchases is on the same screen.
>
> **Stripe:** used only by homeowners to pay invoices for real-world lawn-care services (Guideline 3.1.5) through an emailed web link; it is never used to unlock app features.
>
> Demo account: `appreview@<your-domain>` / `<password>` (create it in Firebase Authentication first).

## Manual steps — App Store Connect / Apple Developer

1. Certificates, IDs & Profiles → Identifiers → **+** App ID `com.colecollins.turfroute` (In-App Purchase is on by default).
2. App Store Connect → My Apps → **+ New App** → iOS, name, bundle ID, SKU above.
3. Monetization → Subscriptions → create group **TurfRoute Pro** → add `com.colecollins.turfroute.pro.yearly` and `…pro.monthly` (prices, display name, description, review screenshot). Add group localization.
4. Agreements, Tax and Banking → accept the **Paid Apps** agreement, add bank + tax (required for IAP).
5. Apply for the **App Store Small Business Program** (15% instead of 30%).
6. **Xcode Cloud** (25 free compute hours/month): App Store Connect → the app → Xcode Cloud → connect `DealPatrol/collins-lawncare-tracker` → workflow on `main`, scheme **App**, action **Archive – iOS**, post-action **TestFlight (Internal)**. `ios/App/ci_scripts/ci_post_clone.sh` installs Node, writes `.env` from `config/firebase/web.config.json`, runs `brand:check`, builds and `cap sync ios`.
   - On a Mac instead: `npm ci && npm run firebase:env && npm run build:ios && npm run ios:open` → Signing & Capabilities → Team → Product → Archive.
7. TestFlight on a real iPhone: sign up/in, location prompt, geofence arrival/auto-stop, Share sheet exports, Pro purchase (Sandbox), Restore, Manage Subscription, Delete Account (fresh login and >5 min old login), app-switcher cover, `turfroute://route` from Safari.
8. Create the **demo account** and enter it in App Review Information. Submit.

## Manual steps — Firebase, Vercel and domain (nothing renamed automatically)

Kept on purpose so existing users and data keep working:

- Firebase project **`lawncare-72560`**, all `VITE_FIREBASE_*` env names, Firestore path `users/{uid}/data/app`, and localStorage keys (`collins_lawncare_v2`, …) are **unchanged**.
- `npm run test:rules` still uses the emulator project id `demo-collins-lawncare` (local only, never shown to users).
- The npm package name and Vercel project stay `collins-lawncare-tracker`; `BRAND.webOrigin` is `https://collins-lawncare-tracker.vercel.app`.

To finish the rebrand when you're ready:

1. **Firebase Console → Project settings → Public-facing name** → `TurfRoute` (shown in password-reset/verification emails). Optionally edit Authentication → Templates sender name.
2. **Vercel:** set `BUSINESS_NAME` (e.g. `Collins Lawncare` to keep your own company name on customer emails; otherwise emails say "TurfRoute") and confirm `SENDGRID_FROM_EMAIL` is a verified sender. Fallback sender is still `noreply@collinslawncare.com` (`lib/business.js`).
3. **Domain (optional):** add e.g. `turfroute.app` to the Vercel project, add it to Firebase Authentication → Authorized domains, then update `webOrigin` / `privacyPolicyUrl` in `src/brand.js` and run `npm run brand:apply`.
4. **Firebase iOS app (only if you add native Firebase SDKs later):** register iOS app `com.colecollins.turfroute` and download `GoogleService-Info.plist` (see `docs/IOS_FIREBASE.md`). Not needed today — the app uses the Firebase web SDK inside the WebView (`initializeAuth` + IndexedDB persistence on native, see `src/firebase.js`).
5. **Merge before shipping iOS:** the bundled app calls the production `/api` routes cross-origin from `capacitor://localhost`. The CORS allow-list (`lib/cors.js`) and `/privacy.html` only go live once this PR is merged and Vercel deploys `main`.

## Sign in with Apple (only if you add Google or another social login)

1. Apple Developer → Identifiers → App ID `com.colecollins.turfroute` → enable **Sign in with Apple**. Regenerate profiles; in Xcode add the *Sign in with Apple* capability (creates `App.entitlements`).
2. Identifiers → **+ Services ID** `com.colecollins.turfroute.signin` → enable Sign in with Apple → Configure: primary App ID `com.colecollins.turfroute`, domain `lawncare-72560.firebaseapp.com`, return URL `https://lawncare-72560.firebaseapp.com/__/auth/handler`.
3. Keys → **+** → enable Sign in with Apple → download the `.p8`, note **Key ID** and your **Team ID**.
4. Firebase Console → Authentication → Sign-in method → **Apple** → enable; enter Services ID, Apple Team ID, Key ID and the private key.
5. App code: on native iOS use a free native plugin (e.g. `@capacitor-community/apple-sign-in`) to get the identity token with a hashed nonce, then `signInWithCredential(auth, new OAuthProvider('apple.com').credential({ idToken, rawNonce }))`. On the web use `signInWithPopup(auth, new OAuthProvider('apple.com'))`. Show the Apple button at least as prominently as Google. Account deletion for Apple users must also revoke the Apple token (`revokeAccessToken` in Firebase Auth).

## Developer notes & known limitations

- Web: `npm run dev`, `npm run lint`, `npm test` (unit + Firestore emulator rules; needs Java), `npm run build` — behaviour unchanged on the web except the rebrand, Business name settings, and Delete Account.
- iOS: `npm run build:ios`, `npm run ios:open`, `npm run ios:verify` (static plist/XML/StoreKit/icon/pbxproj checks; Linux-friendly). Icon/splash sources: `resources/icon.png` (1024², opaque), `resources/splash.png` (2732²).
- Native code: `TurfRouteNativePlugin.swift` (StoreKit 2), `TurfRouteViewController.swift` (registers it; set as the storyboard root), `AppDelegate.swift` (privacy cover). JS: `src/native.js`, `src/ProProvider.jsx`, `src/proPolicy.js`, `src/deepLinks.js`.
- **Swift has not been compiled in this branch** (built on Linux). The first Xcode Cloud / Mac build is the compile check; the plugin uses only public StoreKit 2 and Capacitor 8 APIs (`CAPBridgedPlugin`, `registerPluginInstance`, `CAPPluginCall.getArray`).
- Account deletion removes the cloud document from the device that deletes. Another phone signed in to the *same* account could re-upload its local copy for up to ~1 hour (until its Firebase ID token expires). Recommended follow-up: a server-side delete endpoint + a Firestore "deleted" tombstone rule.
- GPS runs while the app is open (no background location entitlement), matching the "When In Use" permission.
