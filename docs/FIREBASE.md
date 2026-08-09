# Firebase Architecture

Project: **`lawncare-72560`**

## Stack

| Layer | Technology |
|-------|------------|
| Auth | Email/password (Firebase Auth) |
| Data sync | Cloud Firestore — `users/{uid}/data/app` |
| Offline fallback | `localStorage` (`collins_lawncare_v2`) |
| Security rules | `firestore.rules` (deploy with `npm run firebase:deploy:rules`) |
| Client portal | Server-signed tokens via `api/portal-job` (no direct Firestore access) |
| Payments / email | Vercel serverless `api/*` (Stripe, SendGrid) |

This app does **not** use Firebase Realtime Database.

## Config

1. Source of truth: `config/firebase/web.config.json`
2. Generate `.env`: `npm run firebase:env`
3. Verify: `npm run firebase:check`

See [KEYS.md](./KEYS.md) for credential setup.

## Deploy rules

```bash
npx -y firebase-tools@latest login
npm run firebase:deploy:rules
```

Or with a CI token: `FIREBASE_TOKEN=... npm run firebase:deploy:rules`

## Client portal

Customers open `/portal?token=...` with a link signed by the server.

Required server env vars (Vercel):

- `PORTAL_TOKEN_SECRET` — random string for signing portal tokens
- `FIREBASE_SERVICE_ACCOUNT` — JSON service account with Firestore read access

Optional client env:

- `VITE_API_BASE_URL` — API host when the web app and API are on different origins (Capacitor iOS)

## Crew invite vs cloud sync

- **Firestore sync** — ongoing backup for the signed-in account across devices
- **Crew invite codes** — one-time import from another phone; not a substitute for cloud sync
