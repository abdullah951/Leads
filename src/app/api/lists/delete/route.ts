import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { userListSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { userId } = auth;
  const { listId } = await request.json();

  if (!listId) {
    return NextResponse.json({ message: 'listId is required' }, { status: 422 });
  }

  const deleted = await db
    .delete(userListSchema)
    .where(and(eq(userListSchema.id, listId), eq(userListSchema.userId, userId)))
    .returning({ id: userListSchema.id });

  if (!deleted.length) {
    return NextResponse.json({ message: 'List not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
