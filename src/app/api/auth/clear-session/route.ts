/**
 * GET /api/auth/clear-session
 *
 * Clears auth cookies and redirects to /sign-in.
 * Used when a valid JWT exists in the browser but the user no longer
 * exists in the DB — a Server Component cannot delete cookies directly,
 * so it redirects here instead.
 */

import { NextResponse } from 'next/server';

export function GET() {
  const response = NextResponse.redirect(
    new URL('/sign-in', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  );

  // Clear both auth cookies so the middleware stops treating this as authenticated
  response.cookies.delete('access_token');
  response.cookies.delete('refresh_token');

  return response;
}
