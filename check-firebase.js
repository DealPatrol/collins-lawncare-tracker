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

// Check for .env (Vite) or .env.local
const envPath = [path.join(__dirname, '.env'), path.join(__dirname, '.env.local')]
  .find((p) => fs.existsSync(p));

if (!envPath) {
  console.log('❌ .env not found');
  console.log('\n📋 To set up Firebase:');
  console.log('  1. Run: npm run firebase:env');
  console.log('  2. Or copy .env.example to .env and fill in credentials\n');
  process.exit(1);
}

// Read and validate env file
const envContent = fs.readFileSync(envPath, 'utf-8');
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
  console.log('   Run npm run firebase:env or see docs/KEYS.md\n');
  process.exit(1);
}

console.log('\n✨ Firebase is configured and ready!\n');
console.log('Next steps:');
console.log('  npm run dev          - Start development server');
console.log('  npm run firebase:deploy:rules - Deploy Firestore security rules\n');
