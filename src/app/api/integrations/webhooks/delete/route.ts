// POST /api/integrations/webhooks/delete
// Deletes a webhook owned by the current user.
// Body: { id: number }
// Response: { ok: true }

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

  // Validate the id field
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  // Delete the row — AND userId ensures users can only delete their own webhooks
  await db
    .delete(userWebhookSchema)
    .where(and(eq(userWebhookSchema.id, id), eq(userWebhookSchema.userId, userId)));

  return NextResponse.json({ ok: true });
}
