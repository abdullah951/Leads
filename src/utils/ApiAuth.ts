import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyAccessToken } from '@/utils/Jwt';

/**
 * Reads and verifies the access_token cookie.
 * @returns The decoded payload with userId (as number) and email, or a 401 NextResponse if invalid.
 */
export async function requireAuth(): Promise<
  { userId: number; email: string; role: string } | NextResponse
> {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await verifyAccessToken(token);
    return { userId: Number.parseInt(payload.userId, 10), email: payload.email, role: payload.role };
  } catch {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
}
