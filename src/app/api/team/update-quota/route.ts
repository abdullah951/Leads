// ── POST /api/team/update-quota ───────────────────────────────────────────────
// Updates the daily credit quota for a specific team member.
// Body: { memberId: number; creditQuota: number }
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

  const body = await req.json() as { memberId?: number; creditQuota?: number };
  const memberId = Number(body.memberId);
  const creditQuota = Number(body.creditQuota ?? 0);

  if (!memberId) {
    return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
  }

  // Only the owner can update quota — enforce with ownerId check
  const updated = await db
    .update(teamMemberSchema)
    .set({ creditQuota, updatedAt: new Date() })
    .where(
      and(
        eq(teamMemberSchema.id, memberId),
        eq(teamMemberSchema.ownerId, userId),
      ),
    )
    .returning({ id: teamMemberSchema.id });

  if (updated.length === 0) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
