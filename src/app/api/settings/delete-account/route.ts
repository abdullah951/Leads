// ── POST /api/settings/delete-account ────────────────────────────────────────
// Permanently deletes the authenticated user's account and ALL related data.
// Requires password confirmation for email/password accounts.
// For Google-only accounts, the user must type "DELETE" as confirmation.
// Body: { password?: string; confirmation?: string }
// Response: { ok: true } — the client should clear cookies and redirect to /sign-up
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '@/libs/DB';
import { userSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(req: Request) {
  // Authenticate
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await req.json() as { password?: string; confirmation?: string };

  // Fetch user's current password hash to determine auth method
  const [user] = await db
    .select({ password: userSchema.password })
    .from(userSchema)
    .where(eq(userSchema.id, userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (user.password !== null) {
    // Email/password account — require current password
    const pw = (body.password ?? '').trim();
    if (!pw) {
      return NextResponse.json({ error: 'Password is required to delete your account' }, { status: 400 });
    }
    const valid = await bcrypt.compare(pw, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }
  } else {
    // Google-only account — require the user to type "DELETE"
    if ((body.confirmation ?? '').trim() !== 'DELETE') {
      return NextResponse.json({ error: 'Type DELETE to confirm' }, { status: 400 });
    }
  }

  // Hard-delete the user row — all child rows cascade via FK ON DELETE CASCADE
  await db.delete(userSchema).where(eq(userSchema.id, userId));

  // Clear auth cookies in the response
  const response = NextResponse.json({ ok: true });
  response.cookies.set('access_token', '', { maxAge: 0, path: '/' });
  response.cookies.set('refresh_token', '', { maxAge: 0, path: '/' });
  return response;
}
