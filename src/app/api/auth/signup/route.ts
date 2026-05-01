import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import * as z from 'zod';
import { db } from '@/libs/DB';
import { userCreditSchema, userSchema, userSubscriptionSchema, teamMemberSchema } from '@/models/Schema';
import { sendOtpEmail } from '@/utils/Email';
import { nextLocalMidnightUtc, sanitizeTimezone } from '@/utils/Timezone';

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  // Optional IANA timezone name captured by the browser at signup.
  // Used to schedule daily credit resets at the user's local midnight.
  // Falls back to 'UTC' if not provided or invalid.
  timezone: z.string().optional(),
  // Optional team invite token — when present, the new user is linked to the
  // pending team_member row immediately after account creation.
  inviteToken: z.string().uuid().optional(),
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

  const { email, password, inviteToken } = parse.data;

  // Validate and normalise timezone — falls back to 'UTC' if invalid
  const timezone = sanitizeTimezone(parse.data.timezone);

  const existing = await db
    .select({ id: userSchema.id })
    .from(userSchema)
    .where(eq(userSchema.email, email))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ message: 'Email already registered' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const otp = generateOtp();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  // Insert user with timezone so the pg_cron reset job knows their local midnight
  const [newUser] = await db
    .insert(userSchema)
    .values({ email, password: passwordHash, emailOtp: otp, otpExpiry, otpPurpose: 'verify_email', timezone })
    .returning({ id: userSchema.id });

  // Compute the next local midnight in the user's own timezone for the first reset
  const resetsAt = nextLocalMidnightUtc(timezone);

  await Promise.all([
    // Seed 20 daily credits; resets_at is local midnight so the DB job fires correctly
    db.insert(userCreditSchema).values({
      userId: newUser!.id,
      remaining: 20,
      dailyLimit: 20,
      resetsAt,
    }),
    db.insert(userSubscriptionSchema).values({
      userId: newUser!.id,
      plan: 'free',
      status: 'active',
    }),
  ]);

  // ── Link team invite if a token was provided ──────────────────────────────
  // When the user arrives from a team invite email, the invite token is passed
  // through the signup form. We resolve it here — while we already have the
  // new userId — so no separate accept-invite step is required.
  if (inviteToken) {
    try {
      // Find the pending invite row by token
      const [invite] = await db
        .select({ id: teamMemberSchema.id, status: teamMemberSchema.status })
        .from(teamMemberSchema)
        .where(eq(teamMemberSchema.inviteToken, inviteToken))
        .limit(1);

      // Only accept if it's still pending (guards against double-use)
      if (invite && invite.status === 'pending') {
        await db
          .update(teamMemberSchema)
          .set({
            userId: newUser!.id,
            status: 'active',
            // Store the email as display name until the user sets a name
            name: email,
            joinedAt: new Date(),
            // Clear the one-time token so it cannot be reused
            inviteToken: null,
            updatedAt: new Date(),
          })
          .where(eq(teamMemberSchema.id, invite.id));
      }
    } catch (inviteErr) {
      // Don't fail the signup if invite linking errors — the account was created
      console.error('[signup] Failed to link invite token:', inviteErr);
    }
  }

  await sendOtpEmail(email, otp, 'verify_email');

  return NextResponse.json(
    { message: 'Account created. Check your email for the verification code.' },
    { status: 201 },
  );
}
