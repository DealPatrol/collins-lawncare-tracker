# iOS Firebase Setup (stubbed)

Native iOS Firebase is **not wired yet**. The web app uses Firebase Auth + Firestore via the Capacitor WebView, which works for development and testing.

When you are ready to add native Firebase (Crashlytics, push, etc.):

## 1. Download `GoogleService-Info.plist`

**Firebase Console** → Project `lawncare-72560` → Project Settings → Your apps → iOS (`com.collins.lawncare`) → Download `GoogleService-Info.plist`

Or:

```bash
npx -y firebase-tools@latest login
npm run firebase:keys lawncare-72560
```

## 2. Place the file

```
ios/App/App/GoogleService-Info.plist
```

A placeholder template lives at `ios/App/App/GoogleService-Info.plist.example` — do **not** ship that file; replace it with the real download.

> `GoogleService-Info.plist` is gitignored. Each developer / CI machine needs their own copy.

## 3. Add Firebase iOS SDK (when needed)

Use the `xcode-project-setup` skill to add the Firebase iOS SDK via Swift Package Manager, then uncomment `FirebaseApp.configure()` in `AppDelegate.swift`.

Until then, the Capacitor app continues to use the web Firebase SDK initialized from `.env`.
