# Firestore Security Rules Audit

Audited against the `firebase-security-rules-auditor` checklist for `firestore.rules`.

## Score: 4 / 5 (Minor issues only)

**Summary:** Rules enforce strict per-user ownership (`request.auth.uid == userId`), default-deny for all other paths, identical validation on create and update, field allowlisting via `hasOnly()`, and top-level list size limits. Suitable for a single-user-per-document lawncare tracker.

## Findings

| Check | Severity | Issue | Recommendation |
|-------|----------|-------|----------------|
| Update bypass | — | Create and update share `isValidAppData()` | ✅ No bypass found |
| Authority source | — | No user-writable role/admin fields | ✅ Secure |
| Business logic | — | Owner can read/write their `users/{uid}/data/app` doc | ✅ Matches app |
| Storage abuse | Minor | Individual list items and nested strings are not schema-validated | Add a normalized per-record collection model if stronger field-level limits become necessary |
| Type safety | — | Top-level lists, maps, active employee ID, version, and timestamp are checked | ✅ |
| Identity-level security | — | `isOwner(userId)` on every operation | ✅ |
| Document scope | — | `docId == 'app'` prevents stray documents | ✅ |

## Deploy

Production mode requires deployed rules before any client access works:

```bash
npx -y firebase-tools@latest login
npm run firebase:deploy:rules
```

Run the emulator-backed regression suite without accessing production:

```bash
npm run test:rules
```
