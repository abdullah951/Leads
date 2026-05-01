'use client';

/**
 * Reusable Google sign-in button that uses Firebase Authentication.
 *
 * Flow:
 *   1. User clicks the button
 *   2. Firebase opens the Google account picker popup (signInWithPopup)
 *   3. On success, we get a Firebase ID token
 *   4. We POST the ID token to /api/auth/firebase-google
 *   5. Server verifies token, creates/finds the user, sets JWT cookies
 *   6. Client redirects to /dashboard
 *
 * @param label - Button text, e.g. "Sign in with Google" or "Sign up with Google".
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { firebaseAuth, googleProvider } from '@/libs/Firebase';
import { API_ROUTES } from '@/constants/apiRoutes';

export function GoogleSignInButton(props: { label: string }) {
  const router = useRouter();

  // Loading and error state for this button only — parent form is unaffected
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      // ── Step 1: Open Google account picker via Firebase popup ───────────────
      const result = await signInWithPopup(firebaseAuth, googleProvider);

      // ── Step 2: Get the Firebase ID token from the signed-in user ───────────
      // forceRefresh=false uses cached token if still valid (< 1 hour old)
      const idToken = await result.user.getIdToken(false);

      // ── Step 3: Exchange Firebase ID token for our own JWT cookies ───────────
      // The server route verifies the token, creates/finds the DB user, and
      // sets access_token + refresh_token httpOnly cookies on the response.
      const res = await fetch(API_ROUTES.auth.firebaseGoogle, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError((json as { message?: string }).message ?? 'Google sign-in failed');
        setLoading(false);
        return;
      }

      // ── Step 4: Redirect to dashboard ────────────────────────────────────────
      // router.refresh() forces the Next.js router to re-read the new cookies so
      // the middleware sees the authenticated state immediately.
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      // popup_closed_by_user = user dismissed the popup — not an error worth showing
      if (firebaseError.code === 'auth/popup-closed-by-user') {
        setLoading(false);
        return;
      }
      // Show the Firebase error code to help with debugging (e.g. auth/unauthorized-domain)
      setError(firebaseError.code ?? firebaseError.message ?? 'Google sign-in failed');
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* ── Google OAuth button — dark themed to match the auth card ────────────
          A plain <button> (not <a href>) because Firebase handles the redirect
          internally — no full-page navigation needed. */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-medium text-[#374151] shadow-sm transition-colors hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {/* Official Google "G" logo SVG (4-color brand mark) */}
        <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          <path fill="none" d="M0 0h48v48H0z" />
        </svg>

        {/* Show spinner while Firebase popup is processing */}
        {loading ? 'Connecting...' : props.label}
      </button>

      {/* Inline error message below the button — only shown on failure */}
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
