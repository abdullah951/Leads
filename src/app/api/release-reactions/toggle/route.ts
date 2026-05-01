// ── POST /api/release-reactions/toggle ────────────────────────────────────────
// Toggles a single emoji reaction for the current user on a release version.
// If the (userId, version, emoji) row does not exist → insert (react).
// If it already exists → delete (un-react).
//
// Body:     { version: string; emoji: string }
// Response: { version: string; emoji: string; count: number; userReacted: boolean }
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { releaseReactionSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

// Allowed emoji values — any other value is rejected to prevent DB pollution
const ALLOWED_EMOJI = new Set(['❤️', '🚀', '👍']);

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  // ── Parse + validate body ─────────────────────────────────────────────────
  const body = await req.json() as { version?: unknown; emoji?: unknown };

  const version = typeof body.version === 'string' ? body.version.trim() : '';
  const emoji = typeof body.emoji === 'string' ? body.emoji.trim() : '';

  if (!version) {
    return NextResponse.json({ error: 'version is required' }, { status: 400 });
  }
  if (!ALLOWED_EMOJI.has(emoji)) {
    return NextResponse.json({ error: 'emoji must be one of ❤️ 🚀 👍' }, { status: 400 });
  }

  // ── Check for existing reaction row ───────────────────────────────────────
  const existing = await db
    .select({ id: releaseReactionSchema.id })
    .from(releaseReactionSchema)
    .where(
      and(
        eq(releaseReactionSchema.userId, userId),
        eq(releaseReactionSchema.version, version),
        eq(releaseReactionSchema.emoji, emoji),
      ),
    )
    .limit(1);

  let userReacted: boolean;

  if (existing.length > 0) {
    // ── Un-react: delete the existing row ────────────────────────────────
    await db
      .delete(releaseReactionSchema)
      .where(eq(releaseReactionSchema.id, existing[0]!.id));

    userReacted = false;
  } else {
    // ── React: insert a new row ───────────────────────────────────────────
    await db.insert(releaseReactionSchema).values({ userId, version, emoji });

    userReacted = true;
  }

  // ── Return the fresh count for this (version, emoji) pair ─────────────────
  // Single aggregation query so the client gets the authoritative server count
  const [countRow] = await db
    .select({ total: sql<number>`cast(count(*) as int)` })
    .from(releaseReactionSchema)
    .where(
      and(
        eq(releaseReactionSchema.version, version),
        eq(releaseReactionSchema.emoji, emoji),
      ),
    );

  return NextResponse.json({
    version,
    emoji,
    count: countRow?.total ?? 0,
    userReacted,
  });
}
