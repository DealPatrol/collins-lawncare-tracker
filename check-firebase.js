#!/usr/bin/env node

/**
 * Quick Firebase configuration checker
 * Run: node check-firebase.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n🔍 Firebase Configuration Checker\n');

// Check for .env.local
const envLocalPath = path.join(__dirname, '.env.local');
const envExamplePath = path.join(__dirname, '.env.firebase.example');

if (!fs.existsSync(envLocalPath)) {
  console.log('❌ .env.local not found');
  console.log('\n📋 To set up Firebase:');
  console.log('  1. Read FIREBASE_QUICK_START.md');
  console.log('  2. Create .env.local file');
  console.log('  3. Copy values from .env.firebase.example');
  console.log('  4. Add your Firebase credentials\n');
  process.exit(1);
}

// Read and validate .env.local
const envContent = fs.readFileSync(envLocalPath, 'utf-8');
const requiredVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

let allGood = true;
requiredVars.forEach(varName => {
  if (envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=YOUR_`)) {
    console.log(`✅ ${varName} configured`);
  } else {
    console.log(`❌ ${varName} not set or using placeholder`);
    allGood = false;
  }
});

if (!allGood) {
  console.log('\n⚠️  Some Firebase values are missing or using placeholders');
  console.log('   Follow FIREBASE_QUICK_START.md to add your credentials\n');
  process.exit(1);
}

console.log('\n✨ Firebase is configured and ready!\n');
console.log('Next steps:');
console.log('  npm run dev          - Start development server');
console.log('  Check browser console - Should see "[v0] Anonymous user signed in"\n');
