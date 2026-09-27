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
See [ENVIRONMENT.md](./ENVIRONMENT.md) for every browser and server variable.

## Deploy rules

```bash
npx -y firebase-tools@latest login
npm run firebase:deploy:rules
```

Or with a CI token: `FIREBASE_TOKEN=... npm run firebase:deploy:rules`

## Client portal

Customers open `/portal?token=...` with a link signed by the server.

Required server env vars (Vercel):

- `PORTAL_TOKEN_SECRET` — at least 32 random bytes for signing seven-day portal tokens
- `FIREBASE_SERVICE_ACCOUNT` — JSON service account with Firestore read access
- `APP_URL` — public app origin used to construct portal links

Payments and email additionally require `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `SENDGRID_API_KEY`, and `SENDGRID_FROM_EMAIL`; see the
environment reference for scopes and formats.

Optional client env:

- `VITE_API_BASE_URL` — API host when the web app and API are on different origins (Capacitor iOS)

## Crew invite vs cloud sync

- **Firestore sync** — ongoing backup for the signed-in account across devices
- **Crew invite codes** — one-time import from another phone; not a substitute for cloud sync
