// ── POST /api/stripe/webhook ──────────────────────────────────────────────
// Receives Stripe events and updates DB accordingly.
//
// Handled events:
//   checkout.session.completed   — new subscription created; activate plan + add credits
//   customer.subscription.updated — plan changed or cancel_at_period_end toggled
//   customer.subscription.deleted — subscription ended; drop to free + reset credits
// ─────────────────────────────────────────────────────────────────────────

import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Env } from '@/libs/Env';
import { db } from '@/libs/DB';
import { userCreditSchema, userSubscriptionSchema } from '@/models/Schema';
import {
  getPlanForPriceId,
  getNextResetDate,
  isPlanUnlimited,
  PLAN_MONTHLY_CREDITS,
  type PlanTier,
} from '@/constants/planConfig';

// ── Type helper ───────────────────────────────────────────────────────────
// Stripe SDK v17+ removed these fields from the TS type, but they are still
// present in the API response. This interface lets us access them safely.
interface StripeSubscriptionWithPeriod extends Stripe.Subscription {
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
}

export async function POST(request: Request) {
  // ── Debug: log every incoming webhook hit ───────────────────────────────
  console.log('[webhook] POST received');

  if (!Env.STRIPE_SECRET_KEY || !Env.STRIPE_WEBHOOK_SECRET) {
    console.log('[webhook] 503 — Stripe not configured');
    return NextResponse.json({ message: 'Stripe not configured' }, { status: 503 });
  }

  const stripe = new Stripe(Env.STRIPE_SECRET_KEY);
  const body = await request.text();
  const headersList = await headers();
  const sig = headersList.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ message: 'Missing signature' }, { status: 400 });
  }

  // ── Verify webhook signature ────────────────────────────────────────────
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, Env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log('[webhook] 400 — Invalid signature:', err);
    return NextResponse.json({ message: 'Invalid signature' }, { status: 400 });
  }

  console.log('[webhook] event type:', event.type);

  switch (event.type) {

    // ── New subscription purchased ─────────────────────────────────────────
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;

      // planTier was stored in metadata when creating the checkout session
      const userId = Number.parseInt(session.metadata?.userId ?? '', 10);
      const planTier = session.metadata?.planTier as PlanTier | undefined;

      console.log('[webhook] checkout.session.completed — userId:', userId, 'planTier:', planTier, 'metadata:', session.metadata);
      console.log('[webhook] subscription:', session.subscription, 'customer:', session.customer);

      if (!userId || !session.subscription || !session.customer || !planTier) {
        console.log('[webhook] BREAKING — missing required field. userId:', userId, 'planTier:', planTier, 'subscription:', session.subscription, 'customer:', session.customer);
        break;
      }

      // Retrieve full subscription to get billing period dates.
      // Expand latest_invoice so we can fall back to invoice period if the
      // top-level current_period_* fields are absent (Stripe API ≥ 2025).
      const sub = (await stripe.subscriptions.retrieve(
        String(session.subscription),
        { expand: ['latest_invoice'] },
      )) as unknown as StripeSubscriptionWithPeriod;

      // ── Update subscription record ───────────────────────────────────────
      // Safely parse period timestamps — guard against undefined in newer Stripe API versions
      const periodStart = sub.current_period_start
        ? new Date(sub.current_period_start * 1000)
        : null;
      const periodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000)
        : null;

      console.log('[webhook] period start:', periodStart, 'period end:', periodEnd);

      const subUpdateResult = await db
        .update(userSubscriptionSchema)
        .set({
          plan: planTier,
          stripeCustomerId: String(session.customer),
          stripeSubscriptionId: String(session.subscription),
          status: sub.status,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
          updatedAt: new Date(),
        })
        .where(eq(userSubscriptionSchema.userId, userId))
        .returning();

      console.log('[webhook] subscription updated:', subUpdateResult);

      // ── Update credits ───────────────────────────────────────────────────
      if (!isPlanUnlimited(planTier)) {
        const [credit] = await db
          .select({ remaining: userCreditSchema.remaining })
          .from(userCreditSchema)
          .where(eq(userCreditSchema.userId, userId))
          .limit(1);

        console.log('[webhook] current credit row:', credit);

        const newPlanCredits = PLAN_MONTHLY_CREDITS[planTier as 'starter' | 'pro'];
        const newRemaining = (credit?.remaining ?? 0) + newPlanCredits;
        const nextReset = getNextResetDate(planTier);

        const creditUpdateResult = await db
          .update(userCreditSchema)
          .set({
            remaining: newRemaining,
            dailyLimit: newPlanCredits,
            resetsAt: nextReset,
            updatedAt: new Date(),
          })
          .where(eq(userCreditSchema.userId, userId))
          .returning();

        console.log('[webhook] credit updated:', creditUpdateResult);
      }

      break;
    }

    // ── Subscription changed (plan upgrade, downgrade, or cancel toggle) ───
    case 'customer.subscription.updated': {
      const sub = event.data.object as unknown as StripeSubscriptionWithPeriod;

      // Determine the plan tier from the subscription's price ID
      const priceId = sub.items?.data?.[0]?.price?.id;
      const planTier: PlanTier = (priceId ? getPlanForPriceId(priceId) : undefined) ?? 'free';

      // Only mark as active plan if subscription status allows it
      const activePlan = (sub.status === 'active' || sub.status === 'trialing')
        ? planTier
        : 'free';

      await db
        .update(userSubscriptionSchema)
        .set({
          plan: activePlan,
          status: sub.status,
          currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000) : null,
          currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
          cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
          updatedAt: new Date(),
        })
        .where(eq(userSubscriptionSchema.stripeSubscriptionId, sub.id));

      break;
    }

    // ── Subscription fully ended (period expired after cancel) ───────────
    case 'customer.subscription.deleted': {
      const sub = event.data.object as unknown as StripeSubscriptionWithPeriod;

      // Find the user by subscription ID before wiping it
      const [existing] = await db
        .select({ userId: userSubscriptionSchema.userId })
        .from(userSubscriptionSchema)
        .where(eq(userSubscriptionSchema.stripeSubscriptionId, sub.id))
        .limit(1);

      if (!existing) break;

      // Drop plan to free
      await db
        .update(userSubscriptionSchema)
        .set({
          plan: 'free',
          status: 'canceled',
          stripeSubscriptionId: null,
          cancelAtPeriodEnd: false,
          updatedAt: new Date(),
        })
        .where(eq(userSubscriptionSchema.stripeSubscriptionId, sub.id));

      // Reset credits back to free tier: 20/day, resets tomorrow midnight
      const tomorrow = getNextResetDate('free');
      await db
        .update(userCreditSchema)
        .set({
          remaining: 20,
          dailyLimit: 20,
          resetsAt: tomorrow,
          updatedAt: new Date(),
        })
        .where(eq(userCreditSchema.userId, existing.userId));

      break;
    }
  }

  return NextResponse.json({ received: true });
}
