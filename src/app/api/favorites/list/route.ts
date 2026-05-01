import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import {
  citySchema,
  companyIndustrySchema,
  companySizeSchema,
  companySchema,
  jobTitleSchema,
  leadDataSchema,
  revealedContactSchema,
  userFavoriteSchema,
} from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

/**
 * POST /api/favorites/list
 *
 * Returns all leads the current user has favourited, enriched with:
 * - Full lead profile fields (name, title, company, location)
 * - Tag info (tagName, tagColor, favoriteId)
 * - Revealed contact data if previously revealed (workEmail, phone1, etc.)
 *
 * No pagination — favourites lists are typically small enough to load in full.
 */
export async function POST(_request: Request) {
  // Authenticate
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  // JWT userId is a string — parse to integer for DB integer FK comparisons
  const userId = auth.userId; // already a number from requireAuth()

  // ── Fetch all favourite rows for this user ─────────────────────────────────
  // We join lead_data, job_title, city, company_industry, company_size to get
  // displayable lead info in a single query.
  const rows = await db
    .select({
      // Favourite metadata
      favoriteId: userFavoriteSchema.id,
      tagName: userFavoriteSchema.tagName,
      tagColor: userFavoriteSchema.tagColor,
      favoritedAt: userFavoriteSchema.createdAt,

      // Lead identity
      id: leadDataSchema.id,
      firstName: leadDataSchema.firstName,
      lastName: leadDataSchema.lastName,
      // personalLinkedIn is the correct column name in leadDataSchema
      linkedinUrl: leadDataSchema.personalLinkedIn,
      avatarUrl: leadDataSchema.avatarUrl,
      // companyName was moved to the company table; joined below
      companyName: companySchema.companyName,

      // Enriched fields from related tables
      jobTitle: jobTitleSchema.title,
      // citySchema uses 'name', not 'city'
      city: citySchema.name,
      industry: companyIndustrySchema.name,
      companySize: companySizeSchema.label,
    })
    .from(userFavoriteSchema)
    .innerJoin(leadDataSchema, eq(userFavoriteSchema.leadId, leadDataSchema.id))
    .leftJoin(jobTitleSchema, eq(leadDataSchema.jobTitleId, jobTitleSchema.id))
    .leftJoin(citySchema, eq(leadDataSchema.cityId, citySchema.id))
    .leftJoin(companyIndustrySchema, eq(leadDataSchema.companyIndustryId, companyIndustrySchema.id))
    .leftJoin(companySizeSchema, eq(leadDataSchema.companySizeId, companySizeSchema.id))
    // Join company table to resolve company name from the FK
    .leftJoin(companySchema, eq(leadDataSchema.companyId, companySchema.id))
    .where(eq(userFavoriteSchema.userId, userId))
    .orderBy(userFavoriteSchema.createdAt);

  if (rows.length === 0) {
    return NextResponse.json([]);
  }

  // ── Fetch revealed contact info for any revealed leads ────────────────────
  // Fetch all revealed contacts for this user — filtered to matching leads during merge below.
  const revealed = await db
    .select({
      personId: revealedContactSchema.personId,
      workEmail: revealedContactSchema.workEmail,
      personalEmail: revealedContactSchema.personalEmail,
      phone1: revealedContactSchema.phone1,
    })
    .from(revealedContactSchema)
    .where(eq(revealedContactSchema.userId, userId));

  // Build a lookup map: personId → revealed contact data
  const revealMap = new Map(revealed.map(r => [r.personId, r]));

  // ── Merge and return ───────────────────────────────────────────────────────
  const result = rows.map((row) => {
    const contact = revealMap.get(row.id);
    return {
      favoriteId: row.favoriteId,
      tagName: row.tagName,
      tagColor: row.tagColor,
      favoritedAt: row.favoritedAt,
      // Lead profile
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      fullName: [row.firstName, row.lastName].filter(Boolean).join(' '),
      linkedinUrl: row.linkedinUrl,
      avatarUrl: row.avatarUrl,
      companyName: row.companyName,
      jobTitle: row.jobTitle ?? null,
      city: row.city ?? null,
      industry: row.industry ?? null,
      companySize: row.companySize ?? null,
      // Revealed contact data (null if not yet revealed)
      revealed: !!contact,
      workEmail: contact?.workEmail ?? null,
      personalEmail: contact?.personalEmail ?? null,
      phone1: contact?.phone1 ?? null,
    };
  });

  return NextResponse.json(result);
}
