import { desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { exportJobSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(_request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { userId } = auth;

  const rows = await db
    .select({
      jobId: exportJobSchema.id,
      type: exportJobSchema.status, // always 'export'
      createdAt: exportJobSchema.createdAt,
      status: exportJobSchema.status,
      error: exportJobSchema.error,
      downloadUrl: exportJobSchema.downloadUrl,
    })
    .from(exportJobSchema)
    .where(eq(exportJobSchema.userId, userId))
    .orderBy(desc(exportJobSchema.createdAt));

  return NextResponse.json(
    rows.map(r => ({ ...r, type: 'export' })),
  );
}
