import { and, eq, inArray } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import * as z from 'zod';
import { db } from '@/libs/DB';
import { userFavoriteSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

// ── Validation ─────────────────────────────────────────────────────────────────

const bodySchema = z.object({
  // Array of lead IDs to favourite — all get the same tag in one call
  leadIds: z.array(z.number().int().positive()).min(1),
  // Tag name shown in the UI, e.g. "High Priority"
  tagName: z.string().min(1).max(50),
  // Hex colour for the tag badge, e.g. "#ef4444"
  tagColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex colour'),
});

/**
 * POST /api/favorites/add
 *
 * Adds one or more leads to the current user's favourites with a colour-coded tag.
 * Before inserting, checks which leadIds are already favourited by this user so
 * that duplicates are skipped and the client can show contextual feedback.
 *
 * Body: { leadIds: number[], tagName: string, tagColor: string }
 * Returns: { added: number, skipped: number, alreadyExists: boolean }
 *   - added        — rows actually inserted
 *   - skipped      — rows that already existed (duplicate userId+leadId)
 *   - alreadyExists — true when ALL requested leads were already in favourites
 *                     (used by the client to show "already added" message for single-lead case)
 */
export async function POST(request: Request) {
  // Authenticate — reject if no valid access_token cookie
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  // JWT userId is a string — parse to integer for DB integer FK comparisons
  const userId = auth.userId; // already a number from requireAuth()

  // Parse + validate the request body
  const json = await request.json();
  const parse = bodySchema.safeParse(json);
  if (!parse.success) {
    return NextResponse.json({ message: 'Invalid input' }, { status: 422 });
  }

  const { leadIds, tagName, tagColor } = parse.data;

  // ── Check which leadIds are already favourited by this user ─────────────────
  // We query existing rows matching userId + any of the requested leadIds.
  // This lets us skip duplicates and return accurate counts to the client.
  const existing = await db
    .select({ leadId: userFavoriteSchema.leadId })
    .from(userFavoriteSchema)
    .where(
      and(
        eq(userFavoriteSchema.userId, userId),
        inArray(userFavoriteSchema.leadId, leadIds),
      ),
    );

  // Build a set of leadIds that are already in favourites for fast lookup
  const existingLeadIds = new Set(existing.map(r => r.leadId));

  // Filter down to only leads that are NOT yet favourited
  const newLeadIds = leadIds.filter(id => !existingLeadIds.has(id));

  // Count how many were already present (will be skipped)
  const skipped = leadIds.length - newLeadIds.length;

  // If all requested leads already exist, return early without inserting
  if (newLeadIds.length === 0) {
    return NextResponse.json({
      added: 0,
      skipped,
      // alreadyExists = true signals the client to show "already in favourites"
      alreadyExists: true,
    });
  }

  // ── Insert only the new (non-duplicate) rows ─────────────────────────────────
  const rows = newLeadIds.map(leadId => ({
    userId,
    leadId,
    tagName,
    tagColor,
  }));

  try {
    await db.insert(userFavoriteSchema).values(rows);
  } catch {
    // Swallow any residual constraint errors (e.g. race conditions)
  }

  return NextResponse.json({
    added: rows.length,
    skipped,
    // alreadyExists = false — at least some new leads were added
    alreadyExists: false,
  });
}
