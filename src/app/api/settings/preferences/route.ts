// ── POST /api/settings/preferences ───────────────────────────────────────────
// Upserts the user's UI preferences: theme + export column order.
// Body: { theme?: 'light'|'dark'|'auto'; exportColumnsJson?: string }
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

  const body = await req.json() as { theme?: string; exportColumnsJson?: string };

  // Validate theme value
  const validThemes = ['light', 'dark', 'auto'];
  const theme = validThemes.includes(body.theme ?? '') ? body.theme! : undefined;

  // Validate exportColumnsJson is a valid JSON array string
  let exportColumnsJson: string | undefined;
  if (body.exportColumnsJson !== undefined) {
    try {
      const parsed = JSON.parse(body.exportColumnsJson);
      if (!Array.isArray(parsed)) throw new Error('not an array');
      exportColumnsJson = body.exportColumnsJson;
    } catch {
      return NextResponse.json({ error: 'exportColumnsJson must be a JSON array' }, { status: 400 });
    }
  }

  // Upsert the settings row — create if not exists, update if exists
  const existing = await db
    .select({ id: userSettingsSchema.id })
    .from(userSettingsSchema)
    .where(eq(userSettingsSchema.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    // Update only the fields that were provided
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (theme !== undefined) patch.theme = theme;
    if (exportColumnsJson !== undefined) patch.exportColumnsJson = exportColumnsJson;

    await db
      .update(userSettingsSchema)
      .set(patch)
      .where(eq(userSettingsSchema.userId, userId));
  } else {
    // Insert with defaults for fields not provided
    await db.insert(userSettingsSchema).values({
      userId,
      theme: theme ?? 'auto',
      exportColumnsJson: exportColumnsJson ?? '[]',
    });
  }

  return NextResponse.json({ ok: true });
}
