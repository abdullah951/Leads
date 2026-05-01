import * as fs from 'node:fs';
import * as path from 'node:path';
import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { uploadedFileSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

/**
 * Streams a stored CSV file back to the browser as a file download.
 * Accepts: POST { id: number }
 * Returns: the CSV file with Content-Disposition: attachment so the browser saves it.
 * Security: verifies the file belongs to the authenticated user before serving.
 */
export async function POST(request: Request) {
  // Verify the user is logged in
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await request.json();

  // Validate input
  if (!id || typeof id !== 'number') {
    return NextResponse.json({ message: 'Invalid file ID' }, { status: 400 });
  }

  // Look up the file record — must belong to this user (prevents accessing other users' files)
  const rows = await db
    .select({
      filePath: uploadedFileSchema.filePath,
      filename: uploadedFileSchema.filename, // original filename for the Content-Disposition header
    })
    .from(uploadedFileSchema)
    .where(and(eq(uploadedFileSchema.id, id), eq(uploadedFileSchema.userId, auth.userId)))
    .limit(1);

  if (!rows[0]) {
    return NextResponse.json({ message: 'File not found' }, { status: 404 });
  }

  const { filePath, filename } = rows[0];

  // Make sure the file still exists on disk
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ message: 'File no longer exists on disk' }, { status: 404 });
  }

  // Read the file contents
  const buffer = fs.readFileSync(filePath);

  // Use the original filename for the download, falling back to a safe default
  const downloadName = filename || `upload-${id}.csv`;

  // Return as an attachment so the browser triggers a Save As dialog
  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      // attachment + filename tells the browser to download rather than display
      'Content-Disposition': `attachment; filename="${path.basename(downloadName)}"`,
      'Content-Length': String(buffer.length),
    },
  });
}
