// POST /api/integrations/webhooks/test
// Sends a test ping payload to a webhook endpoint to verify it's reachable.
// Body: { id: number }
// Response: { ok: boolean; status?: number; error?: string }

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { userWebhookSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(req: Request) {
  // Verify the user is authenticated
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await req.json() as { id?: number };
  const id = Number(body.id);
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  // Fetch the webhook and verify ownership in the same query
  const [webhook] = await db
    .select()
    .from(userWebhookSchema)
    .where(and(eq(userWebhookSchema.id, id), eq(userWebhookSchema.userId, userId)))
    .limit(1);

  if (!webhook) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Build the test payload — mimics a real lead.revealed event shape
  const testPayload = JSON.stringify({
    event: 'test.ping',
    timestamp: new Date().toISOString(),
    data: {
      message: 'This is a test ping from WarpLeads',
      personId: 0,
      workEmail: 'test@example.com',
      personalEmail: null,
      phone1: '+1 555 000 0000',
    },
  });

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'WarpLeads-Webhook/1.0',
    };

    // Include the secret header if one is configured on this webhook
    if (webhook.secret) headers['X-WarpLeads-Secret'] = webhook.secret;

    const res = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: testPayload,
      // 10-second timeout to avoid blocking the UI for too long
      signal: AbortSignal.timeout(10_000),
    });

    return NextResponse.json({ ok: res.ok, status: res.status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg });
  }
}
