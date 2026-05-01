import { and, eq, ilike } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { userListSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { userId } = auth;
  const { search = '' } = await request.json();

  const rows = await db
    .select({
      listId: userListSchema.id,
      listName: userListSchema.listName,
      lastUpdatedUTC: userListSchema.updatedAt,
    })
    .from(userListSchema)
    .where(
      and(
        eq(userListSchema.userId, userId),
        ilike(userListSchema.listName, `%${search}%`),
      ),
    )
    .orderBy(userListSchema.updatedAt)
    .limit(20);

  return NextResponse.json(rows);
}
