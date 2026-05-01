// ── POST /api/feedback/vote ───────────────────────────────────────────────────
// Toggles an upvote on a feedback item for the current user.
// If the user has not voted → insert vote row + increment feedback.votes
// If the user has already voted → delete vote row + decrement feedback.votes
// Body: { feedbackId: number }
// Response: { votes: number; userVoted: boolean }
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { feedbackSchema, feedbackVoteSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(req: Request) {
  // Authenticate
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await req.json() as { feedbackId?: number };
  const feedbackId = Number(body.feedbackId);
  if (!feedbackId) {
    return NextResponse.json({ error: 'feedbackId is required' }, { status: 400 });
  }

  // Check whether the user has already voted on this item
  const existing = await db
    .select({ id: feedbackVoteSchema.id })
    .from(feedbackVoteSchema)
    .where(
      and(
        eq(feedbackVoteSchema.feedbackId, feedbackId),
        eq(feedbackVoteSchema.userId, userId),
      ),
    )
    .limit(1);

  let newVoteCount: number;

  if (existing.length > 0) {
    // ── Un-vote ────────────────────────────────────────────────────────────
    // Remove the vote row and decrement the counter atomically
    await db
      .delete(feedbackVoteSchema)
      .where(eq(feedbackVoteSchema.id, existing[0]!.id));

    const [updated] = await db
      .update(feedbackSchema)
      .set({ votes: sql`GREATEST(0, ${feedbackSchema.votes} - 1)` })
      .where(eq(feedbackSchema.id, feedbackId))
      .returning({ votes: feedbackSchema.votes });

    newVoteCount = updated?.votes ?? 0;
    return NextResponse.json({ votes: newVoteCount, userVoted: false });
  } else {
    // ── Upvote ─────────────────────────────────────────────────────────────
    // Insert vote row and increment the counter atomically
    await db.insert(feedbackVoteSchema).values({ feedbackId, userId });

    const [updated] = await db
      .update(feedbackSchema)
      .set({ votes: sql`${feedbackSchema.votes} + 1` })
      .where(eq(feedbackSchema.id, feedbackId))
      .returning({ votes: feedbackSchema.votes });

    newVoteCount = updated?.votes ?? 0;
    return NextResponse.json({ votes: newVoteCount, userVoted: true });
  }
}
