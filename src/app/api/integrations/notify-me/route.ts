// POST /api/integrations/notify-me
// Idempotently registers interest in a coming-soon integration.
// If the row already exists, returns { ok: true, already: true } without error.
// Body: { provider: string }
// Response: { ok: true; already: boolean }

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { integrationNotifySchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(req: Request) {
  // Require authentication
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await req.json() as { provider?: string };

  // Normalise provider to lowercase and strip whitespace
  const provider = (body.provider ?? '').trim().toLowerCase();
  if (!provider) {
    return NextResponse.json({ error: 'provider is required' }, { status: 400 });
  }

  // Check if the user has already registered interest in this provider
  const [existing] = await db
    .select({ id: integrationNotifySchema.id })
    .from(integrationNotifySchema)
    .where(
      and(
        eq(integrationNotifySchema.userId, userId),
        eq(integrationNotifySchema.provider, provider),
      ),
    )
    .limit(1);

  // Return idempotent success if already registered — no duplicate insert
  if (existing) {
    return NextResponse.json({ ok: true, already: true });
  }

  // Insert a new notify-me row for this user+provider
  await db.insert(integrationNotifySchema).values({ userId, provider });
  return NextResponse.json({ ok: true, already: false });
}
