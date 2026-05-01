import { NextResponse } from 'next/server';
import { Env } from '@/libs/Env';

/**
 * GET /api/auth/google
 *
 * Builds the Google OAuth2 authorization URL and redirects the browser to it.
 * Google will show its consent screen and then redirect back to /api/auth/google/callback
 * with a `code` query param.
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID — from Google Cloud Console > APIs & Services > Credentials
 *   NEXT_PUBLIC_APP_URL — base URL of this app (e.g. https://app.example.com)
 */
export async function GET() {
  // Guard: if Google OAuth is not configured, return a clear error instead of a broken redirect.
  if (!Env.GOOGLE_CLIENT_ID) {
    return NextResponse.json(
      { message: 'Google OAuth is not configured on this server.' },
      { status: 501 },
    );
  }

  // The callback URL that Google will redirect back to after the user consents.
  // Must be registered in Google Cloud Console under "Authorized redirect URIs".
  const redirectUri = `${Env.NEXT_PUBLIC_APP_URL ?? ''}/api/auth/google/callback`;

  // Build the Google authorization endpoint URL with all required params.
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', Env.GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  // `code` response type means we get a short-lived auth code that we exchange server-side.
  url.searchParams.set('response_type', 'code');
  // openid + email + profile: enough to identify the user and get their email.
  url.searchParams.set('scope', 'openid email profile');
  // prompt=select_account lets the user pick which Google account to use even if already logged in.
  url.searchParams.set('prompt', 'select_account');

  // Redirect the browser to Google's consent page.
  return NextResponse.redirect(url.toString());
}
