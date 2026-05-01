// ── POST /api/settings/get ────────────────────────────────────────────────────
// Returns the current user's profile info + all persisted settings in one call.
// If no settings row exists yet, returns defaults without creating a row.
// Response: SettingsPayload (see type below)
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { userSchema, userSettingsSchema, userCreditSchema, userSubscriptionSchema, teamMemberSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST() {
  // Authenticate
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  // Fetch user row for profile data (includes avatar + 2FA status)
  const [user] = await db
    .select({
      id: userSchema.id,
      name: userSchema.name,
      email: userSchema.email,
      avatarUrl: userSchema.avatarUrl,
      // hasPassword lets the UI decide whether to show "set password" vs "change password"
      hasPassword: userSchema.password,
      twoFactorEnabled: userSchema.twoFactorEnabled,
    })
    .from(userSchema)
    .where(eq(userSchema.id, userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Fetch settings — may be null if user hasn't saved settings yet
  const [settings] = await db
    .select()
    .from(userSettingsSchema)
    .where(eq(userSettingsSchema.userId, userId))
    .limit(1);

  // Check if user is an active team member with a credit quota assigned.
  // If so, team quota overrides the standard userCredit row.
  const [teamMember] = await db
    .select({ creditQuota: teamMemberSchema.creditQuota, creditsUsed: teamMemberSchema.creditsUsed })
    .from(teamMemberSchema)
    .where(and(
      eq(teamMemberSchema.userId, userId),
      eq(teamMemberSchema.status, 'active'),
    ))
    .limit(1);

  // Fetch credit balance for the subscription panel
  const [credit] = await db
    .select({ remaining: userCreditSchema.remaining, dailyLimit: userCreditSchema.dailyLimit, resetsAt: userCreditSchema.resetsAt })
    .from(userCreditSchema)
    .where(eq(userCreditSchema.userId, userId))
    .limit(1);

  // Fetch subscription for the billing panel
  const [sub] = await db
    .select({
      plan: userSubscriptionSchema.plan,
      status: userSubscriptionSchema.status,
      currentPeriodEnd: userSubscriptionSchema.currentPeriodEnd,
    })
    .from(userSubscriptionSchema)
    .where(eq(userSubscriptionSchema.userId, userId))
    .limit(1);

  return NextResponse.json({
    // ── Profile ──
    name: user.name ?? '',
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    hasPassword: user.hasPassword !== null,
    twoFactorEnabled: user.twoFactorEnabled ?? false,

    // ── Settings (defaults if no row) ──
    theme: settings?.theme ?? 'auto',
    exportColumnsJson: settings?.exportColumnsJson ?? '[]',
    creditAlertEnabled: settings?.creditAlertEnabled ?? false,
    creditAlertThreshold: settings?.creditAlertThreshold ?? 5,

    // ── Credits ──
    // Team members with a quota use quota - used; reset time computed fresh (same
    // formula as balance API) so both views show the same time.
    ...(teamMember && teamMember.creditQuota > 0
      ? (() => {
          // Compute tomorrow midnight in server local time — identical to balance API
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          return {
            creditsRemaining: Math.max(0, teamMember.creditQuota - teamMember.creditsUsed),
            creditsDailyLimit: teamMember.creditQuota,
            creditsResetsAt: tomorrow.toISOString(),
          };
        })()
      : {
          creditsRemaining: credit?.remaining ?? 0,
          creditsDailyLimit: credit?.dailyLimit ?? 20,
          creditsResetsAt: credit?.resetsAt?.toISOString() ?? null,
        }),

    // ── Subscription ──
    plan: sub?.plan ?? 'free',
    subStatus: sub?.status ?? 'active',
    currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
  });
}
