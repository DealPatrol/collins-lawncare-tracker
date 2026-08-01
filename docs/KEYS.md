# App Keys & Credentials Guide

Firebase project: **`lawncare-72560`**

| App | Bundle / platform |
|-----|-------------------|
| Web | Registered in Firebase Console |
| iOS | `com.collins.lawncare` |

Firestore database: **production mode**, location **nam5**  
Auth: **Email/Password** enabled

## Keys your app needs

| Key / file | Used for | Required today? |
|------------|----------|---------------|
| `VITE_FIREBASE_*` env vars | Web app Firebase SDK | Only if adding Firebase |
| `GoogleService-Info.plist` | Native iOS Firebase SDK | Only if adding Firebase to iOS |
| Apple Developer account | App Store signing | For App Store only |
| Google Maps API key | Embedded maps | **Not required** — app uses free Google Maps links |

---

## Option A — Automatic (recommended)

On your Mac, in the project folder:

```bash
# 1. Log in to Firebase (opens browser)
npx -y firebase-tools@latest login

# 2. Fetch all keys and write .env + GoogleService-Info.plist
npm run firebase:keys
```

This creates:
- `.env` — web SDK keys (`VITE_FIREBASE_*`)
- `ios/App/App/GoogleService-Info.plist` — iOS config

Default Firebase project ID: `lawncare-72560`. Use a custom ID:

```bash
./scripts/fetch-firebase-keys.sh my-custom-project-id
```

### Deploy Firestore security rules (required)

Production mode blocks all access until rules are deployed:

```bash
npx -y firebase-tools@latest login
npm run firebase:deploy:rules
```

---

## Option B — Firebase Console (manual)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. **Create a project** (or open an existing one)
3. **Add a Web app** → copy the `firebaseConfig` object values into `.env`:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXX
```

4. **Add an iOS app** with bundle ID `com.collins.lawncare`
5. Download `GoogleService-Info.plist` → place at `ios/App/App/GoogleService-Info.plist`

---

## Option C — Firebase CLI (manual commands)

```bash
npx -y firebase-tools@latest login
npx -y firebase-tools@latest projects:create collins-lawncare --display-name "Collins Lawncare"
npx -y firebase-tools@latest use collins-lawncare

# Web app
npx -y firebase-tools@latest apps:create WEB "Collins Lawncare Web"
npx -y firebase-tools@latest apps:sdkconfig WEB <WEB_APP_ID>

# iOS app
npx -y firebase-tools@latest apps:create IOS com.collins.lawncare --bundle-id com.collins.lawncare
npx -y firebase-tools@latest apps:sdkconfig IOS <IOS_APP_ID> > ios/App/App/GoogleService-Info.plist
```

---

## Cursor + Firebase MCP

This repo includes `.cursor/mcp.json` with the Firebase MCP server. After restarting Cursor:

1. Authenticate the Firebase MCP server when prompted
2. Ask the agent to list projects or fetch SDK config

---

## Verify keys are loaded

```bash
cp .env.example .env   # if you haven't already
# fill in values, then:
npm run dev
```

In browser devtools console:

```js
import.meta.env.VITE_FIREBASE_PROJECT_ID  // should show your project ID
```

---

## Security notes

- **Never commit** `.env` or `GoogleService-Info.plist` with real keys to a public repo
- Firebase web `apiKey` is not a secret (it's restricted by domain/bundle ID in Firebase Console)
- Enable **Firestore security rules** before going to production — see `firebase-firestore` skill
