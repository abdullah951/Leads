import * as fs from 'node:fs';
import * as path from 'node:path';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { uploadedFileSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

const MAX_ROWS = 2000;

/**
 * Parses raw CSV text into an array of rows (each row is an array of cell strings).
 * Handles basic quoted fields. Does not handle multi-line quoted fields.
 */
function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter(line => line.trim().length > 0)
    .map(line =>
      line.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')),
    );
}

/**
 * Accepts a multipart CSV upload.
 * Parses the file, stores it on disk, creates a DB record with null column mappings,
 * and returns parsed column names + first 2 preview rows for the mapping step.
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const formData = await request.formData();
  const file = formData.get('file');
  const firstRowIsHeader = formData.get('firstRowIsHeader') !== 'false';
  const uploadName = String(formData.get('uploadName') || `Upload-${new Date().toISOString().split('T')[0]}`);

  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'No file provided' }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith('.csv')) {
    return NextResponse.json({ message: 'Only CSV files are accepted' }, { status: 400 });
  }

  const text = await file.text();
  const allRows = parseCsv(text);

  let columns: string[];
  let dataRows: string[][];

  if (firstRowIsHeader && allRows.length > 0) {
    columns = allRows[0]!;
    dataRows = allRows.slice(1, MAX_ROWS + 1);
  } else {
    // Generate generic column names
    const colCount = allRows[0]?.length ?? 0;
    columns = Array.from({ length: colCount }, (_, i) => `Column ${i + 1}`);
    dataRows = allRows.slice(0, MAX_ROWS);
  }

  // Return up to 100 preview rows so the mapping view has enough data to page through
  const previewRows = dataRows.slice(0, 100);
  const rowCount = dataRows.length;

  // Store the (possibly truncated) CSV to disk
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', String(auth.userId));
  fs.mkdirSync(uploadDir, { recursive: true });

  const safeFilename = `${Date.now()}_${file.name.replace(/[^a-z0-9._-]/gi, '_')}`;
  const filePath = path.join(uploadDir, safeFilename);

  // Write only up to MAX_ROWS data rows + header (if applicable)
  const truncatedRows = firstRowIsHeader
    ? [allRows[0]!, ...dataRows]
    : dataRows;
  const csvContent = truncatedRows.map(row => row.join(',')).join('\n');
  fs.writeFileSync(filePath, csvContent, 'utf-8');

  const [inserted] = await db
    .insert(uploadedFileSchema)
    .values({
      userId: auth.userId,
      uploadName,
      filename: file.name,
      filePath,
      firstRowIsHeader,
      rowCount,
    })
    .returning({ id: uploadedFileSchema.id });

  return NextResponse.json({
    id: inserted!.id,
    uploadName,
    columns,
    previewRows,
    rowCount,
  });
}
