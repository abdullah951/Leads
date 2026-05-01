// ── POST /api/settings/billing-portal ────────────────────────────────────────
// Creates a Stripe Billing Portal session for the current user and returns
// the redirect URL. The client should do window.location.href = url.
// Response: { url: string }
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { Env } from '@/libs/Env';
import { db } from '@/libs/DB';
import { userSubscriptionSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST() {
  // Authenticate
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  // Stripe must be configured
  if (!Env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const stripe = new Stripe(Env.STRIPE_SECRET_KEY);

  // Look up the user's Stripe customer ID from their subscription row
  const [sub] = await db
    .select({ stripeCustomerId: userSubscriptionSchema.stripeCustomerId })
    .from(userSubscriptionSchema)
    .where(eq(userSubscriptionSchema.userId, userId))
    .limit(1);

  if (!sub?.stripeCustomerId) {
    return NextResponse.json({ error: 'No billing account found. Subscribe first.' }, { status: 404 });
  }

  const appUrl = Env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  // Create the portal session — user is redirected here from the client
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    // Return the user to Settings after they finish in the portal
    return_url: `${appUrl}/settings`,
  });

  return NextResponse.json({ url: session.url });
}
