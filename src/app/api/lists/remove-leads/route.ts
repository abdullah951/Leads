import { and, eq, inArray } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { listLeadSchema, userListSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { userId } = auth;
  const { lists, selectedPersons }: { lists: number[]; selectedPersons: number[] } =
    await request.json();

  if (!lists?.length || !selectedPersons?.length) {
    return NextResponse.json({ message: 'lists and selectedPersons are required' }, { status: 422 });
  }

  // Verify lists belong to this user
  const ownedLists = await db
    .select({ id: userListSchema.id })
    .from(userListSchema)
    .where(and(eq(userListSchema.userId, userId), inArray(userListSchema.id, lists)));

  const ownedListIds = ownedLists.map(l => l.id);
  if (!ownedListIds.length) {
    return NextResponse.json({ message: 'No valid lists found' }, { status: 404 });
  }

  await db
    .delete(listLeadSchema)
    .where(
      and(
        inArray(listLeadSchema.listId, ownedListIds),
        inArray(listLeadSchema.leadId, selectedPersons),
      ),
    );

  await db
    .update(userListSchema)
    .set({ updatedAt: new Date() })
    .where(inArray(userListSchema.id, ownedListIds));

  return NextResponse.json({ ok: true });
}
