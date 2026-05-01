// ── FireWebhooks ──────────────────────────────────────────────────────────────
// Utility that fetches all active webhooks for a user that subscribe to a given
// event, then fires them all in parallel as HTTP POSTs.
//
// Called fire-and-forget (wrapped in .catch()) from the reveal and export routes
// so webhook failures never block the API response.
//
// Usage:
//   fireWebhooks(userId, 'lead.revealed', { personIds, leads }).catch(() => {});
// ─────────────────────────────────────────────────────────────────────────────

import { eq } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { userWebhookSchema } from '@/models/Schema';

/**
 * Fires all active webhooks for the user that subscribe to the given event.
 * Each webhook receives a POST with JSON body: { event, timestamp, data }.
 * If a webhook has a secret, it's sent as the X-WarpLeads-Secret header.
 *
 * @param userId - The user whose webhooks to fire.
 * @param event - The event name, e.g. 'lead.revealed' or 'lead.exported'.
 * @param data - The event payload to include in the POST body.
 */
export async function fireWebhooks(
  userId: number,
  event: string,
  // data is typed as Record<string, unknown> so downstream consumers (PushToCrm) can use it directly
  data: Record<string, unknown>,
): Promise<void> {
  // Fetch all active webhooks for this user
  const webhooks = await db
    .select({
      id: userWebhookSchema.id,
      url: userWebhookSchema.url,
      secret: userWebhookSchema.secret,
      events: userWebhookSchema.events,
    })
    .from(userWebhookSchema)
    .where(eq(userWebhookSchema.userId, userId));

  // Filter to only those subscribed to this specific event
  const relevant = webhooks.filter(w =>
    w.events.split(',').map(e => e.trim()).includes(event),
  );

  // Nothing to fire — return early
  if (relevant.length === 0) return;

  // Build the common JSON payload sent to all endpoints
  const payload = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data,
  });

  // Fire all webhooks in parallel — errors per-webhook are logged but not thrown
  await Promise.allSettled(
    relevant.map(async (wh) => {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'WarpLeads-Webhook/1.0',
        };

        // Attach secret header for HMAC verification if configured
        if (wh.secret) {
          headers['X-WarpLeads-Secret'] = wh.secret;
        }

        const res = await fetch(wh.url, {
          method: 'POST',
          headers,
          body: payload,
          // 10-second timeout — don't wait forever for slow endpoints
          signal: AbortSignal.timeout(10_000),
        });

        if (!res.ok) {
          console.warn(`[webhook] ${wh.url} responded ${res.status}`);
        }
      } catch (err) {
        console.warn(`[webhook] Failed to deliver to ${wh.url}:`, err);
      }
    }),
  );

  // ── CRM push ────────────────────────────────────────────────────────────────
  // After firing webhooks, also push to any CRM integrations the user has connected.
  // We only push on lead.revealed — exported leads are already captured in that event.
  if (event === 'lead.revealed') {
    // Dynamic import avoids circular dependencies and keeps the CRM logic isolated
    const { pushToCrm } = await import('@/utils/PushToCrm');
    // Fire-and-forget — CRM failures must never propagate back to the caller
    await pushToCrm(userId, data as Record<string, unknown>).catch((err: unknown) =>
      console.warn('[fireWebhooks] pushToCrm failed:', err),
    );
  }
}
