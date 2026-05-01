/**
 * Firebase Admin SDK initialisation (server-side only).
 *
 * Initialised lazily on first call so that missing env vars during build
 * do not crash the Next.js page-data collection step.
 *
 * Required env vars (server-side, never exposed to the browser):
 *   FIREBASE_ADMIN_PROJECT_ID    — Firebase project ID
 *   FIREBASE_ADMIN_CLIENT_EMAIL  — Service account email
 *   FIREBASE_ADMIN_PRIVATE_KEY   — PEM private key (Vercel escapes \n as \\n)
 */

import admin from 'firebase-admin';
import { Env } from '@/libs/Env';

/**
 * Returns the Firebase Admin Auth instance, initialising the app on first call.
 * Throws if the required env vars are not set.
 * @returns The admin.auth() instance used to call verifyIdToken().
 */
export function getAdminAuth(): admin.auth.Auth {
  // Only initialise once — guard with apps.length check
  if (!admin.apps.length) {
    if (!Env.FIREBASE_ADMIN_PROJECT_ID || !Env.FIREBASE_ADMIN_CLIENT_EMAIL || !Env.FIREBASE_ADMIN_PRIVATE_KEY) {
      throw new Error('Firebase Admin env vars are not configured (FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY)');
    }

    // Vercel (and many CI systems) store multi-line strings with literal \n instead
    // of real newlines. Replace them so the PEM key is parsed correctly by Node.
    const privateKey = Env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n');

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: Env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: Env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey,
      }),
    });
  }

  return admin.auth();
}
