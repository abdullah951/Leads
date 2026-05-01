// ── POST /api/settings/notifications ─────────────────────────────────────────
// Upserts the user's notification preferences.
// Body: { creditAlertEnabled: boolean; creditAlertThreshold: number }
// Response: { ok: true }
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { userSettingsSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(req: Request) {
  // Authenticate
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await req.json() as { creditAlertEnabled?: boolean; creditAlertThreshold?: number };
  const enabled = Boolean(body.creditAlertEnabled);
  const threshold = Math.max(1, Math.min(10000, Number(body.creditAlertThreshold ?? 5)));

  // Upsert settings row
  const existing = await db
    .select({ id: userSettingsSchema.id })
    .from(userSettingsSchema)
    .where(eq(userSettingsSchema.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(userSettingsSchema)
      .set({ creditAlertEnabled: enabled, creditAlertThreshold: threshold, updatedAt: new Date() })
      .where(eq(userSettingsSchema.userId, userId));
  } else {
    await db.insert(userSettingsSchema).values({
      userId,
      creditAlertEnabled: enabled,
      creditAlertThreshold: threshold,
    });
  }

  return NextResponse.json({ ok: true });
}
