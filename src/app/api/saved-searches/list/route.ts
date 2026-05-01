import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { savedSearchSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(_request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { userId } = auth;

  const rows = await db
    .select({
      savedSearchId: savedSearchSchema.id,
      savedSearchName: savedSearchSchema.name,
      searchJson: savedSearchSchema.searchJson,
    })
    .from(savedSearchSchema)
    .where(eq(savedSearchSchema.userId, userId))
    .orderBy(savedSearchSchema.createdAt);

  return NextResponse.json(rows);
}
