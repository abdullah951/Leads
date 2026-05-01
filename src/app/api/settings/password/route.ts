// ── POST /api/settings/password ───────────────────────────────────────────────
// Changes the current user's password.
// For Google-only accounts (password === null) this sets a password for the first time.
// Body: { currentPassword?: string; newPassword: string }
// Response: { ok: true }
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

  const body = await req.json() as { currentPassword?: string; newPassword?: string };
  const newPassword = (body.newPassword ?? '').trim();

  // Minimum password length
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  // Fetch user's current password hash
  const [user] = await db
    .select({ password: userSchema.password })
    .from(userSchema)
    .where(eq(userSchema.id, userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // If the account already has a password, require currentPassword to verify identity
  if (user.password !== null) {
    const current = (body.currentPassword ?? '').trim();
    if (!current) {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
    }
    const valid = await bcrypt.compare(current, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
    }
  }

  // Hash the new password and save it
  const hash = await bcrypt.hash(newPassword, 12);
  await db
    .update(userSchema)
    .set({ password: hash, updatedAt: new Date() })
    .where(eq(userSchema.id, userId));

  return NextResponse.json({ ok: true });
}
