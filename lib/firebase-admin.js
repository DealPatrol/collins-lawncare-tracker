import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isAdminConfigured() {
  return Boolean(parseServiceAccount() || process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

function ensureAdminApp() {
  if (getApps().length) return;

  const serviceAccount = parseServiceAccount();
  if (serviceAccount) {
    initializeApp({ credential: cert(serviceAccount) });
    return;
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    initializeApp();
    return;
  }

  throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured');
}

export function getAdminAuth() {
  ensureAdminApp();
  return getAuth();
}

export function getAdminDb() {
  ensureAdminApp();
  return getFirestore();
}

export async function verifyFirebaseIdToken(header) {
  if (!header?.startsWith('Bearer ')) return null;
  const idToken = header.slice('Bearer '.length).trim();
  if (!idToken) return null;
  try {
    return await getAdminAuth().verifyIdToken(idToken);
  } catch {
    return null;
  }
}
