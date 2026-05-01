import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { userSchema } from '@/models/Schema';
import { verifyAccessToken } from '@/utils/Jwt';

// Route that deletes auth cookies and redirects to sign-in.
// Server Components cannot modify cookies — only Route Handlers can.
const CLEAR_SESSION_ROUTE = '/api/auth/clear-session';

/**
 * Reads the access_token cookie in a Server Component context.
 *
 * Performs two checks:
 *   1. JWT is cryptographically valid (not expired, not tampered)
 *   2. The userId in the JWT still exists in the database
 *
 * If either check fails, clears auth cookies and redirects to /sign-in.
 * This handles the case where a valid JWT exists in cache but the user
 * was deleted from the DB (or never created due to a signup failure).
 *
 * @returns The user row from the database (userId, email, role).
 */
export async function getSessionUser(): Promise<{ userId: number; email: string; role: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  // ── No token — redirect to sign-in ────────────────────────────────────────
  if (!token) {
    redirect('/sign-in');
  }

  let userId: number;

  // ── Verify JWT ────────────────────────────────────────────────────────────
  try {
    const payload = await verifyAccessToken(token);
    userId = Number.parseInt(payload.userId, 10);
  } catch {
    // Token is expired or tampered — redirect to route handler that clears cookies
    redirect(CLEAR_SESSION_ROUTE);
  }

  // ── Verify the user still exists in the DB ────────────────────────────────
  // A valid JWT can persist in the browser cache even after the user is deleted.
  // Without this check, DB queries downstream return undefined and crash the UI.
  const [user] = await db
    .select({ id: userSchema.id, email: userSchema.email, role: userSchema.role })
    .from(userSchema)
    .where(eq(userSchema.id, userId!))
    .limit(1);

  if (!user) {
    // JWT is valid but user no longer exists in DB — redirect to route handler
    // that clears the stale cookies before sending to sign-in
    redirect(CLEAR_SESSION_ROUTE);
  }

  return {
    userId: user!.id,
    email: user!.email,
    role: user!.role ?? 'user',
  };
}
