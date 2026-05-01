import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import * as z from 'zod';
import { db } from '@/libs/DB';
import { userSchema } from '@/models/Schema';
import { sendOtpEmail } from '@/utils/Email';

const bodySchema = z.object({
  email: z.string().email(),
});

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  const json = await request.json();
  const parse = bodySchema.safeParse(json);

  if (!parse.success) {
    return NextResponse.json({ message: 'Invalid input' }, { status: 422 });
  }

  const { email } = parse.data;

  const [user] = await db
    .select({ id: userSchema.id })
    .from(userSchema)
    .where(eq(userSchema.email, email))
    .limit(1);

  // Return the same response regardless of whether the email exists (prevent enumeration)
  if (!user) {
    return NextResponse.json({ message: 'If that email is registered, you will receive a code.' });
  }

  const otp = generateOtp();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  await db
    .update(userSchema)
    .set({ emailOtp: otp, otpExpiry, otpPurpose: 'reset_password' })
    .where(eq(userSchema.id, user.id));

  await sendOtpEmail(email, otp, 'reset_password');

  return NextResponse.json({ message: 'If that email is registered, you will receive a code.' });
}
