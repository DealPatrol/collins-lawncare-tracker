# Firestore Security Rules Audit

Audited against the `firebase-security-rules-auditor` checklist for `firestore.rules`.

## Score: 4 / 5 (Minor issues only)

**Summary:** Rules enforce strict per-user ownership (`request.auth.uid == userId`), default-deny for all other paths, identical validation on create and update, field allowlisting via `hasOnly()`, and resource limits on array size and string length. Suitable for a single-user-per-document lawncare tracker.

## Findings

| Check | Severity | Issue | Recommendation |
|-------|----------|-------|----------------|
| Update bypass | — | Create and update share `isValidAppData()` | ✅ No bypass found |
| Authority source | — | No user-writable role/admin fields | ✅ Secure |
| Business logic | — | Owner can read/write their `users/{uid}/data/app` doc | ✅ Matches app |
| Storage abuse | Minor | Individual `jobs[]` items are not schema-validated | Acceptable for v1; add field-level validation if storing PII in job notes |
| Type safety | — | Lists, maps, strings, timestamps, numbers checked | ✅ |
| Identity-level security | — | `isOwner(userId)` on every operation | ✅ |
| Document scope | — | `docId == 'app'` prevents stray documents | ✅ |

## Deploy

Production mode requires deployed rules before any client access works:

```bash
npx -y firebase-tools@latest login
npm run firebase:deploy:rules
```

I've set up prototype Security Rules to keep each user's lawncare data private. They are designed to be secure for a single-owner document model with authenticated email/password users. Review and verify them before broadly sharing the app.
