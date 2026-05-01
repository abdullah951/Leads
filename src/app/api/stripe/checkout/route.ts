// ── POST /api/stripe/checkout ─────────────────────────────────────────────
// Creates a Stripe Checkout session for a specific plan tier.
// Body: { planTier: 'starter' | 'pro' | 'enterprise' }
// Returns: { url: string } — redirect to Stripe-hosted checkout page.
// ─────────────────────────────────────────────────────────────────────────

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Env } from '@/libs/Env';
import { db } from '@/libs/DB';
import { userSubscriptionSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';
import { getPriceIdForPlan, type PlanTier } from '@/constants/planConfig';

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  // ── Parse and validate the requested plan tier ──────────────────────────
  const body = await request.json() as { planTier?: string };
  const planTier = body.planTier as PlanTier | undefined;

  // Only paid tiers are valid for checkout
  if (!planTier || !['starter', 'pro', 'enterprise'].includes(planTier)) {
    return NextResponse.json({ message: 'Invalid plan tier' }, { status: 400 });
  }

  if (!Env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ message: 'Stripe not configured' }, { status: 503 });
  }

  // Look up the Stripe price ID for the requested plan
  const priceId = getPriceIdForPlan(planTier);
  if (!priceId) {
    return NextResponse.json({ message: `Stripe price not configured for plan: ${planTier}` }, { status: 503 });
  }

  const stripe = new Stripe(Env.STRIPE_SECRET_KEY);
  const { userId, email } = auth;

  const appUrl = Env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  // ── Reuse existing Stripe customer if the user has one ──────────────────
  const [existing] = await db
    .select({ stripeCustomerId: userSubscriptionSchema.stripeCustomerId })
    .from(userSubscriptionSchema)
    .where(eq(userSubscriptionSchema.userId, userId))
    .limit(1);

  const customer = existing?.stripeCustomerId
    ?? (await stripe.customers.create({ email })).id;

  // ── Create checkout session ──────────────────────────────────────────────
  console.log('[checkout] creating session — userId:', userId, 'planTier:', planTier, 'priceId:', priceId);
  // Store userId + planTier in metadata so the webhook knows which user/plan to activate.
  const session = await stripe.checkout.sessions.create({
    customer,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?checkout=success`,
    cancel_url: `${appUrl}/dashboard?checkout=cancelled`,
    // Both userId and planTier are needed in the webhook handler
    metadata: { userId: String(userId), planTier },
  });

  return NextResponse.json({ url: session.url });
}
