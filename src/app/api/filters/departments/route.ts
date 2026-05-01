import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { departmentSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(_request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const rows = await db
    .select({ id: departmentSchema.id, label: departmentSchema.name })
    .from(departmentSchema)
    .orderBy(departmentSchema.name);

  return NextResponse.json(rows);
}
