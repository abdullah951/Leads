import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { refreshTokensSchema, userSchema } from '@/models/Schema';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/utils/Jwt';

const UNAUTHORIZED = NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

function setTokenCookies(response: NextResponse, accessToken: string, refreshToken: string) {
  const isProd = process.env.NODE_ENV === 'production';

  response.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60, // 7 days — matches the JWT expiry so the cookie lives as long as the token
    path: '/',
  });

  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
}

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refresh_token')?.value;

  if (!refreshToken) {
    return UNAUTHORIZED;
  }

  let userId: string;
  try {
    ({ userId } = await verifyRefreshToken(refreshToken));
  } catch {
    return UNAUTHORIZED;
  }

  // Parse userId string to integer — DB columns are integer, JWT payload stores as string
  const userIdInt = parseInt(userId, 10);

  // Find the matching hashed token in DB
  const stored = await db
    .select()
    .from(refreshTokensSchema)
    .where(eq(refreshTokensSchema.userId, userIdInt));

  let matchedRow: typeof stored[0] | undefined;
  for (const row of stored) {
    if (await bcrypt.compare(refreshToken, row.tokenHash)) {
      matchedRow = row;
      break;
    }
  }

  if (!matchedRow || matchedRow.expiresAt < new Date()) {
    return UNAUTHORIZED;
  }

  // Fetch user email + role (role is needed to re-sign the access token)
  const [user] = await db
    .select({ email: userSchema.email, role: userSchema.role })
    .from(userSchema)
    .where(eq(userSchema.id, userIdInt))
    .limit(1);

  if (!user) {
    return UNAUTHORIZED;
  }

  // Rotate: delete old token, issue new pair
  await db
    .delete(refreshTokensSchema)
    .where(eq(refreshTokensSchema.id, matchedRow.id));

  const newAccessToken = await signAccessToken({ userId, email: user.email, role: user.role ?? 'user' });
  const newRefreshToken = await signRefreshToken({ userId });
  const tokenHash = await bcrypt.hash(newRefreshToken, 10);

  await db.insert(refreshTokensSchema).values({
    userId: userIdInt, // integer FK, not string
    tokenHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  const response = NextResponse.json({ message: 'Token refreshed' });
  setTokenCookies(response, newAccessToken, newRefreshToken);
  return response;
}
