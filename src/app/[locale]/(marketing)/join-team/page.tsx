'use client';

// ── /join-team page ───────────────────────────────────────────────────────────
// Accepts a team invite via the one-time token from the invite email.
//
// URL shape: /join-team?token=<uuid>
//
// Flow:
//   1. On mount, read the ?token= query param.
//   2. Call POST /api/team/accept-invite with the token.
//      • 401 → not logged in → redirect to /sign-in?redirect=/join-team?token=...
//      • 200 → success → redirect to /team
//      • other error → show error message
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_ROUTES } from '@/constants/apiRoutes';
import { CLIENT_ROUTES } from '@/constants/clientRoutes';

// ── State machine for the acceptance flow ─────────────────────────────────────
type AcceptState = 'loading' | 'success' | 'error' | 'no-token';

export default function JoinTeamPage() {
  // Read ?token= from the URL (useSearchParams works inside client components)
  const searchParams = useSearchParams();
  const router = useRouter();

  const [state, setState] = useState<AcceptState>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    // ── Read the token from the URL ─────────────────────────────────────────
    const token = searchParams.get('token');

    // No token in the URL — show a clear error, not a blank page
    if (!token) {
      setState('no-token');
      return;
    }

    // ── Call accept-invite API ──────────────────────────────────────────────
    async function accept() {
      try {
        const res = await fetch(API_ROUTES.team.acceptInvite, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        // Not authenticated → redirect to sign-up so the user creates an account.
        // Pass the invite token so SignUpForm includes it in the signup body
        // and the team member row gets linked during account creation.
        if (res.status === 401) {
          router.replace(`${CLIENT_ROUTES.signUp}?inviteToken=${token}`);
          return;
        }

        if (res.ok) {
          // Invite accepted — send them to the team page
          setState('success');
          // Short delay so the success message is visible before redirect
          setTimeout(() => router.replace(CLIENT_ROUTES.team), 1500);
          return;
        }

        // API returned a non-ok status — display the error message
        const data = await res.json() as { error?: string };
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.');
        setState('error');
      } catch {
        setErrorMsg('Network error. Please check your connection and try again.');
        setState('error');
      }
    }

    void accept();
  }, [searchParams, router]);

  // ── Render states ───────────────────────────────────────────────────────────

  return (
    // Full-page centred card — minimal, no NavRail/TopBar (public page)
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg)',
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: '100%',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '40px 36px',
          textAlign: 'center',
        }}
      >
        {/* ── Loading state ── */}
        {state === 'loading' && (
          <>
            {/* Spinning indicator */}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: '3px solid var(--color-border)',
                borderTopColor: 'var(--color-brand)',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 20px',
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', margin: 0 }}>
              Accepting your invitation…
            </p>
          </>
        )}

        {/* ── Success state ── */}
        {state === 'success' && (
          <>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: 'var(--color-text-primary)',
                margin: '0 0 10px',
              }}
            >
              You're in!
            </h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: '0 0 6px' }}>
              Your invitation has been accepted. Redirecting you to the team page…
            </p>
          </>
        )}

        {/* ── Error state ── */}
        {state === 'error' && (
          <>
            <div style={{ fontSize: 52, marginBottom: 16 }}>😕</div>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                margin: '0 0 10px',
              }}
            >
              Couldn't accept invite
            </h2>
            {/* Show the error message from the API */}
            <p
              style={{
                fontSize: 14,
                color: '#f87171',
                margin: '0 0 24px',
                lineHeight: 1.5,
              }}
            >
              {errorMsg}
            </p>
            {/* Let the user go sign in if they weren't already */}
            <a
              href={CLIENT_ROUTES.signIn}
              style={{
                display: 'inline-block',
                padding: '10px 24px',
                backgroundColor: 'var(--color-brand)',
                color: '#fff',
                borderRadius: 'var(--radius-md)',
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Go to sign in
            </a>
          </>
        )}

        {/* ── No token state ── */}
        {state === 'no-token' && (
          <>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🔗</div>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                margin: '0 0 10px',
              }}
            >
              Invalid invite link
            </h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: '0 0 24px' }}>
              This link is missing a token. Please use the link from your invitation email.
            </p>
            <a
              href={CLIENT_ROUTES.signIn}
              style={{
                display: 'inline-block',
                padding: '10px 24px',
                backgroundColor: 'var(--color-brand)',
                color: '#fff',
                borderRadius: 'var(--radius-md)',
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Go to sign in
            </a>
          </>
        )}
      </div>
    </div>
  );
}
