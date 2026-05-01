// ── POST /api/team/accept-invite ──────────────────────────────────────────────
// Accepts a team invite using the one-time token from the invite email.
// The calling user must be authenticated.
//
// Flow:
//   1. Look up the team_member row by inviteToken — 404 if not found or already used.
//   2. Verify the row is still 'pending'.
//   3. Link the row to the current user: set userId, status='active', joinedAt=now,
//      clear the inviteToken so it can't be reused.
//
// Body: { token: string }
// Response: { ok: true; teamName: string }
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { teamMemberSchema, userSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(req: Request) {
  // Authenticate — the user must be logged in to accept an invite
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  // Parse token from request body
  const body = await req.json() as { token?: string };
  const token = (body.token ?? '').trim();

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  // ── Look up the invite row by token ──────────────────────────────────────
  // The token is stored in the team_member row and cleared after acceptance.
  const [invite] = await db
    .select({
      id: teamMemberSchema.id,
      status: teamMemberSchema.status,
      invitedEmail: teamMemberSchema.invitedEmail,
      ownerId: teamMemberSchema.ownerId,
    })
    .from(teamMemberSchema)
    .where(eq(teamMemberSchema.inviteToken, token))
    .limit(1);

  // Token not found or already used (token is cleared after acceptance)
  if (!invite) {
    return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 404 });
  }

  // Guard against re-accepting an already-active invite
  if (invite.status !== 'pending') {
    return NextResponse.json({ error: 'This invite has already been accepted' }, { status: 409 });
  }

  // ── Fetch the current user's name for the team member display name ────────
  const [user] = await db
    .select({ name: userSchema.name, email: userSchema.email })
    .from(userSchema)
    .where(eq(userSchema.id, userId))
    .limit(1);

  // ── Accept: link the row to the authenticated user ─────────────────────────
  // Set status → active, link userId, record joinedAt, clear the invite token
  // so it can never be reused.
  await db
    .update(teamMemberSchema)
    .set({
      userId,
      status: 'active',
      // Populate display name from the user's profile (may be null if not set yet)
      name: user?.name ?? user?.email ?? null,
      joinedAt: new Date(),
      // Clear the token — one-time use only
      inviteToken: null,
      updatedAt: new Date(),
    })
    .where(eq(teamMemberSchema.id, invite.id));

  return NextResponse.json({ ok: true });
}
