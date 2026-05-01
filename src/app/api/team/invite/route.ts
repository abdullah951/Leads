// ── POST /api/team/invite ──────────────────────────────────────────────────────
// Sends a team invite to an email address.
// Body: { email: string; role: 'admin'|'member'|'viewer'; creditQuota: number }
// Response: { id: number; inviteToken: string }
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from '@/libs/DB';
import { teamMemberSchema, userSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';
import { sendMail } from '@/libs/Mailer';
import { Env } from '@/libs/Env';

export async function POST(req: Request) {
  // Authenticate
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  // Parse + validate body
  const body = await req.json() as { email?: string; role?: string; creditQuota?: number };
  const email = (body.email ?? '').trim().toLowerCase();
  const role = body.role ?? 'member';
  const creditQuota = Number(body.creditQuota ?? 0);

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // Disallow duplicate pending invite for the same email under the same owner
  const existing = await db
    .select({ id: teamMemberSchema.id })
    .from(teamMemberSchema)
    .where(
      and(
        eq(teamMemberSchema.ownerId, userId),
        eq(teamMemberSchema.invitedEmail, email),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ error: 'A member with this email already exists' }, { status: 409 });
  }

  // Generate a unique invite token for the invite link
  const inviteToken = randomUUID();

  // Insert the pending invite row
  const [inserted] = await db
    .insert(teamMemberSchema)
    .values({
      ownerId: userId,
      invitedEmail: email,
      role,
      creditQuota,
      status: 'pending',
      inviteToken,
    })
    .returning({ id: teamMemberSchema.id });

  // ── Fetch inviter's name for the email ────────────────────────────────────
  // Look up the display name of the person who sent the invite so the email
  // reads "Alice invited you…" rather than just a generic message.
  const [inviter] = await db
    .select({ name: userSchema.name, email: userSchema.email })
    .from(userSchema)
    .where(eq(userSchema.id, userId))
    .limit(1);

  const inviterLabel = inviter?.name ?? inviter?.email ?? 'Your team admin';

  // ── Build the invite acceptance URL ───────────────────────────────────────
  // NEXT_PUBLIC_APP_URL is the canonical root URL (e.g. https://app.warpleads.com).
  // Fall back to localhost during local development if the env var is not set.
  const appUrl = Env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const inviteUrl = `${appUrl}/join-team?token=${inviteToken}`;

  // ── Send invite email ──────────────────────────────────────────────────────
  // Fire-and-forget inside a try/catch so a mail failure never breaks the
  // API response — the invite row is already persisted.
  try {
    await sendMail({
      to: email,
      subject: `${inviterLabel} invited you to join WarpLeads`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a2e">
          <h2 style="margin:0 0 16px;font-size:22px;font-weight:800">
            You've been invited to WarpLeads 🚀
          </h2>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#444">
            <strong>${inviterLabel}</strong> has invited you to join their team on WarpLeads
            as a <strong>${role}</strong>.
          </p>
          ${creditQuota > 0
            ? `<p style="margin:0 0 20px;font-size:14px;color:#666">
                You'll start with a daily credit quota of <strong>${creditQuota} credits</strong>.
               </p>`
            : ''}
          <a
            href="${inviteUrl}"
            style="display:inline-block;padding:12px 28px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:700"
          >
            Accept invitation
          </a>
          <p style="margin:24px 0 0;font-size:12px;color:#999;line-height:1.5">
            Or copy this link into your browser:<br/>
            <a href="${inviteUrl}" style="color:#6366f1;word-break:break-all">${inviteUrl}</a>
          </p>
          <hr style="margin:28px 0;border:none;border-top:1px solid #e5e7eb"/>
          <p style="margin:0;font-size:11px;color:#aaa">
            If you weren't expecting this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
    });
  } catch (mailErr) {
    // Log the error but don't fail the request — the invite is already saved
    console.error('[team/invite] Failed to send invite email:', mailErr);
  }

  return NextResponse.json({ id: inserted!.id, inviteToken });
}
