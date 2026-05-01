/**
 * PATCH /api/auth/timezone
 *
 * Updates the authenticated user's stored timezone.
 * Called on each login so that timezone changes (e.g. travel) are picked up
 * without requiring the user to do anything.
 *
 * Body: { timezone: string }  — IANA timezone name, e.g. 'America/New_York'
 * Returns: { ok: true }
 */

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { userSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';
import { sanitizeTimezone } from '@/utils/Timezone';

export async function PATCH(request: Request) {
  // Verify the caller is logged in
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { userId } = auth;

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }

  const raw = (body as Record<string, unknown>)?.timezone;

  if (typeof raw !== 'string' || !raw.trim()) {
    return NextResponse.json({ message: 'timezone is required' }, { status: 422 });
  }

  // Validate the timezone — rejects invalid IANA strings
  const validated = sanitizeTimezone(raw.trim());
  if (validated === 'UTC' && raw.trim() !== 'UTC') {
    // sanitizeTimezone fell back to UTC because the value was invalid
    return NextResponse.json({ message: 'Invalid timezone' }, { status: 422 });
  }

  // Persist the timezone on the user row
  await db
    .update(userSchema)
    .set({ timezone: validated, updatedAt: new Date() })
    .where(eq(userSchema.id, userId));

  return NextResponse.json({ ok: true });
}
