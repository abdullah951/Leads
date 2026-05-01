// ── POST /api/release-reactions/list ──────────────────────────────────────────
// Returns reaction counts and the current user's reactions for the given versions.
//
// Body:   { versions: string[] }   — e.g. ["1.4.0", "1.3.2", "1.3.0", ...]
//
// Response shape:
//   {
//     counts:  Record<version, Record<emoji, number>>,  // total reactions per emoji per version
//     mine:    Record<version, emoji[]>                 // emojis the current user has reacted with
//   }
//
// Example:
//   counts["1.4.0"]["🚀"] = 29
//   mine["1.4.0"]         = ["🚀", "❤️"]
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { inArray, sql } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { releaseReactionSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

// Allowed emoji — used to seed zero-counts so the UI never gets undefined
const ALLOWED_EMOJI = ['❤️', '🚀', '👍'] as const;

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  // ── Parse body ────────────────────────────────────────────────────────────
  const body = await req.json() as { versions?: unknown };
  if (!Array.isArray(body.versions) || body.versions.length === 0) {
    return NextResponse.json({ error: 'versions array is required' }, { status: 400 });
  }

  // Sanitise to strings only — reject anything unexpected
  const versions = body.versions.filter((v): v is string => typeof v === 'string');
  if (versions.length === 0) {
    return NextResponse.json({ counts: {}, mine: {} });
  }

  // ── Fetch all reactions for the requested versions ─────────────────────────
  // Single query — aggregate counts and pull user rows together
  const allRows = await db
    .select({
      version: releaseReactionSchema.version,
      emoji: releaseReactionSchema.emoji,
      // Count of all reactions for this (version, emoji) pair
      total: sql<number>`cast(count(*) as int)`,
      // Whether the current user is one of the reactors (1 or 0)
      userReacted: sql<number>`cast(sum(case when ${releaseReactionSchema.userId} = ${userId} then 1 else 0 end) as int)`,
    })
    .from(releaseReactionSchema)
    .where(inArray(releaseReactionSchema.version, versions))
    .groupBy(releaseReactionSchema.version, releaseReactionSchema.emoji);

  // ── Build response maps ────────────────────────────────────────────────────

  // Seed both maps with zeros for every version/emoji combination
  // so the UI always receives a complete structure without null-checks
  const counts: Record<string, Record<string, number>> = {};
  const mine: Record<string, string[]> = {};

  for (const v of versions) {
    counts[v] = {};
    mine[v] = [];
    for (const e of ALLOWED_EMOJI) {
      counts[v]![e] = 0;
    }
  }

  // Fill in actual data from the DB query
  for (const row of allRows) {
    if (!counts[row.version]) {
      // Version not in seed (shouldn't happen) — skip
      continue;
    }
    counts[row.version]![row.emoji] = row.total;

    // userReacted > 0 means the current user has reacted with this emoji
    if (row.userReacted > 0) {
      mine[row.version]!.push(row.emoji);
    }
  }

  return NextResponse.json({ counts, mine });
}
