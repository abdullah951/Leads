import { eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { listLeadSchema, userListSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(_request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { userId } = auth;

  const rows = await db
    .select({
      // Use field names that all consumers (Sidebar, BulkToolbar, LeadsListsView) expect
      id: userListSchema.id,
      label: userListSchema.listName,
      count: sql<number>`COUNT(${listLeadSchema.id})`,
      createdAt: userListSchema.createdAt,
    })
    .from(userListSchema)
    .leftJoin(listLeadSchema, eq(listLeadSchema.listId, userListSchema.id))
    .where(eq(userListSchema.userId, userId))
    .groupBy(userListSchema.id)
    .orderBy(sql`${userListSchema.createdAt} DESC`);

  return NextResponse.json(rows);
}
