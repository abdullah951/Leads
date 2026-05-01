import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { userListSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { userId } = auth;
  const { listName } = await request.json();
  console.log('Creating list with name:', listName);
  if (!listName?.trim()) {
    return NextResponse.json({ message: 'List name is required' }, { status: 422 });
  }

  const [list] = await db
    .insert(userListSchema)
    .values({ userId, listName: listName.trim() })
    .returning({ listId: userListSchema.id, listName: userListSchema.listName });

  return NextResponse.json(list);
}
