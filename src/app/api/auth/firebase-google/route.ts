/**
 * POST /api/auth/firebase-google
 *
 * Accepts a Firebase ID token from the browser (obtained after signInWithPopup),
 * verifies it with Firebase Admin SDK, then creates or finds the user in our DB
 * and issues our own JWT cookies (access_token + refresh_token).
 *
 * Flow:
 *   1. Client calls signInWithPopup(firebaseAuth, googleProvider)
 *   2. Client POSTs { idToken } here
 *   3. Server verifies token, extracts uid/email/name
 *   4. Server creates user if new (seeds credits + subscription)
 *   5. Server issues access_token + refresh_token cookies
 *   6. Client redirects to /dashboard
 */

import bcrypt from 'bcryptjs';
import { eq, or } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import * as z from 'zod';
import { db } from '@/libs/DB';
import { getAdminAuth } from '@/libs/FirebaseAdmin';
import { refreshTokensSchema, userCreditSchema, userSchema, userSubscriptionSchema } from '@/models/Schema';
import { signAccessToken, signRefreshToken } from '@/utils/Jwt';
import { nextLocalMidnightUtc, sanitizeTimezone } from '@/utils/Timezone';

// ── Request body schema ────────────────────────────────────────────────────────
const bodySchema = z.object({
  // Firebase ID token returned by getIdToken() after a successful signInWithPopup
  idToken: z.string().min(1),
});

// ── Cookie helper ──────────────────────────────────────────────────────────────
/**
 * Sets httpOnly JWT cookies on the response.
 * @param response - The NextResponse to set cookies on.
 * @param accessToken - Short-lived access token (15 min).
 * @param refreshToken - Long-lived refresh token (7 days).
 */
function setTokenCookies(response: NextResponse, accessToken: string, refreshToken: string) {
  const isProd = process.env.NODE_ENV === 'production';

  // access_token: 15 minutes
  response.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax', // lax allows redirect back from Firebase popup
    maxAge: 15 * 60,
    path: '/',
  });

  // refresh_token: 7 days
  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
}

// ── Route handler ──────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  // ── Parse request body ───────────────────────────────────────────────────────
  let idToken: string;
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 422 });
    }
    idToken = parsed.data.idToken;
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }

  // ── Verify the Firebase ID token ─────────────────────────────────────────────
  // adminAuth.verifyIdToken throws if the token is expired, tampered, or from a different project.
  let firebaseUid: string;
  let email: string;
  let name: string | undefined;
  let emailVerified: boolean;

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    firebaseUid = decoded.uid;
    email = decoded.email ?? '';
    name = decoded.name;
    emailVerified = decoded.email_verified ?? false;
  } catch {
    return NextResponse.json({ message: 'Invalid or expired Firebase token' }, { status: 401 });
  }

  // Require a verified email — Firebase marks this true for Google sign-in by default
  if (!email || !emailVerified) {
    return NextResponse.json({ message: 'Google account email is not verified' }, { status: 400 });
  }

  try {
    // ── Find or create user ────────────────────────────────────────────────────
    // Match on googleId (Firebase UID) OR email so existing email/password users
    // get their Google account linked automatically on first Google login.
    const [existingUser] = await db
      .select()
      .from(userSchema)
      .where(
        or(
          eq(userSchema.googleId, firebaseUid),
          eq(userSchema.email, email),
        ),
      )
      .limit(1);

    let userId: number;
    let userEmail: string;
    let userRole: string;

    if (existingUser) {
      // ── Existing user: link googleId if this is their first Google login ──────
      if (!existingUser.googleId) {
        await db
          .update(userSchema)
          .set({
            // Store Firebase UID as googleId so future logins hit the first branch
            googleId: firebaseUid,
            // Mark email as verified — Google has confirmed it
            emailVerified: true,
            // Backfill display name from Google if the user hasn't set one yet
            name: existingUser.name ?? name ?? null,
          })
          .where(eq(userSchema.id, existingUser.id));
      }

      userId = existingUser.id;
      userEmail = existingUser.email;
      userRole = existingUser.role ?? 'user';
    } else {
      // ── New user: create account without a password ────────────────────────
      // Google has verified the email, so emailVerified = true and no OTP flow needed.
      // Default timezone to UTC — browser timezone is not available server-side.
      const timezone = sanitizeTimezone(undefined);
      const resetsAt = nextLocalMidnightUtc(timezone);

      const [newUser] = await db
        .insert(userSchema)
        .values({
          email,
          password: null,           // no password for Google-only accounts
          name: name ?? null,
          googleId: firebaseUid,    // Firebase UID stored as googleId
          emailVerified: true,
          timezone,
        })
        .returning({ id: userSchema.id, email: userSchema.email, role: userSchema.role });

      if (!newUser) {
        return NextResponse.json({ message: 'Failed to create account' }, { status: 500 });
      }

      // Seed 20 daily free credits + free subscription row (same as email signup)
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

    // ── Single-session policy: invalidate old refresh tokens ──────────────────
    await db
      .delete(refreshTokensSchema)
      .where(eq(refreshTokensSchema.userId, userId));

    // ── Issue our own JWT cookies ──────────────────────────────────────────────
    // We issue our own JWTs (not Firebase tokens) so the rest of the app (middleware,
    // requireAuth, etc.) works identically regardless of how the user signed in.
    const accessToken = await signAccessToken({ userId: String(userId), email: userEmail, role: userRole });
    const refreshToken = await signRefreshToken({ userId: String(userId) });
    const tokenHash = await bcrypt.hash(refreshToken, 10);

    // Persist hashed refresh token so /api/auth/refresh can validate it
    await db.insert(refreshTokensSchema).values({
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Set cookies and return success — the client will redirect to /dashboard
    const response = NextResponse.json({ ok: true });
    setTokenCookies(response, accessToken, refreshToken);
    return response;
  } catch {
    return NextResponse.json({ message: 'Authentication failed' }, { status: 500 });
  }
}
