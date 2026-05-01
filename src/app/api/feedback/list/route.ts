// ── POST /api/feedback/list ───────────────────────────────────────────────────
// Returns the community feedback feed sorted by votes desc, then newest first.
// Also returns whether the current user has upvoted each item.
// Body: { page?: number; pageSize?: number; category?: string }
// Response: { items: FeedbackItem[]; total: number }
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { desc, eq, sql, count } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { feedbackSchema, feedbackVoteSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(req: Request) {
  // Authenticate
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await req.json() as { page?: number; pageSize?: number; category?: string };
  const page = Math.max(1, Number(body.page ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(body.pageSize ?? 20)));
  const offset = (page - 1) * pageSize;

  // Build base query — filter by category if provided
  const baseWhere = body.category && ['bug', 'feature', 'general'].includes(body.category)
    ? eq(feedbackSchema.category, body.category)
    : undefined;

  // Fetch total count for pagination
  const countResult = await db
    .select({ total: count() })
    .from(feedbackSchema)
    .where(baseWhere);
  const total = countResult[0]?.total ?? 0;

  // Fetch the page of feedback items, sorted by votes desc then newest first
  const rows = await db
    .select({
      id: feedbackSchema.id,
      category: feedbackSchema.category,
      mood: feedbackSchema.mood,
      title: feedbackSchema.title,
      message: feedbackSchema.message,
      status: feedbackSchema.status,
      votes: feedbackSchema.votes,
      createdAt: feedbackSchema.createdAt,
      // Check if the current user has voted for this item using a correlated subquery
      userVoted: sql<boolean>`EXISTS (
        SELECT 1 FROM ${feedbackVoteSchema}
        WHERE ${feedbackVoteSchema.feedbackId} = ${feedbackSchema.id}
          AND ${feedbackVoteSchema.userId} = ${userId}
      )`.as('user_voted'),
    })
    .from(feedbackSchema)
    .where(baseWhere)
    .orderBy(desc(feedbackSchema.votes), desc(feedbackSchema.createdAt))
    .limit(pageSize)
    .offset(offset);

  const items = rows.map(row => ({
    id: row.id,
    category: row.category,
    mood: row.mood,
    title: row.title,
    message: row.message,
    status: row.status,
    votes: row.votes,
    userVoted: Boolean(row.userVoted),
    createdAt: row.createdAt.toISOString(),
  }));

  return NextResponse.json({ items, total: Number(total) });
}
