import bcrypt from 'bcryptjs';
import { eq, or } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { Env } from '@/libs/Env';
import { refreshTokensSchema, userCreditSchema, userSchema, userSubscriptionSchema } from '@/models/Schema';
import { signAccessToken, signRefreshToken } from '@/utils/Jwt';
import { nextLocalMidnightUtc, sanitizeTimezone } from '@/utils/Timezone';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Shape of Google's token endpoint response. */
type GoogleTokenResponse = {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
};

/** Decoded claims from Google's OpenID Connect ID token (userinfo endpoint shape). */
type GoogleUserInfo = {
  sub: string;        // Google's unique subject ID — used as googleId
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Writes access_token and refresh_token cookies onto a response object. */
function setTokenCookies(response: NextResponse, accessToken: string, refreshToken: string) {
  const isProd = process.env.NODE_ENV === 'production';

  // access_token: httpOnly so JS cannot read it; 7 days matches the JWT lifetime.
  response.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax', // lax (not strict) so the cookie is sent on the redirect back from Google
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });

  // refresh_token: same security settings
  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────

/**
 * GET /api/auth/google/callback
 *
 * Called by Google after the user grants (or denies) access on the consent screen.
 * Query params:
 *   code  — short-lived auth code that we exchange for tokens
 *   error — present when the user denied access
 *
 * Flow:
 *   1. Exchange `code` for Google tokens
 *   2. Fetch the user's profile from Google's userinfo endpoint
 *   3. Look up an existing user by googleId OR email
 *      a. If found by email only — link the googleId to the existing account
 *      b. If not found — create a new account (emailVerified: true, no password)
 *   4. Issue JWT cookies
 *   5. Redirect to /dashboard
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // ── Guard: user denied access on Google's consent screen ──────────────────
  const error = searchParams.get('error');
  if (error) {
    // Redirect back to sign-in with a clear error query param
    return NextResponse.redirect(
      `${Env.NEXT_PUBLIC_APP_URL ?? ''}/sign-in?error=google_denied`,
    );
  }

  // ── Guard: missing auth code ───────────────────────────────────────────────
  const code = searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(
      `${Env.NEXT_PUBLIC_APP_URL ?? ''}/sign-in?error=google_no_code`,
    );
  }

  // ── Guard: Google OAuth not configured ─────────────────────────────────────
  if (!Env.GOOGLE_CLIENT_ID || !Env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(
      `${Env.NEXT_PUBLIC_APP_URL ?? ''}/sign-in?error=google_not_configured`,
    );
  }

  const redirectUri = `${Env.NEXT_PUBLIC_APP_URL ?? ''}/api/auth/google/callback`;

  try {
    // ── Step 1: Exchange authorization code for tokens ─────────────────────
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: Env.GOOGLE_CLIENT_ID,
        client_secret: Env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      // Token exchange failed (e.g. code already used or expired)
      return NextResponse.redirect(
        `${Env.NEXT_PUBLIC_APP_URL ?? ''}/sign-in?error=google_token_failed`,
      );
    }

    const tokens: GoogleTokenResponse = await tokenRes.json();

    // ── Step 2: Fetch the user's profile from Google's userinfo endpoint ───
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoRes.ok) {
      return NextResponse.redirect(
        `${Env.NEXT_PUBLIC_APP_URL ?? ''}/sign-in?error=google_userinfo_failed`,
      );
    }

    const googleUser: GoogleUserInfo = await userInfoRes.json();

    // Require that Google has verified the email — prevents unverified emails from bypassing checks
    if (!googleUser.email_verified) {
      return NextResponse.redirect(
        `${Env.NEXT_PUBLIC_APP_URL ?? ''}/sign-in?error=google_email_unverified`,
      );
    }

    // ── Step 3: Look up existing user by googleId OR email ─────────────────
    // Using OR so that if a user previously signed up with email/password,
    // their Google account is automatically linked on first Google login.
    const [existingUser] = await db
      .select()
      .from(userSchema)
      .where(
        or(
          eq(userSchema.googleId, googleUser.sub),
          eq(userSchema.email, googleUser.email),
        ),
      )
      .limit(1);

    let userId: number;
    let userEmail: string;
    let userRole: string;

    if (existingUser) {
      // ── 3a: Existing user — link googleId if not already set ─────────────
      // This handles the case where the user previously signed up with email/password.
      if (!existingUser.googleId) {
        await db
          .update(userSchema)
          .set({
            googleId: googleUser.sub,
            // Also mark email as verified since Google has confirmed it
            emailVerified: true,
            // Update display name from Google if the user doesn't have one yet
            name: existingUser.name ?? googleUser.name ?? null,
          })
          .where(eq(userSchema.id, existingUser.id));
      }

      userId = existingUser.id;
      userEmail = existingUser.email;
      userRole = existingUser.role ?? 'user';
    } else {
      // ── 3b: New user — create account without password ───────────────────
      // Google has already verified the email, so emailVerified is set to true immediately.
      // No password, no OTP needed — the googleId IS the authentication credential.
      const timezone = sanitizeTimezone(undefined); // default UTC; no browser timezone available server-side
      const resetsAt = nextLocalMidnightUtc(timezone);

      const [newUser] = await db
        .insert(userSchema)
        .values({
          email: googleUser.email,
          // password is nullable for Google-only accounts
          password: null,
          name: googleUser.name ?? null,
          googleId: googleUser.sub,
          // Google has verified the email — no OTP flow needed
          emailVerified: true,
          timezone,
        })
        .returning({ id: userSchema.id, email: userSchema.email, role: userSchema.role });

      if (!newUser) {
        // Unexpected DB failure
        return NextResponse.redirect(
          `${Env.NEXT_PUBLIC_APP_URL ?? ''}/sign-in?error=google_db_error`,
        );
      }

      // Seed 20 daily free credits and a free subscription row — same as email signup
      await Promise.all([
        db.insert(userCreditSchema).values({
          userId: newUser.id,
          remaining: 20,
          dailyLimit: 20,
          resetsAt,
        }),
        db.insert(userSubscriptionSchema).values({
          userId: newUser.id,
          plan: 'free',
          status: 'active',
        }),
      ]);

      userId = newUser.id;
      userEmail = newUser.email;
      userRole = newUser.role ?? 'user';
    }

    // ── Step 4: Invalidate old sessions and issue new JWT cookies ──────────
    // Single-session policy: delete all previous refresh tokens for this user.
    await db.delete(refreshTokensSchema).where(eq(refreshTokensSchema.userId, userId));

    const accessToken = await signAccessToken({ userId: String(userId), email: userEmail, role: userRole });
    const refreshToken = await signRefreshToken({ userId: String(userId) });
    const tokenHash = await bcrypt.hash(refreshToken, 10);

    // Store refresh token hash in DB so we can validate it on the /api/auth/refresh route
    await db.insert(refreshTokensSchema).values({
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // ── Step 5: Redirect to dashboard with cookies set ─────────────────────
    const dashboardUrl = `${Env.NEXT_PUBLIC_APP_URL ?? ''}/dashboard`;
    const response = NextResponse.redirect(dashboardUrl);
    setTokenCookies(response, accessToken, refreshToken);
    return response;
  } catch {
    // Catch-all for network errors, DB errors, etc.
    return NextResponse.redirect(
      `${Env.NEXT_PUBLIC_APP_URL ?? ''}/sign-in?error=google_unexpected`,
    );
  }
}
