import { ilike } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { technologySchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const q: string = body.query ?? body.q ?? '';
  const limit: number = body.limit ?? 20;

  const rows = await db
    .select({ id: technologySchema.id, label: technologySchema.name })
    .from(technologySchema)
    .where(ilike(technologySchema.name, `%${q ?? ''}%`))
    .limit(limit);

  return NextResponse.json(rows);
}
