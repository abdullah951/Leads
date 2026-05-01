// ── Plan configuration ──────────────────────────────────────────────────────
// Single source of truth for plan tiers, credit allocations, and Stripe price IDs.
// SERVER-SIDE ONLY — imports Env which reads process.env.
// Do NOT import in client components (SettingsView, AppTopBar, etc.).
// ────────────────────────────────────────────────────────────────────────────

import { Env } from '@/libs/Env';

// ── Plan tier type ──────────────────────────────────────────────────────────

/** All available subscription plan tiers */
export type PlanTier = 'free' | 'starter' | 'pro' | 'enterprise';

// ── Monthly credit allocations ──────────────────────────────────────────────

/**
 * Monthly credit limits for paid plans that have a credit cap.
 * Enterprise is excluded — it is unlimited (no cap).
 */
export const PLAN_MONTHLY_CREDITS: Record<'starter' | 'pro', number> = {
  starter: 60_000,  // $49/mo
  pro: 150_000,     // $79/mo
};

// ── Price ID helpers ────────────────────────────────────────────────────────

/**
 * Returns the Stripe price ID for a given plan tier.
 * Returns undefined if the env var is not configured.
 *
 * @param tier - The plan tier to look up.
 * @returns The Stripe price ID string, or undefined if not configured.
 */
export function getPriceIdForPlan(tier: PlanTier): string | undefined {
  switch (tier) {
    case 'starter':    return Env.STRIPE_PRICE_ID_STARTER;
    case 'pro':        return Env.STRIPE_PRICE_ID_PRO;
    case 'enterprise': return Env.STRIPE_PRICE_ID_ENTERPRISE;
    default:           return undefined;
  }
}

/**
 * Reverse map: given a Stripe price ID, returns the corresponding plan tier.
 * Returns undefined if the price ID is not recognised.
 *
 * @param priceId - The Stripe price ID to look up.
 * @returns The matching PlanTier, or undefined.
 */
export function getPlanForPriceId(priceId: string): PlanTier | undefined {
  if (priceId === Env.STRIPE_PRICE_ID_STARTER)    return 'starter';
  if (priceId === Env.STRIPE_PRICE_ID_PRO)        return 'pro';
  if (priceId === Env.STRIPE_PRICE_ID_ENTERPRISE) return 'enterprise';
  return undefined;
}

// ── Reset date helpers ──────────────────────────────────────────────────────

/**
 * Returns the next credit reset date for a given plan.
 * - Free plan: midnight tomorrow (UTC)
 * - Starter / Pro: 1st of next month at midnight (UTC)
 * - Enterprise: no reset needed (unlimited), but returns 1st of next month
 *
 * @param plan - The user's current plan tier.
 * @returns The Date at which credits should next reset.
 */
export function getNextResetDate(plan: PlanTier): Date {
  const now = new Date();

  if (plan === 'free') {
    // Daily reset — midnight tomorrow UTC
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  // Monthly reset — 1st of next month at midnight UTC
  const firstOfNextMonth = new Date(now);
  firstOfNextMonth.setMonth(firstOfNextMonth.getMonth() + 1);
  firstOfNextMonth.setDate(1);
  firstOfNextMonth.setHours(0, 0, 0, 0);
  return firstOfNextMonth;
}

// ── Plan classification helpers ─────────────────────────────────────────────

/**
 * Returns true if the plan has unlimited credits (no deduction, no cap).
 *
 * @param plan - The plan tier to check.
 */
export function isPlanUnlimited(plan: PlanTier): boolean {
  return plan === 'enterprise';
}

/**
 * Returns true if the plan is any paid tier (not free).
 *
 * @param plan - The plan tier to check.
 */
export function isPaidPlan(plan: PlanTier): boolean {
  return plan === 'starter' || plan === 'pro' || plan === 'enterprise';
}
