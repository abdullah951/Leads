import { ilike } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { companySchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

/**
 * POST /api/leads/companies
 * Autocomplete endpoint for the Company filter multi-select.
 * Called by FilterMultiSelect with body `{ query: string }` on every keystroke.
 * Searches the normalised `company` table by name (case-insensitive partial match).
 *
 * @param request - JSON body `{ query?: string }`
 * @returns Array of `{ id: number, label: string }` matching the query.
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  // FilterMultiSelect sends { query } — the typed search string (may be empty)
  const body = await request.json();
  const query: string = body.query ?? '';

  // Query the company table — ILIKE for case-insensitive partial match
  // Return at most 20 results to keep the dropdown snappy
  const rows = await db
    .select({
      id: companySchema.id,
      // FilterOption expects a `label` field
      label: companySchema.companyName,
    })
    .from(companySchema)
    .where(ilike(companySchema.companyName, `%${query}%`))
    .orderBy(companySchema.companyName)
    .limit(20);

  // Return as FilterOption[] shape: [{ id: number, label: string }, ...]
  return NextResponse.json(rows);
}
