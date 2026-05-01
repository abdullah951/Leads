import fs from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { exportJobSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

/**
 * POST /api/export-jobs/delete-all
 *
 * Deletes ALL export job rows for the current user from the DB and removes
 * the associated CSV files from the local filesystem (/public/exports/).
 *
 * File deletions are best-effort: if a file is already gone, the DB row is
 * still deleted and a success response is returned.
 *
 * Body: {} (empty — user is identified via JWT cookie)
 * Returns: { deleted: number } — count of rows removed
 */
export async function POST() {
  // ── Authenticate ──────────────────────────────────────────────────────────
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { userId } = auth;

  // ── Fetch all export jobs for this user — need downloadUrls to delete files
  const jobs = await db
    .select({ id: exportJobSchema.id, downloadUrl: exportJobSchema.downloadUrl })
    .from(exportJobSchema)
    .where(eq(exportJobSchema.userId, userId));

  if (jobs.length === 0) {
    // Nothing to delete — respond immediately
    return NextResponse.json({ deleted: 0 });
  }

  // ── Delete each file from the filesystem (best-effort, parallel) ──────────
  await Promise.allSettled(
    jobs
      .filter(j => j.downloadUrl)
      .map(async (j) => {
        try {
          // downloadUrl is a public path like "/exports/export-123.csv"
          // strip leading "/" and resolve to absolute path under /public/
          const relativePath = j.downloadUrl!.replace(/^\//, '');
          const absolutePath = path.join(process.cwd(), 'public', relativePath);
          await fs.unlink(absolutePath);
        } catch {
          // File already missing or permission error — ignore, continue with DB delete
        }
      }),
  );

  // ── Delete all DB rows for this user in one query ─────────────────────────
  await db
    .delete(exportJobSchema)
    .where(eq(exportJobSchema.userId, userId));

  return NextResponse.json({ deleted: jobs.length });
}
