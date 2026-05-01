// POST /api/integrations/status
// Returns which integrations the current user has connected, their sync settings,
// webhook endpoint count, and which coming-soon providers they've notified for.
// Response: { connected: string[]; settings: Record<string,unknown>; webhooks: number; notified: string[] }

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/libs/DB';
import {
  userIntegrationSchema,
  integrationNotifySchema,
  userWebhookSchema,
} from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST() {
  // Require authentication
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  // Fetch all three datasets in parallel to minimise latency
  const [integrations, notifyRows, webhookRows] = await Promise.all([
    // Connected OAuth integrations for this user
    db
      .select({
        provider: userIntegrationSchema.provider,
        settings: userIntegrationSchema.settings,
      })
      .from(userIntegrationSchema)
      .where(eq(userIntegrationSchema.userId, userId)),

    // Coming-soon notify-me entries for this user
    db
      .select({ provider: integrationNotifySchema.provider })
      .from(integrationNotifySchema)
      .where(eq(integrationNotifySchema.userId, userId)),

    // Webhook endpoints registered by this user (count only)
    db
      .select({ id: userWebhookSchema.id })
      .from(userWebhookSchema)
      .where(eq(userWebhookSchema.userId, userId)),
  ]);

  return NextResponse.json({
    // List of provider names that are connected
    connected: integrations.map(i => i.provider),
    // Per-provider settings objects, keyed by provider name
    settings: Object.fromEntries(
      integrations.map(i => [
        i.provider,
        JSON.parse(i.settings || '{}') as Record<string, unknown>,
      ]),
    ),
    // Total number of webhook endpoints configured
    webhooks: webhookRows.length,
    // Providers the user has opted into notifications for
    notified: notifyRows.map(r => r.provider),
  });
}
