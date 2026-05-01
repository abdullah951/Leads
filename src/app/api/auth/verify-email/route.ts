import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import * as z from 'zod';
import { db } from '@/libs/DB';
import { refreshTokensSchema, userSchema } from '@/models/Schema';
import { signAccessToken, signRefreshToken } from '@/utils/Jwt';

const bodySchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

function setTokenCookies(response: NextResponse, accessToken: string, refreshToken: string) {
  const isProd = process.env.NODE_ENV === 'production';

  response.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: 15 * 60,
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

  const { email, otp } = parse.data;

  const [user] = await db
    .select()
    .from(userSchema)
    .where(eq(userSchema.email, email))
    .limit(1);

  if (
    !user
    || user.emailOtp !== otp
    || !user.otpExpiry
    || user.otpExpiry < new Date()
    || user.otpPurpose !== 'verify_email'
  ) {
    return NextResponse.json({ message: 'Invalid or expired code' }, { status: 400 });
  }
  console.log('User found and update status: ', user);
  await db
    .update(userSchema)
    .set({ emailVerified: true, emailOtp: null, otpExpiry: null, otpPurpose: null })
    .where(eq(userSchema.id, user.id));

  // userId must be a string for JWT payload — DB PK is a number so we convert it here
  const accessToken = await signAccessToken({ userId: String(user.id), email: user.email, role: user.role ?? 'user' });
  const refreshToken = await signRefreshToken({ userId: String(user.id) });
  const tokenHash = await bcrypt.hash(refreshToken, 10);

  await db.insert(refreshTokensSchema).values({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  const response = NextResponse.json({ message: 'Email verified' });
  setTokenCookies(response, accessToken, refreshToken);
  return response;
}
