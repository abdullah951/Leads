import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { managementLevelSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(_request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const rows = await db
    .select({ id: managementLevelSchema.id, label: managementLevelSchema.name })
    .from(managementLevelSchema)
    .orderBy(managementLevelSchema.name);

  return NextResponse.json(rows);
}
