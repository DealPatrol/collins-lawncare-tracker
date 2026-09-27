# Environment setup

Copy `.env.example` to `.env.local` for local development. Keep real values out
of git. In hosted environments, mark every server-only value as sensitive and
use separate test and production credentials.

## Browser variables

| Variable | Purpose |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase web app identifier |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Authentication domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase web app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Optional Analytics measurement ID |
| `VITE_API_BASE_URL` | API origin for Capacitor or split deployments; empty for same-origin |
| `VITE_STRIPE_PUBLIC_KEY` | Stripe publishable key (`pk_test_…` or `pk_live_…`) |

`VITE_*` values are bundled into the client. Never put a secret key in one.

## Server-only variables

| Variable | Required for | Value |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | PaymentIntent creation and refund metadata lookup | Prefer a restricted key with PaymentIntent create/read permission |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification | Endpoint-specific `whsec_…` value |
| `SENDGRID_API_KEY` | Invoice, completion, and payment emails | SendGrid key with Mail Send permission only |
| `SENDGRID_FROM_EMAIL` | Email sender | A SendGrid-authenticated sender address |
| `FIREBASE_SERVICE_ACCOUNT` | Firestore access from server APIs | Complete service-account JSON serialized on one line |
| `PORTAL_TOKEN_SECRET` | HMAC signing for customer portal links | At least 32 random bytes; changing it revokes existing links |
| `APP_URL` | Absolute customer portal links | Public app origin, for example `https://app.example.com` |

`GOOGLE_APPLICATION_CREDENTIALS` may replace `FIREBASE_SERVICE_ACCOUNT` on a
trusted server with a mounted credentials file, but it is not suitable for
Vercel.

Generate the portal secret without printing or committing a real value:

```bash
openssl rand -base64 48
```

Portal links are HMAC-SHA-256 signed, expire seven days after issuance, and are
rejected if the signature, payload, issue time, or expiry is invalid.

## Local verification

The build and unit tests do not require real credentials. Firestore rule tests
start the local emulator and use the demo project ID only.

```bash
npm ci
npm run lint
npm test
npm run build
```
