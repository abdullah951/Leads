import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { refreshTokensSchema } from '@/models/Schema';
import { verifyRefreshToken } from '@/utils/Jwt';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refresh_token')?.value;

  if (refreshToken) {
    try {
      const { userId: userIdStr } = await verifyRefreshToken(refreshToken);
      const userId = Number.parseInt(userIdStr, 10);

      // Find and delete the matching refresh token from DB
      const stored = await db
        .select()
        .from(refreshTokensSchema)
        .where(eq(refreshTokensSchema.userId, userId));

      for (const row of stored) {
        if (await bcrypt.compare(refreshToken, row.tokenHash)) {
          await db
            .delete(refreshTokensSchema)
            .where(eq(refreshTokensSchema.id, row.id));
          break;
        }
      }
    } catch {
      // Token invalid — still clear cookies
    }
  }

  const response = NextResponse.redirect(new URL('/', request.url));
  response.cookies.delete('access_token');
  response.cookies.delete('refresh_token');
  return response;
}
