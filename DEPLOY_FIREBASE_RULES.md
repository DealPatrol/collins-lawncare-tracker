# How to Deploy Firebase Security Rules

Your Firebase security rules are ready in `firebase.rules.json`. Follow these steps to deploy them:

## Option 1: Firebase Console (Easiest - No CLI Needed)

1. Go to https://console.firebase.google.com
2. Select your project: **lawncare-72560**
3. Click **Realtime Database** in the left menu
4. Click the **Rules** tab
5. Copy the contents of `firebase.rules.json` from your project
6. Paste into the Firebase Console rules editor
7. Click **Publish**

That's it! Your rules are now live.

## Option 2: Firebase CLI (From Your Computer)

If you prefer command-line:

```bash
# 1. Install Firebase CLI (one-time)
npm install -g firebase-tools

# 2. Navigate to project directory
cd /path/to/collins-lawncare-tracker

# 3. Login to Firebase
firebase login

# 4. Deploy rules
firebase deploy --only database:rules
```

## What These Rules Do

Your security rules protect your data by:
- Users can only read/write their own data
- Client portal can access jobs via public tokens
- Prevents unauthorized access
- Validates data structure on all writes
- Tracks sync timestamps for debugging

## Verification

After deploying, test in Firebase Console:
1. Go to Database → Rules
2. You should see your rules displayed
3. Test read/write access in the Simulator tool

Need help? See `FIREBASE_RULES_DEPLOYMENT.md` for detailed troubleshooting.
