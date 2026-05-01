// ── POST /api/reveal-history/list ─────────────────────────────────────────────
// Returns a paginated, searchable list of all contacts the current user has
// revealed, joined to lead_data for full name/company/title/LinkedIn details.
//
// Request body:
//   { page?: number; pageSize?: number; search?: string }
//
// Response:
//   { items: RevealHistoryItem[]; total: number; totalCreditsSpent: number }
//
// Each item contains everything needed by RevealHistoryView:
//   - id, personId, revealedAt
//   - firstName, lastName, jobTitle, companyName, city, country, linkedIn
//   - workEmail, personalEmail, phone1, phone2
//   - workEmailStatus, personalEmailStatus, creditRefunded
//   - revealerName (null = self, name = team member who revealed it)
// ─────────────────────────────────────────────────────────────────────────────

import { and, count, desc, eq, ilike, or } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import {
  citySchema,
  companySchema,
  countrySchema,
  jobTitleSchema,
  leadDataSchema,
  revealedContactSchema,
} from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(req: Request) {
  // Authenticate the request
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await req.json() as {
    page?: number;
    pageSize?: number;
    search?: string;
  };

  // Pagination defaults — page is 1-based
  const page = Math.max(1, body.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, body.pageSize ?? 50));
  const offset = (page - 1) * pageSize;

  // Optional search string — matched against name, email, company (case-insensitive)
  const search = (body.search ?? '').trim();

  // ── Base WHERE clause — always filter by the current user ─────────────────
  // Build the search conditions on top if a search term is provided
  const baseCondition = eq(revealedContactSchema.userId, userId);

  // Search conditions: match any of name parts, emails, company name
  // We build them as OR-ed ilike conditions on joined columns
  const searchConditions = search
    ? or(
        ilike(leadDataSchema.firstName, `%${search}%`),
        ilike(leadDataSchema.lastName, `%${search}%`),
        ilike(revealedContactSchema.workEmail, `%${search}%`),
        ilike(revealedContactSchema.personalEmail, `%${search}%`),
        ilike(companySchema.companyName, `%${search}%`),
        ilike(jobTitleSchema.title, `%${search}%`),
      )
    : undefined;

  // Final WHERE clause — combine userId filter with optional search
  const whereClause = searchConditions
    ? and(baseCondition, searchConditions)
    : baseCondition;

  // ── Run paginated data query + total count query in parallel ──────────────
  const [rows, countResult] = await Promise.all([
    db
      .select({
        // Reveal record fields
        id: revealedContactSchema.id,
        personId: revealedContactSchema.personId,
        workEmail: revealedContactSchema.workEmail,
        personalEmail: revealedContactSchema.personalEmail,
        phone1: revealedContactSchema.phone1,
        phone2: revealedContactSchema.phone2,
        workEmailStatus: revealedContactSchema.workEmailStatus,
        personalEmailStatus: revealedContactSchema.personalEmailStatus,
        creditRefunded: revealedContactSchema.creditRefunded,
        revealedAt: revealedContactSchema.revealedAt,
        // Lead profile fields (joined)
        firstName: leadDataSchema.firstName,
        lastName: leadDataSchema.lastName,
        linkedIn: leadDataSchema.personalLinkedIn,
        // Normalised reference table joins
        jobTitle: jobTitleSchema.title,
        companyName: companySchema.companyName,
        city: citySchema.name,
        country: countrySchema.name,
      })
      .from(revealedContactSchema)
      // Join the lead_data row to get name, LinkedIn, etc.
      .leftJoin(leadDataSchema, eq(revealedContactSchema.personId, leadDataSchema.id))
      // Join normalised reference tables for job title, company, location
      .leftJoin(jobTitleSchema, eq(leadDataSchema.jobTitleId, jobTitleSchema.id))
      .leftJoin(companySchema, eq(leadDataSchema.companyId, companySchema.id))
      .leftJoin(citySchema, eq(leadDataSchema.cityId, citySchema.id))
      .leftJoin(countrySchema, eq(leadDataSchema.countryId, countrySchema.id))
      .where(whereClause)
      // Most recent first
      // Most recent reveal first
      .orderBy(desc(revealedContactSchema.revealedAt))
      .limit(pageSize)
      .offset(offset),

    // Count query — total rows matching the filter (for pagination)
    db
      .select({ total: count() })
      .from(revealedContactSchema)
      .leftJoin(leadDataSchema, eq(revealedContactSchema.personId, leadDataSchema.id))
      .leftJoin(companySchema, eq(leadDataSchema.companyId, companySchema.id))
      .leftJoin(jobTitleSchema, eq(leadDataSchema.jobTitleId, jobTitleSchema.id))
      .where(whereClause),
  ]);

  const total = countResult[0]?.total ?? 0;

  // ── Total credits spent ───────────────────────────────────────────────────
  // Credits spent = total number of reveals ever made by this user (not just
  // the current page / search — it's a global stat shown in the header bar).
  // We subtract refunded credits to give an accurate net cost.
  const totalCredsResult = await db
    .select({ total: count() })
    .from(revealedContactSchema)
    .where(
      and(
        eq(revealedContactSchema.userId, userId),
        // Only count non-refunded reveals as "credits spent"
        eq(revealedContactSchema.creditRefunded, false),
      ),
    );

  const totalCreditsSpent = totalCredsResult[0]?.total ?? 0;

  // Serialize dates as ISO strings for JSON transport
  const items = rows.map(r => ({
    ...r,
    revealedAt: r.revealedAt.toISOString(),
  }));

  return NextResponse.json({ items, total, totalCreditsSpent });
}
