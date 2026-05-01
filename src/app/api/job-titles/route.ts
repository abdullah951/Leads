import { ilike } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { jobTitleSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  // Accept both `query` (new) and `q` (legacy) so nothing else breaks
  const body = await request.json();
  const q: string = body.query ?? body.q ?? '';
  const limit: number = body.limit ?? 20;

  const rows = await db
    .select({ id: jobTitleSchema.id, label: jobTitleSchema.title })
    .from(jobTitleSchema)
    .where(ilike(jobTitleSchema.title, `%${q}%`))
    .limit(limit);

  return NextResponse.json(rows);
}
