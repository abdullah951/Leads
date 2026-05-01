import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import * as z from 'zod';
import { db } from '@/libs/DB';
import { refreshTokensSchema, userSchema } from '@/models/Schema';
import { signAccessToken, signRefreshToken } from '@/utils/Jwt';

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

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

export async function POST(request: Request) {
  const json = await request.json();
  const parse = bodySchema.safeParse(json);

  if (!parse.success) {
    return NextResponse.json({ message: 'Invalid input' }, { status: 422 });
  }

  const { email, password } = parse.data;

  const [user] = await db
    .select()
    .from(userSchema)
    .where(eq(userSchema.email, email))
    .limit(1);

  // Use a generic message to avoid user enumeration.
  // user.password is null for Google-only accounts — treat as invalid credentials
  // so those users are prompted to use "Sign in with Google" instead.
  // The null check narrows user.password to string before passing to bcrypt.compare.
  const passwordHash = user?.password ?? null;
  if (!user || !passwordHash || !(await bcrypt.compare(password, passwordHash))) {
    return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
  }

  if (!user.emailVerified) {
    return NextResponse.json(
      { message: 'Verify your email before signing in' },
      { status: 403 },
    );
  }

  // Invalidate all previous sessions for this user (single active session)
  await db.delete(refreshTokensSchema).where(eq(refreshTokensSchema.userId, user.id));

  const accessToken = await signAccessToken({ userId: String(user.id), email: user.email, role: user.role ?? 'user' });
  const refreshToken = await signRefreshToken({ userId: String(user.id) });
  const tokenHash = await bcrypt.hash(refreshToken, 10);

  await db.insert(refreshTokensSchema).values({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  const response = NextResponse.json({ message: 'Signed in' });
  setTokenCookies(response, accessToken, refreshToken);
  return response;
}
