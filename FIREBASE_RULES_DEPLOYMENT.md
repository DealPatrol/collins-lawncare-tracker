# Firebase Security Rules Deployment

## Overview

Your app currently runs in "test mode" (anyone can read/write). These security rules restrict access so users only see their own data.

## Security Rules Included

The `firebase.rules.json` file includes rules that:

1. **User Data Protection** - Each user can only access their own state (`employees`, `jobs`, `workdays`, `prospects`, `expenses`)
2. **Payment Tracking** - Only the user who initiated a payment can see/modify it
3. **Invoice Management** - Invoices can only be modified by their owner
4. **Email Logging** - Email records are private to each user
5. **Client Portal** - Public read-only access to specific jobs via token (time-limited)

## Deployment Steps

### Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

### Step 2: Authenticate with Firebase

```bash
firebase login
```

Follow the browser prompt to log in with your Google account.

### Step 3: Initialize Firebase (if not done)

```bash
firebase init
```

Select your project when prompted.

### Step 4: Deploy Rules

```bash
firebase deploy --only database:rules
```

You should see:
```
Database Rules have been successfully published.
```

## Testing Rules

### Before Deploying

Test in Firebase Console:
1. Go to **Realtime Database** → **Rules** tab
2. Paste the rules from `firebase.rules.json`
3. Click **Publish**
4. Test with Simulator

### After Deploying

Test in your app:
1. Sign in with anonymous auth
2. View your jobs (should work)
3. View another user's jobs (should be denied)
4. Try to write to another user's data (should fail)

## Rule Changes Over Time

As you add features, update `firebase.rules.json`:

**Example: Adding subscription data**
```json
"subscriptions": {
  "$uid": {
    ".read": "auth.uid === $uid",
    ".write": "auth.uid === $uid",
    "plan": { ".validate": "newData.isString()" },
    "amount": { ".validate": "newData.isNumber()" }
  }
}
```

Then redeploy:
```bash
firebase deploy --only database:rules
```

## Rollback

If something breaks, you can rollback in Firebase Console:

1. Go to **Realtime Database** → **Rules**
2. Click **Revision history** (top right)
3. Select a previous version
4. Click **Restore this version**

Or via CLI:
```bash
firebase database:get rules --backup
```

## Debugging Permission Denied

If you see "Permission denied" errors:

1. Check you're authenticated (should see `[v0] Anonymous user signed in` in console)
2. Check the rules allow your operation
3. View the exact error in Firebase Console → **Logs**
4. Verify your user ID matches the path

## Common Issues

**"Permission denied"**
- Make sure you're logged in anonymously
- Check your UID matches the path
- Review the rules for your operation

**"Rules published but still seeing old errors"**
- Clear app cache: `localStorage.clear()`
- Restart the app
- Rules can take 30 seconds to propagate

**"Can't write to my own data"**
- Verify the data structure matches `.validate` rules
- Check required fields are present
- Review field types (number vs string)

## Getting Help

- Firebase Rules Docs: https://firebase.google.com/docs/database/security
- Test rules: https://firebase.google.com/docs/database/security/rules-simulator
- Common patterns: https://firebase.google.com/docs/database/security/rules-conditions
