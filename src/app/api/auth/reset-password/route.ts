import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import * as z from 'zod';
import { db } from '@/libs/DB';
import { userSchema } from '@/models/Schema';

const bodySchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const json = await request.json();
  const parse = bodySchema.safeParse(json);

  if (!parse.success) {
    return NextResponse.json({ message: 'Invalid input' }, { status: 422 });
  }

  const { email, otp, password } = parse.data;

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
    || user.otpPurpose !== 'reset_password'
  ) {
    return NextResponse.json({ message: 'Invalid or expired code' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db
    .update(userSchema)
    .set({ password: passwordHash, emailOtp: null, otpExpiry: null, otpPurpose: null })
    .where(eq(userSchema.id, user.id));

  return NextResponse.json({ message: 'Password updated. You can now sign in.' });
}
