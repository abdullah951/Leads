import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { savedSearchSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { userId } = auth;
  const { name, searchJson } = await request.json();

  if (!name?.trim() || !searchJson) {
    return NextResponse.json({ message: 'name and searchJson are required' }, { status: 422 });
  }

  const [saved] = await db
    .insert(savedSearchSchema)
    .values({ userId, name: name.trim(), searchJson })
    .returning({ savedSearchId: savedSearchSchema.id });

  return NextResponse.json(saved);
}
