# Firebase config — `lawncare-72560`

## `web.config.json`

Public web app SDK config from Firebase Console → Project Settings → Your apps → Web.

The app reads these values at build time via `.env` (`VITE_FIREBASE_*` variables). To sync this file into `.env`:

```bash
node scripts/sync-firebase-env.js
```

Or copy manually:

| `web.config.json` | `.env` variable |
|-------------------|-----------------|
| `apiKey` | `VITE_FIREBASE_API_KEY` |
| `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` |
| `projectId` | `VITE_FIREBASE_PROJECT_ID` |
| `storageBucket` | `VITE_FIREBASE_STORAGE_BUCKET` |
| `messagingSenderId` | `VITE_FIREBASE_MESSAGING_SENDER_ID` |
| `appId` | `VITE_FIREBASE_APP_ID` |
| `measurementId` | `VITE_FIREBASE_MEASUREMENT_ID` |

## iOS

Native iOS config is not here yet. When downloaded, place:

```
ios/App/App/GoogleService-Info.plist
```

See [docs/IOS_FIREBASE.md](../../docs/IOS_FIREBASE.md).
