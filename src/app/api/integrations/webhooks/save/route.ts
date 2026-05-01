// POST /api/integrations/webhooks/save
// Creates or updates a webhook endpoint.
// Body: { id?: number; name: string; url: string; secret?: string; events: string }
// Response: { id: number }

import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { userWebhookSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(req: Request) {
  // Verify the user is authenticated
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await req.json() as {
    id?: number;
    name?: string;
    url?: string;
    secret?: string;
    events?: string;
  };

  // Validate URL — must be present and start with http:// or https://
  const url = (body.url ?? '').trim();
  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    return NextResponse.json({ error: 'A valid URL is required' }, { status: 400 });
  }

  // Sanitise the other fields with sensible defaults
  const name = (body.name ?? '').trim() || 'Unnamed webhook';
  const events = (body.events ?? 'lead.revealed').trim() || 'lead.revealed';
  const secret = (body.secret ?? '').trim() || null;

  if (body.id) {
    // Update path — verify ownership before mutating
    const [existing] = await db
      .select({ id: userWebhookSchema.id })
      .from(userWebhookSchema)
      .where(and(eq(userWebhookSchema.id, body.id), eq(userWebhookSchema.userId, userId)))
      .limit(1);

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Update the row and bump updatedAt
    await db
      .update(userWebhookSchema)
      .set({ name, url, secret, events, updatedAt: new Date() })
      .where(eq(userWebhookSchema.id, body.id));

    return NextResponse.json({ id: body.id });
  }

  // Insert path — create a new webhook row
  const [inserted] = await db
    .insert(userWebhookSchema)
    .values({ userId, name, url, secret, events })
    .returning({ id: userWebhookSchema.id });

  return NextResponse.json({ id: inserted!.id });
}
