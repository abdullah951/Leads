import { eq, ilike } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { citySchema, countrySchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const q: string = body.query ?? body.q ?? '';
  const limit: number = body.limit ?? 20;

  const rows = await db
    .select({
      id: citySchema.id,
      cityName: citySchema.name,
      countryName: countrySchema.name,
    })
    .from(citySchema)
    .leftJoin(countrySchema, eq(citySchema.countryId, countrySchema.id))
    .where(ilike(citySchema.name, `%${q ?? ''}%`))
    .limit(limit);

  return NextResponse.json(
    rows.map(r => ({
      id: r.id,
      label: r.countryName ? `${r.cityName}, ${r.countryName}` : r.cityName,
    })),
  );
}
