import fs from 'node:fs/promises';
import path from 'node:path';
import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import * as z from 'zod';
import { db } from '@/libs/DB';
import { exportJobSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

// ── Validation ─────────────────────────────────────────────────────────────────

const bodySchema = z.object({
  jobId: z.number().int().positive(),
});

/**
 * POST /api/export-jobs/delete
 *
 * Deletes an export job row from the DB and removes the associated CSV file
 * from the local filesystem (/public/exports/).
 *
 * Only the owner (userId match) can delete their own export jobs.
 * The file deletion is best-effort: if the file is already gone, the DB row
 * is still deleted and a success response is returned.
 *
 * Body: { jobId: number }
 * Returns: { deleted: true }
 */
export async function POST(request: Request) {
  // Authenticate
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { userId } = auth;

  const json = await request.json();
  const parse = bodySchema.safeParse(json);
  if (!parse.success) {
    return NextResponse.json({ message: 'Invalid input' }, { status: 422 });
  }

  const { jobId } = parse.data;

  // ── Load the job row — needed to get downloadUrl before deleting ────────────
  const [job] = await db
    .select({ downloadUrl: exportJobSchema.downloadUrl })
    .from(exportJobSchema)
    .where(
      and(
        eq(exportJobSchema.id, jobId),
        // Ownership check — prevents one user deleting another's export
        eq(exportJobSchema.userId, userId),
      ),
    )
    .limit(1);

  if (!job) {
    // Row not found or belongs to a different user
    return NextResponse.json({ message: 'Export job not found' }, { status: 404 });
  }

  // ── Delete the local file if a downloadUrl is stored ──────────────────────
  // downloadUrl is a public path like "/exports/export-123.csv".
  // We map it to an absolute filesystem path under /public/.
  if (job.downloadUrl) {
    try {
      // Strip the leading "/" and build the absolute path to the public file
      const relativePath = job.downloadUrl.replace(/^\//, '');
      const absolutePath = path.join(process.cwd(), 'public', relativePath);
      await fs.unlink(absolutePath);
    } catch {
      // Best-effort: if the file is missing or access is denied, continue.
      // The DB row still gets deleted so the UI stays in sync.
    }
  }

  // ── Delete the DB row ─────────────────────────────────────────────────────
  await db
    .delete(exportJobSchema)
    .where(
      and(
        eq(exportJobSchema.id, jobId),
        eq(exportJobSchema.userId, userId),
      ),
    );

  return NextResponse.json({ deleted: true });
}
