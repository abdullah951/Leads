// ── POST /api/team/list ────────────────────────────────────────────────────────
// Returns all team members (active + pending + inactive) that the current
// authenticated user has invited as the team owner.
// Response: TeamMember[]
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { teamMemberSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST() {
  // Authenticate — returns userId or a 401 response
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  // Fetch all members belonging to this owner, newest first
  const rows = await db
    .select()
    .from(teamMemberSchema)
    .where(eq(teamMemberSchema.ownerId, userId))
    .orderBy(teamMemberSchema.createdAt);

  // Map DB rows to a clean API shape
  const members = rows.map(row => ({
    id: row.id,
    email: row.invitedEmail,
    name: row.name,
    role: row.role,
    status: row.status,           // pending | active | inactive
    creditQuota: row.creditQuota,
    creditsUsed: row.creditsUsed,
    lowCreditAlert: row.lowCreditAlert,
    invitedAt: row.invitedAt.toISOString(),
    joinedAt: row.joinedAt?.toISOString() ?? null,
  }));

  return NextResponse.json(members);
}
