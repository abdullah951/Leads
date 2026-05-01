// GET /api/integrations/[provider]/callback
// OAuth 2.0 callback — exchanges the authorization code for tokens, then
// upserts the integration row in the DB. Redirects back to /integrations when done.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { eq, and } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { userIntegrationSchema } from '@/models/Schema';
import { exchangeCode } from '@/utils/IntegrationOAuth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  // Base redirect destination — error/success params appended below
  const redirectBase = `${appUrl}/integrations`;

  // NOTE: We do NOT call requireAuth() here.
  // The OAuth callback is a cross-site GET redirect from the provider. Browsers block
  // SameSite=Strict cookies on cross-site requests, so the access_token cookie would
  // not be sent and requireAuth() would always return 401.
  // Instead, we read userId from the CSRF state cookie that was stored during /connect
  // (which used SameSite=Lax so it IS sent on the redirect back).

  // Parse callback query parameters from the provider
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // Provider sent an error (e.g. user denied access)
  if (error) {
    return NextResponse.redirect(`${redirectBase}?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${redirectBase}?error=no_code`);
  }

  // ── CSRF verification + userId extraction ──────────────────────────────────
  // The cookie value is "state:userId" (set during /connect).
  // Compare state portion for CSRF protection, and extract userId for DB operations.
  const cookieStore = await cookies();
  const storedValue = cookieStore.get(`oauth_state_${provider}`)?.value ?? '';
  // Consume the cookie immediately regardless of outcome (one-time use)
  cookieStore.delete(`oauth_state_${provider}`);

  // Split on first ":" only — userId itself won't contain ":"
  const colonIndex = storedValue.indexOf(':');
  const storedState = colonIndex >= 0 ? storedValue.slice(0, colonIndex) : storedValue;
  const storedUserId = colonIndex >= 0 ? storedValue.slice(colonIndex + 1) : '';

  // Reject if state is missing, mismatched, or userId is absent (malformed cookie)
  if (!storedState || storedState !== state || !storedUserId) {
    return NextResponse.redirect(`${redirectBase}?error=invalid_state`);
  }

  // Parse userId — stored as string to match requireAuth() shape; DB PKs are integers
  const userId = parseInt(storedUserId, 10);
  if (Number.isNaN(userId)) {
    return NextResponse.redirect(`${redirectBase}?error=invalid_state`);
  }

  // ── Token exchange ─────────────────────────────────────────────────────────
  const tokens = await exchangeCode(provider, code);
  if (!tokens) {
    return NextResponse.redirect(`${redirectBase}?error=token_exchange_failed`);
  }

  // Calculate token expiry timestamp if the provider returned expires_in seconds
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : null;

  // Store provider-specific metadata (instance_url for Salesforce, etc.)
  const metadata = JSON.stringify({
    instance_url: tokens.instance_url ?? null,
  });

  // ── Upsert the integration row ─────────────────────────────────────────────
  // Check if a row already exists for this user+provider combination
  const existing = await db
    .select({ id: userIntegrationSchema.id })
    .from(userIntegrationSchema)
    .where(
      and(
        eq(userIntegrationSchema.userId, userId),
        eq(userIntegrationSchema.provider, provider),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing row — refresh tokens and metadata
    await db
      .update(userIntegrationSchema)
      .set({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt,
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(userIntegrationSchema.id, existing[0]!.id));
  } else {
    // Insert a new connection row
    await db.insert(userIntegrationSchema).values({
      userId,
      provider,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt,
      metadata,
    });
  }

  // Redirect back to the integrations page with a success indicator
  return NextResponse.redirect(`${redirectBase}?connected=${provider}`);
}
