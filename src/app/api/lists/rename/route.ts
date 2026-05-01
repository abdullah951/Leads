import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { userListSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { userId } = auth;
  const { listId, listName } = await request.json();

  if (!listId || !listName?.trim()) {
    return NextResponse.json({ message: 'listId and listName are required' }, { status: 422 });
  }

  const [updated] = await db
    .update(userListSchema)
    .set({ listName: listName.trim(), updatedAt: new Date() })
    .where(and(eq(userListSchema.id, listId), eq(userListSchema.userId, userId)))
    .returning({ listId: userListSchema.id, listName: userListSchema.listName });

  if (!updated) {
    return NextResponse.json({ message: 'List not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
