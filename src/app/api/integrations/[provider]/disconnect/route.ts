// POST /api/integrations/[provider]/disconnect
// Removes the OAuth connection row for the given provider.
// After this the user must re-authorise to reconnect.

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { userIntegrationSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  // Require authentication
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const { provider } = await params;

  // Delete the integration row — AND userId ensures users can only remove their own
  await db
    .delete(userIntegrationSchema)
    .where(
      and(
        eq(userIntegrationSchema.userId, userId),
        eq(userIntegrationSchema.provider, provider),
      ),
    );

  return NextResponse.json({ ok: true });
}
