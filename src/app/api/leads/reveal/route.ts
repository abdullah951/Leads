import { and, eq, inArray, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { leadDataSchema, revealedContactSchema, teamMemberSchema, userCreditSchema, userSettingsSchema, userSubscriptionSchema, userSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';
import { sendCreditAlertEmail } from '@/utils/Email';
import { getNextResetDate, isPlanUnlimited, type PlanTier } from '@/constants/planConfig';

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { userId } = auth;
  const { selectedPersons }: { selectedPersons: number[] } = await request.json();

  if (!selectedPersons?.length) {
    return NextResponse.json({ message: 'No persons selected' }, { status: 422 });
  }
  console.log("Inside reveal route")
  // Check subscription — unlimited users skip credit checks
  const [subscription] = await db
    .select({ plan: userSubscriptionSchema.plan, status: userSubscriptionSchema.status })
    .from(userSubscriptionSchema)
    .where(eq(userSubscriptionSchema.userId, userId))
    .limit(1);

  // Enterprise plan = unlimited reveals; also keep legacy 'unlimited' value for safety
  const planTier = (subscription?.plan ?? 'free') as PlanTier;
  const isUnlimited = isPlanUnlimited(planTier) && subscription?.status === 'active';

  // ── Check if user is an active team member with a credit quota ──────────
  // Team member quotas are tracked in teamMemberSchema.creditsUsed separately
  // from userCreditSchema. If a quota is assigned, use that system instead.
  const [teamMember] = await db
    .select({ id: teamMemberSchema.id, creditQuota: teamMemberSchema.creditQuota, creditsUsed: teamMemberSchema.creditsUsed })
    .from(teamMemberSchema)
    .where(and(
      eq(teamMemberSchema.userId, userId),
      eq(teamMemberSchema.status, 'active'),
    ))
    .limit(1);

  // Whether to use the team quota system instead of userCreditSchema
  const isTeamMember = !!(teamMember && teamMember.creditQuota > 0);

  // Find already-revealed persons — no charge for these
  const alreadyRevealed = await db
    .select({ personId: revealedContactSchema.personId })
    .from(revealedContactSchema)
    .where(
      and(
        eq(revealedContactSchema.userId, userId),
        inArray(revealedContactSchema.personId, selectedPersons),
      ),
    );

  const alreadyRevealedIds = new Set(alreadyRevealed.map(r => r.personId));
  const newPersonIds = selectedPersons.filter(id => !alreadyRevealedIds.has(id));

  if (newPersonIds.length > 0) {
    // Fetch the actual contact data for new persons so we know which have real data.
    // Only leads with at least one non-null contact field are billable — leads where
    // every field is null are free to reveal (there's nothing to charge for).
    const leadRows = await db
      .select({
        id: leadDataSchema.id,
        workEmail: leadDataSchema.workEmail,
        personalEmail: leadDataSchema.personalEmail,
        phone1: leadDataSchema.phone1,
        phone2: leadDataSchema.phone2,
      })
      .from(leadDataSchema)
      .where(inArray(leadDataSchema.id, newPersonIds));

    // Separate billable (has at least one contact field) from free (all null)
    const billablePersonIds = leadRows
      .filter(l => l.workEmail || l.personalEmail || l.phone1 || l.phone2)
      .map(l => l.id);
    const freePersonIds = leadRows
      .filter(l => !l.workEmail && !l.personalEmail && !l.phone1 && !l.phone2)
      .map(l => l.id);

    if (!isUnlimited && billablePersonIds.length > 0) {

      if (isTeamMember) {
        // ── Team member quota path ────────────────────────────────────────
        // Credits tracked in teamMemberSchema.creditsUsed (daily, resets nightly).
        const remaining = Math.max(0, teamMember!.creditQuota - teamMember!.creditsUsed);

        if (remaining <= 0) {
          return NextResponse.json({ message: 'No credits remaining. Please Recharge to View more' }, { status: 402 });
        }

        // Reveal as many as the remaining quota allows
        const toReveal = Math.min(billablePersonIds.length, remaining);
        const personsToReveal = billablePersonIds.slice(0, toReveal);

        // Increment creditsUsed atomically — safe against concurrent requests
        await db
          .update(teamMemberSchema)
          .set({ creditsUsed: sql`${teamMemberSchema.creditsUsed} + ${toReveal}` })
          .where(eq(teamMemberSchema.id, teamMember!.id));

        if (personsToReveal.length > 0) await revealPersons(userId, personsToReveal, leadRows);
      } else {
        // ── Standard credit path (free / paid plan) ───────────────────────
        const now = new Date();
        const [credit] = await db
          .select()
          .from(userCreditSchema)
          .where(eq(userCreditSchema.userId, userId))
          .limit(1);

        if (!credit) {
          return NextResponse.json({ message: 'No credits remaining' }, { status: 402 });
        }

        let currentRemaining = credit.remaining;

        // Auto-reset if the credit period has passed.
        // Free plan resets daily; paid plans reset on the 1st of next month.
        if (now >= credit.resetsAt) {
          const nextReset = getNextResetDate(planTier);
          currentRemaining = credit.dailyLimit;
          await db
            .update(userCreditSchema)
            .set({ remaining: credit.dailyLimit, resetsAt: nextReset, updatedAt: new Date() })
            .where(eq(userCreditSchema.userId, userId));
        }

        if (currentRemaining <= 0) {
          return NextResponse.json({ message: 'No credits remaining. Please Recharge to View more' }, { status: 402 });
        }

        // Only charge for billable persons — reveal as many as credits allow
        const toReveal = Math.min(billablePersonIds.length, currentRemaining);
        const personsToReveal = billablePersonIds.slice(0, toReveal);

        // Deduct credits — only for persons with real contact data
        const newRemaining = currentRemaining - toReveal;
        await db
          .update(userCreditSchema)
          .set({ remaining: newRemaining })
          .where(eq(userCreditSchema.userId, userId));

        // Fire low-credit alert email asynchronously (best-effort)
        checkAndSendCreditAlert(userId, newRemaining, credit.dailyLimit).catch(() => {});

        if (personsToReveal.length > 0) await revealPersons(userId, personsToReveal, leadRows);
      }

    } else if (isUnlimited && billablePersonIds.length > 0) {
      // Unlimited plan: reveal all billable persons without credit check
      await revealPersons(userId, billablePersonIds, leadRows);
    }

    // Free persons (all-null contacts) are always revealed at no cost
    if (freePersonIds.length > 0) await revealPersons(userId, freePersonIds, leadRows);
  }

  // Return all revealed data for the requested persons
  const allRevealed = await db
    .select()
    .from(revealedContactSchema)
    .where(
      and(
        eq(revealedContactSchema.userId, userId),
        inArray(revealedContactSchema.personId, selectedPersons),
      ),
    );

  // ── Fire webhooks for lead.revealed event ─────────────────────────────────
  // Fire-and-forget — webhook failures must never block the API response.
  if (allRevealed.length > 0) {
    import('@/utils/FireWebhooks').then(({ fireWebhooks }) => {
      fireWebhooks(userId, 'lead.revealed', {
        personIds: allRevealed.map(r => r.personId),
        leads: allRevealed.map(r => ({
          personId: r.personId,
          workEmail: r.workEmail,
          personalEmail: r.personalEmail,
          phone1: r.phone1,
          phone2: r.phone2,
        })),
      }).catch(() => {});
    }).catch(() => {});
  }

  return NextResponse.json(
    allRevealed.map(r => ({
      personId: r.personId,
      workEmail: r.workEmail,
      personalEmail: r.personalEmail,
      phone1: r.phone1,
      phone2: r.phone2,
    })),
  );
}

/**
 * Inserts revealed_contact rows for the given person IDs.
 * Accepts pre-fetched lead rows to avoid a redundant DB query.
 * Only inserts rows for person IDs present in the provided lead rows array.
 *
 * @param userId - The user revealing the contacts.
 * @param personIds - IDs of lead_data rows to reveal.
 * @param leadRows - Pre-fetched lead rows containing contact fields.
 */
/**
 * Checks whether the user has a low-credit alert configured and, if the
 * remaining credits have just dropped at or below the threshold, sends the
 * alert email. Called fire-and-forget after every credit deduction.
 *
 * @param userId - The user who just spent credits.
 * @param remaining - Credits remaining after the deduction.
 * @param dailyLimit - The user's daily credit limit (for context in the email).
 */
async function checkAndSendCreditAlert(
  userId: number,
  remaining: number,
  dailyLimit: number,
): Promise<void> {
  // Look up the user's alert settings and email address in one query
  const [settings] = await db
    .select({
      creditAlertEnabled: userSettingsSchema.creditAlertEnabled,
      creditAlertThreshold: userSettingsSchema.creditAlertThreshold,
    })
    .from(userSettingsSchema)
    .where(eq(userSettingsSchema.userId, userId))
    .limit(1);

  // Alert is not configured — nothing to do
  if (!settings?.creditAlertEnabled) return;

  const threshold = settings.creditAlertThreshold;

  // Only fire when remaining just hit or crossed below the threshold
  // (avoids spamming on every subsequent reveal once already below threshold)
  if (remaining > threshold) return;

  // Fetch the user's email address
  const [user] = await db
    .select({ email: userSchema.email })
    .from(userSchema)
    .where(eq(userSchema.id, userId))
    .limit(1);

  if (!user?.email) return;

  // Send the alert email (errors are swallowed by the caller's .catch())
  await sendCreditAlertEmail(user.email, remaining, threshold, dailyLimit);
}

async function revealPersons(
  userId: number,
  personIds: number[],
  leadRows: { id: number; workEmail: string | null; personalEmail: string | null; phone1: string | null; phone2: string | null }[],
) {
  // Filter pre-fetched rows to only the requested IDs
  const idSet = new Set(personIds);
  const leads = leadRows.filter(l => idSet.has(l.id));

  if (leads.length === 0) return;

  await db.insert(revealedContactSchema).values(
    leads.map(lead => ({
      userId,
      personId: lead.id,
      workEmail: lead.workEmail,
      personalEmail: lead.personalEmail,
      phone1: lead.phone1,
      phone2: lead.phone2,
    })),
  );
}
