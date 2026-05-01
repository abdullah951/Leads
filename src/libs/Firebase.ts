/**
 * Firebase client SDK initialisation.
 *
 * Initialises the Firebase app once (singleton pattern) and exports the Auth
 * instance and GoogleAuthProvider used by the browser-side sign-in flow.
 *
 * Required env vars (all NEXT_PUBLIC_ so the browser can read them):
 *   NEXT_PUBLIC_FIREBASE_API_KEY
 *   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *   NEXT_PUBLIC_FIREBASE_APP_ID
 */

import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { Env } from '@/libs/Env';

// ── Firebase web app config ────────────────────────────────────────────────────
// Values come from Firebase Console → Project Settings → General → Your apps.
const firebaseConfig = {
  apiKey: Env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: Env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: Env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: Env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialise once — `getApps()` returns existing apps so we don't double-init
// during hot-reload or if this module is imported multiple times.
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth instance shared across the app
export const firebaseAuth = getAuth(app);

// Google provider — request email + profile scopes so we get name and avatar
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
