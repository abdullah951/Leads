// ── POST /api/settings/2fa/enable ────────────────────────────────────────────
// Verifies the 6-digit TOTP code against the temporary secret from /2fa/setup,
// then persists the secret and sets twoFactorEnabled = true on the user row.
// Body: { secret: string; code: string }
// Response: { ok: true }
//
// otplib v13.3.0: totp.verify(token, options) — first arg is the token string,
// second arg is the options object (must include secret, inherits crypto/base32
// from the TOTP instance).  Returns { valid: boolean, delta: number, ... }.
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

  const body = await req.json() as { secret?: string; code?: string };
  // Strip whitespace — users sometimes type codes with a space in the middle
  const secret = (body.secret ?? '').trim();
  const code = (body.code ?? '').replace(/\s/g, '');

  if (!secret || !code) {
    return NextResponse.json({ error: 'secret and code are required' }, { status: 400 });
  }

  // Verify the TOTP code against the provided secret.
  // totp.verify(token, options) — checks current window ±1 for clock drift (30s each).
  // Returns { valid: boolean, delta: number, epoch: number, timeStep: number } or false.
  const result = await totp.verify(code, { secret });
  const isValid = result && typeof result === 'object' ? result.valid : Boolean(result);

  if (!isValid) {
    return NextResponse.json(
      { error: 'Invalid or expired code — check your authenticator app' },
      { status: 401 },
    );
  }

  // Code is valid — persist the secret and mark 2FA as enabled
  await db
    .update(userSchema)
    .set({ twoFactorSecret: secret, twoFactorEnabled: true, updatedAt: new Date() })
    .where(eq(userSchema.id, userId));

  return NextResponse.json({ ok: true });
}
