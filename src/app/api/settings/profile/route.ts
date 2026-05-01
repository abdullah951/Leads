// ── POST /api/settings/profile ────────────────────────────────────────────────
// Updates the current user's display name only.
// Email is read-only from this endpoint — changing email requires a separate
// email-verification flow (not yet implemented).
// Body: { name: string }
// Response: { ok: true }
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { userSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(req: Request) {
  // Authenticate
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await req.json() as { name?: string };

  // Trim name; store null when empty so DB stays clean
  const name = (body.name ?? '').trim() || null;

  // Persist — use a strongly-typed Drizzle set() object to avoid silent column drops
  await db
    .update(userSchema)
    .set({ name, updatedAt: new Date() })
    .where(eq(userSchema.id, userId));

  return NextResponse.json({ ok: true });
}
