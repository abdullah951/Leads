// ── POST /api/credits/balance ─────────────────────────────────────────────
// Returns the current user's credit balance.
// Handles auto-reset:
//   - Free plan:    resets to 20 daily at midnight (tomorrow)
//   - Starter plan: resets to 60,000 monthly on the 1st of next month
//   - Pro plan:     resets to 150,000 monthly on the 1st of next month
//   - Enterprise:   returns Infinity (no credit limit)
// Also returns the user's current plan tier for UI use.
// ─────────────────────────────────────────────────────────────────────────

import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { teamMemberSchema, userCreditSchema, userSubscriptionSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';
import {
  getNextResetDate,
  isPlanUnlimited,
  PLAN_MONTHLY_CREDITS,
  type PlanTier,
} from '@/constants/planConfig';

export async function POST(_request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { userId } = auth;

  // ── Check if user is an active team member with a credit quota ─────────
  // Team member quotas override the standard credit system entirely.
  // creditQuota = 0 means no cap assigned — fall through to standard logic.
  const [teamMember] = await db
    .select({ creditQuota: teamMemberSchema.creditQuota, creditsUsed: teamMemberSchema.creditsUsed })
    .from(teamMemberSchema)
    .where(and(
      eq(teamMemberSchema.userId, userId),
      eq(teamMemberSchema.status, 'active'),
    ))
    .limit(1);

  if (teamMember && teamMember.creditQuota > 0) {
    // Remaining = quota minus how many they've used today
    const remaining = Math.max(0, teamMember.creditQuota - teamMember.creditsUsed);
    // Reset time: midnight tomorrow (team quotas reset daily)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return NextResponse.json({
      remaining,
      dailyLimit: teamMember.creditQuota,
      resetsAt: tomorrow,
      plan: 'team',
    });
  }

  // ── Fetch subscription to determine plan tier ──────────────────────────
  const [subscription] = await db
    .select({ plan: userSubscriptionSchema.plan, status: userSubscriptionSchema.status })
    .from(userSubscriptionSchema)
    .where(eq(userSubscriptionSchema.userId, userId))
    .limit(1);

  const plan = (subscription?.plan ?? 'free') as PlanTier;

  // Consider a plan "active" only if status is active or trialing
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing' || !subscription;

  // ── Enterprise — unlimited credits, no tracking needed ─────────────────
  if (isPlanUnlimited(plan) && isActive) {
    return NextResponse.json({
      remaining: Infinity,
      dailyLimit: Infinity,
      resetsAt: null,
      plan,
    });
  }

  // ── Fetch the credit row ───────────────────────────────────────────────
  const [credit] = await db
    .select()
    .from(userCreditSchema)
    .where(eq(userCreditSchema.userId, userId))
    .limit(1);

  if (!credit) {
    return NextResponse.json({ message: 'Credit record not found' }, { status: 404 });
  }

  // ── Auto-reset if the reset period has passed ──────────────────────────
  const now = new Date();
  if (now >= credit.resetsAt) {
    // If subscription is cancelled/expired, treat user as free tier
    const activePlan: PlanTier = isActive ? plan : 'free';

    // Determine the new credit limit based on the active plan
    const newLimit
      = activePlan === 'starter' ? PLAN_MONTHLY_CREDITS.starter
      : activePlan === 'pro'     ? PLAN_MONTHLY_CREDITS.pro
      : credit.dailyLimit; // free — keep their existing dailyLimit (20)

    // Next reset: 1st of next month for paid plans, tomorrow midnight for free
    const nextReset = getNextResetDate(activePlan);

    const [updated] = await db
      .update(userCreditSchema)
      .set({ remaining: newLimit, resetsAt: nextReset, updatedAt: new Date() })
      .where(eq(userCreditSchema.userId, userId))
      .returning();

    return NextResponse.json({
      remaining: updated!.remaining,
      dailyLimit: updated!.dailyLimit,
      resetsAt: updated!.resetsAt,
      plan: activePlan,
    });
  }

  // ── No reset needed — return current balance ───────────────────────────
  return NextResponse.json({
    remaining: credit.remaining,
    dailyLimit: credit.dailyLimit,
    resetsAt: credit.resetsAt,
    plan,
  });
}
