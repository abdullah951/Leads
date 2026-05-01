import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import * as z from 'zod';
import { db } from '@/libs/DB';
import { userFavoriteSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

// ── Validation ─────────────────────────────────────────────────────────────────

const bodySchema = z.object({
  // The favorite row ID (from userFavoriteSchema.id) to delete.
  // Using favoriteId (not leadId) so we can remove a specific tag assignment.
  favoriteId: z.number().int().positive(),
});

/**
 * POST /api/favorites/remove
 *
 * Removes a single favourite row from the current user's favourites.
 * Uses the favoriteId (PK of user_favorite) so the correct tag instance is removed.
 * Ownership check: only deletes if the row belongs to the authenticated user.
 *
 * Body: { favoriteId: number }
 * Returns: { removed: true }
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

  const { favoriteId } = parse.data;

  // Delete only if the row belongs to the current user — prevents IDOR
  await db
    .delete(userFavoriteSchema)
    .where(
      and(
        eq(userFavoriteSchema.id, favoriteId),
        eq(userFavoriteSchema.userId, userId),
      ),
    );

  return NextResponse.json({ removed: true });
}
