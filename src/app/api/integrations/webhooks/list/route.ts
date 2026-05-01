// POST /api/integrations/webhooks/list
// Returns all webhooks for the current user.
// Response: { webhooks: WebhookRow[] }

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { userWebhookSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST() {
  // Verify the user is authenticated
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  // Fetch all webhooks for this user, ordered by creation time (oldest first)
  const webhooks = await db
    .select()
    .from(userWebhookSchema)
    .where(eq(userWebhookSchema.userId, userId))
    .orderBy(userWebhookSchema.createdAt);

  return NextResponse.json({ webhooks });
}
