// ── POST /api/settings/2fa/disable ───────────────────────────────────────────
// Verifies the user's current TOTP code against their stored secret,
// then disables 2FA and clears the stored secret.
// Body: { code: string }
// Response: { ok: true }
//
// otplib v13.3.0: totp.verify(token, options) — first arg is the token string,
// second arg is the options object (must include secret).
// Returns { valid: boolean, ... } or false on failure.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
// otplib v13.3.0 — must supply crypto and base32 plugins explicitly
import { NobleCryptoPlugin, ScureBase32Plugin, TOTP } from 'otplib';
import { db } from '@/libs/DB';
import { userSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

// Shared TOTP instance with the required crypto + base32 plugins wired up
const totp = new TOTP({
  crypto: new NobleCryptoPlugin(),
  base32: new ScureBase32Plugin(),
});

export async function POST(req: Request) {
  // Authenticate
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await req.json() as { code?: string };
  // Strip whitespace — users sometimes type codes with a space in the middle
  const code = (body.code ?? '').replace(/\s/g, '');

  if (!code) {
    return NextResponse.json({ error: 'Authenticator code is required' }, { status: 400 });
  }

  // Fetch the user's stored 2FA secret from the DB
  const [user] = await db
    .select({ twoFactorSecret: userSchema.twoFactorSecret, twoFactorEnabled: userSchema.twoFactorEnabled })
    .from(userSchema)
    .where(eq(userSchema.id, userId))
    .limit(1);

  // Guard: 2FA must be currently enabled and a secret must be stored
  if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
    return NextResponse.json({ error: '2FA is not currently enabled' }, { status: 400 });
  }

  // Verify the code against the stored secret.
  // Returns { valid: boolean, ... } on success or false if invalid.
  const result = await totp.verify(code, { secret: user.twoFactorSecret });
  const isValid = result && typeof result === 'object' ? result.valid : Boolean(result);

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 });
  }

  // Code verified — clear the stored secret and disable 2FA
  await db
    .update(userSchema)
    .set({ twoFactorSecret: null, twoFactorEnabled: false, updatedAt: new Date() })
    .where(eq(userSchema.id, userId));

  return NextResponse.json({ ok: true });
}
