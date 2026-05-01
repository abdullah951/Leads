import * as fs from 'node:fs';
import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { uploadedFileSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

/** Deletes an uploaded CSV file from disk and removes its DB record. */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await request.json();

  if (!id || typeof id !== 'number') {
    return NextResponse.json({ message: 'Invalid file ID' }, { status: 400 });
  }

  const rows = await db
    .select({ filePath: uploadedFileSchema.filePath })
    .from(uploadedFileSchema)
    .where(and(eq(uploadedFileSchema.id, id), eq(uploadedFileSchema.userId, auth.userId)))
    .limit(1);

  if (!rows[0]) {
    return NextResponse.json({ message: 'File not found' }, { status: 404 });
  }

  // Delete from disk (ignore if already missing)
  try { fs.unlinkSync(rows[0].filePath); } catch {}

  await db
    .delete(uploadedFileSchema)
    .where(and(eq(uploadedFileSchema.id, id), eq(uploadedFileSchema.userId, auth.userId)));

  return NextResponse.json({ ok: true });
}
