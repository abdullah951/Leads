import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { companySizeSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(_request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const rows = await db
    .select({ id: companySizeSchema.id, label: companySizeSchema.label })
    .from(companySizeSchema)
    .orderBy(companySizeSchema.id);

  return NextResponse.json(rows);
}
