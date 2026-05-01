// GET /api/integrations/[provider]/connect
// Initiates the OAuth 2.0 flow — redirects the user to the provider's auth page.
// A random state token is stored in a short-lived httpOnly cookie for CSRF protection.

import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { buildAuthUrl } from '@/utils/IntegrationOAuth';
import { requireAuth } from '@/utils/ApiAuth';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  // Require authentication — only logged-in users can connect integrations
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { provider } = await params;

  // Generate a random CSRF state token for this OAuth flow
  const state = randomUUID();

  // Store "state:userId" in a short-lived (5 min) httpOnly cookie.
  // We embed userId here because the OAuth callback is a cross-site redirect from the
  // provider — browsers block SameSite=Strict cookies on such requests, so requireAuth()
  // would fail in the callback. By storing userId in the state cookie (SameSite=Lax),
  // the callback can identify the user without needing the access_token cookie.
  const cookieStore = await cookies();
  cookieStore.set(`oauth_state_${provider}`, `${state}:${auth.userId}`, {
    httpOnly: true,
    maxAge: 300, // 5 minutes — plenty of time for the user to authorise
    path: '/',
    sameSite: 'lax', // lax so the cookie is sent on the cross-site GET redirect back from the provider
  });

  // Build the redirect URL using the provider's OAuth config
  const url = buildAuthUrl(provider, state);
  if (!url) {
    // Credentials not configured in Env.ts — redirect back with error
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    return NextResponse.redirect(`${appUrl}/integrations?error=not_configured`);
  }

  return NextResponse.redirect(url);
}
