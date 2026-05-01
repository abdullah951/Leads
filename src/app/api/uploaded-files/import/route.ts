import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { uploadedFileSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

/** Saves column mappings and upload name for a previously uploaded CSV file. */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { id, uploadName, emailColumn, linkedInColumn, companyNameColumn, companyWebsiteColumn } = body;

  if (!id || typeof id !== 'number') {
    return NextResponse.json({ message: 'Invalid file ID' }, { status: 400 });
  }

  const updated = await db
    .update(uploadedFileSchema)
    .set({
      uploadName: uploadName || `Upload-${new Date().toISOString().split('T')[0]}`,
      emailColumn: typeof emailColumn === 'number' ? emailColumn : null,
      linkedInColumn: typeof linkedInColumn === 'number' ? linkedInColumn : null,
      companyNameColumn: typeof companyNameColumn === 'number' ? companyNameColumn : null,
      companyWebsiteColumn: typeof companyWebsiteColumn === 'number' ? companyWebsiteColumn : null,
    })
    .where(and(eq(uploadedFileSchema.id, id), eq(uploadedFileSchema.userId, auth.userId)))
    .returning({ id: uploadedFileSchema.id });

  if (!updated[0]) {
    return NextResponse.json({ message: 'File not found' }, { status: 404 });
  }

  return NextResponse.json({ id: updated[0].id });
}
