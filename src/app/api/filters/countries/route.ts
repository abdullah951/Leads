import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { countrySchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(_request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const rows = await db
    .select({ id: countrySchema.id, label: countrySchema.name })
    .from(countrySchema)
    .orderBy(countrySchema.name);

  return NextResponse.json(rows);
}
