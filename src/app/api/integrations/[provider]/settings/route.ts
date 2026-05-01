// POST /api/integrations/[provider]/settings
// Saves sync settings for a connected integration.
// Body: { settings: Record<string, unknown> }
// Response: { ok: true }

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { userIntegrationSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  // Require authentication
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const { provider } = await params;
  const body = await req.json() as { settings?: Record<string, unknown> };

  // Serialise the settings object to JSON and persist it on the integration row
  await db
    .update(userIntegrationSchema)
    .set({
      settings: JSON.stringify(body.settings ?? {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(userIntegrationSchema.userId, userId),
        eq(userIntegrationSchema.provider, provider),
      ),
    );

  return NextResponse.json({ ok: true });
}
