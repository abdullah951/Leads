import { and, eq, inArray } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { listLeadSchema, userListSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { userId } = auth;
  const body = await request.json();
  const { lists, selectedPersons, deselectedPersons = [] }: {
    lists: number[];
    selectedPersons: number[];
    deselectedPersons?: number[];
  } = body;

  if (!lists?.length) {
    return NextResponse.json({ message: 'lists is required' }, { status: 422 });
  }

  // Verify the lists belong to this user
  const ownedLists = await db
    .select({ id: userListSchema.id })
    .from(userListSchema)
    .where(and(eq(userListSchema.userId, userId), inArray(userListSchema.id, lists)));

  const ownedListIds = ownedLists.map(l => l.id);
  if (!ownedListIds.length) {
    return NextResponse.json({ message: 'No valid lists found' }, { status: 404 });
  }

  const deselectedSet = new Set(deselectedPersons);
  const personIds = selectedPersons.filter(id => !deselectedSet.has(id));

  if (!personIds.length) {
    return NextResponse.json({ ok: true });
  }

  // Insert rows, ignoring duplicates via onConflictDoNothing if available
  const values = ownedListIds.flatMap(listId =>
    personIds.map(leadId => ({ listId, leadId })),
  );

  await db.insert(listLeadSchema).values(values);

  // Update updatedAt for the lists
  await db
    .update(userListSchema)
    .set({ updatedAt: new Date() })
    .where(inArray(userListSchema.id, ownedListIds));

  return NextResponse.json({ ok: true });
}
