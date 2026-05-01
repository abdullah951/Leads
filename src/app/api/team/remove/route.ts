// ── POST /api/team/remove ─────────────────────────────────────────────────────
// Removes a team member (or revokes a pending invite).
// Body: { memberId: number }
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { teamMemberSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await req.json() as { memberId?: number };
  const memberId = Number(body.memberId);
  if (!memberId) {
    return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
  }

  // Ownership check — only the team owner can remove members
  const deleted = await db
    .delete(teamMemberSchema)
    .where(
      and(
        eq(teamMemberSchema.id, memberId),
        eq(teamMemberSchema.ownerId, userId),
      ),
    )
    .returning({ id: teamMemberSchema.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
