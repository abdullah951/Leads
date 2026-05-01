// ── POST /api/feedback/submit ─────────────────────────────────────────────────
// Saves a new feedback item for the current authenticated user.
// Body: { category: 'bug'|'feature'|'general'; mood?: number; title: string; message?: string }
// Response: { id: number }
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { feedbackSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(req: Request) {
  // Authenticate — returns { userId } or a 401 NextResponse
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  // Parse body
  const body = await req.json() as {
    category?: string;
    mood?: number;
    title?: string;
    message?: string;
  };

  // Validate required fields
  const title = (body.title ?? '').trim();
  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const category = ['bug', 'feature', 'general'].includes(body.category ?? '')
    ? body.category!
    : 'general';

  // mood is optional (1–5); clamp to valid range if provided
  const mood = body.mood != null
    ? Math.max(1, Math.min(5, Math.round(Number(body.mood))))
    : null;

  // Insert feedback row
  const [inserted] = await db
    .insert(feedbackSchema)
    .values({
      userId,
      category,
      mood,
      title,
      message: (body.message ?? '').trim(),
      status: 'open',
      votes: 0,
    })
    .returning({ id: feedbackSchema.id });

  return NextResponse.json({ id: inserted!.id });
}
