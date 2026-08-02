# Firebase Cloud Sync - Quick Start

Your app is already configured to sync to Firebase. Just add your credentials and you're done.

## Step 1: Create Firebase Project (5 minutes)

1. Go to https://console.firebase.google.com
2. Click **"Create a project"**
3. Name it **collins-lawncare-tracker**
4. Click **"Create project"** and wait ~1 minute

## Step 2: Enable Realtime Database

1. In Firebase console, click **"Realtime Database"** (left menu)
2. Click **"Create Database"**
3. Select **"Start in test mode"** 
4. Choose your region (USA recommended)
5. Click **"Enable"**

## Step 3: Enable Anonymous Authentication

1. Click **"Authentication"** (left menu)
2. Click **"Get started"**
3. Find **"Anonymous"** and click it
4. Toggle **"Enable"** 
5. Click **"Save"**

## Step 4: Get Your Firebase Config

1. Click the **Settings gear icon** (top left)
2. Click **"Project settings"**
3. Scroll to **"Your apps"** section
4. Click **"Add app"** → choose **"Web"**
5. Name it **collins-lawncare-app**
6. Copy the config object that appears - looks like:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_KEY_HERE",
  authDomain: "your-project.firebaseapp.com",
  projectId: "collins-lawncare-tracker",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## Step 5: Add Config to Your Project

1. In your project folder, create `.env.local` file
2. Copy contents from `.env.firebase.example`
3. Paste your Firebase values:
```
VITE_FIREBASE_API_KEY=YOUR_API_KEY_HERE
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=collins-lawncare-tracker
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

## Step 6: Restart Your App

1. Stop your dev server (Ctrl+C)
2. Run `npm run dev` again
3. Check browser console - should see: `[v0] Anonymous user signed in: ...`

That's it! Your data now syncs to Firebase automatically.

## What's Happening

- Every time you save a job, crew member, or workday, it uploads to Firebase
- Your device keeps a local copy for fast access
- If you uninstall and reinstall, your data loads from the cloud
- Works offline - syncs when internet returns

## Troubleshooting

**"Firebase not configured" warning?**
- Make sure `.env.local` exists with your credentials
- Restart dev server after adding credentials

**Data not syncing?**
- Check browser console (F12) for errors
- Make sure Realtime Database is enabled in Firebase
- Make sure Anonymous Auth is enabled

**Need to reset?**
- Delete your Firebase project and create a new one
- Or go to Realtime Database in Firebase and clear all data

Questions? Check the browser console logs for [v0] messages.
