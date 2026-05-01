import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { uploadedFileSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

/**
 * Returns CSV files uploaded by the authenticated user, newest first.
 * Accepts an optional `columnType` body param ('email' | 'linkedin') to filter
 * to only files that have the relevant column mapped. Also returns `emailColumn`
 * and `linkedInColumn` so the client knows which columns are available.
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  // Parse optional columnType from request body
  let columnType: 'email' | 'linkedin' | undefined;
  try {
    const body = await request.json();
    if (body?.columnType === 'email' || body?.columnType === 'linkedin') {
      columnType = body.columnType;
    }
  } catch {
    // Body may be empty or malformed — treat as no filter
  }

  // Build optional column-presence condition:
  // - 'email'    → emailColumn IS NOT NULL
  // - 'linkedin' → linkedInColumn IS NOT NULL
  // - undefined  → no extra condition
  const columnFilter
    = columnType === 'email'
      ? isNotNull(uploadedFileSchema.emailColumn)
      : columnType === 'linkedin'
        ? isNotNull(uploadedFileSchema.linkedInColumn)
        : undefined;

  // Combine ownership check with optional column filter using `and()`
  const whereClause = columnFilter
    ? and(eq(uploadedFileSchema.userId, auth.userId), columnFilter)
    : eq(uploadedFileSchema.userId, auth.userId);

  const files = await db
    .select({
      id: uploadedFileSchema.id,
      uploadName: uploadedFileSchema.uploadName,
      filename: uploadedFileSchema.filename,
      rowCount: uploadedFileSchema.rowCount,
      createdAt: uploadedFileSchema.createdAt,
      // Include column indices so client can know what's available
      emailColumn: uploadedFileSchema.emailColumn,
      linkedInColumn: uploadedFileSchema.linkedInColumn,
    })
    .from(uploadedFileSchema)
    .where(whereClause)
    .orderBy(desc(uploadedFileSchema.createdAt));

  return NextResponse.json(files);
}
