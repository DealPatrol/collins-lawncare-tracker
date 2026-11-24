// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for the product brand.
//
// To rename the app, edit the values below and run `npm run brand:apply`.
// That script copies the native identifiers (display name, bundle ID, URL
// scheme, StoreKit product IDs) into capacitor.config.json, Info.plist, the
// Xcode project and the .storekit test file. `npm run brand:check` (run in CI)
// fails if any of those files drift from this module.
//
// Deliberately NOT derived from the brand (renaming them would orphan existing
// data): the Firebase project ID / env var names, the Firestore path
// users/{uid}/data/app, and the localStorage keys in store.js.
// ─────────────────────────────────────────────────────────────────────────────

export const BRAND = Object.freeze({
  /** Product name shown in the UI, home screen and App Store. */
  name: "TurfRoute",
  /** Short tagline used on the sign-in and onboarding screens. */
  tagline: "Crew tracking, routes & pay — built for the field.",
  /** App Store subtitle (30 characters max). */
  subtitle: "Lawn crew routes, time & pay",
  /** Slug used for exported file names, e.g. turfroute-backup-2026-11-23.json. */
  fileSlug: "turfroute",

  // ── Native iOS identity ──
  bundleId: "com.colecollins.turfroute",
  urlScheme: "turfroute",

  // ── Web / API ──
  /** Production web origin. The bundled iOS app calls this origin's /api routes. */
  webOrigin: "https://collins-lawncare-tracker.vercel.app",
  /** Public privacy policy URL (required by App Store Connect). */
  privacyPolicyUrl: "https://collins-lawncare-tracker.vercel.app/privacy.html",
  /** Apple's standard EULA; replace if you publish your own terms. */
  termsUrl: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
  /** Support contact shown in the privacy policy and App Store Connect. Fill in before submitting. */
  supportEmail: "",

  // ── TurfRoute Pro (StoreKit 2, native iOS only) ──
  pro: Object.freeze({
    name: "TurfRoute Pro",
    /** When true, Pro features are gated behind StoreKit on native iOS. Web is never gated. */
    iosGatingEnabled: true,
    subscriptionGroup: "TurfRoute Pro",
    products: Object.freeze({
      monthly: "com.colecollins.turfroute.pro.monthly",
      yearly: "com.colecollins.turfroute.pro.yearly",
    }),
    /** Fallback prices shown only until StoreKit returns localized prices. */
    fallbackPrices: Object.freeze({ monthly: "$9.99", yearly: "$79.99" }),
    /** Free tier on iOS: how many crew profiles a device may hold without Pro. */
    freeCrewProfiles: 1,
    features: Object.freeze([
      "Unlimited crew profiles on one phone",
      "Crew invite codes to share your job list",
      "Hours, miles & earnings leaderboard for the whole crew",
    ]),
  }),

  /** Default name used in customer-facing messages when Settings → Business name is blank. */
  defaultBusinessLabel: "your local lawn care crew",
});

export default BRAND;
