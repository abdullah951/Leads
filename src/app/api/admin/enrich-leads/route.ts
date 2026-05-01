import { and, eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import {
  citySchema,
  companyIndustrySchema,
  companySchema,
  companySizeSchema,
  countrySchema,
  jobTitleSchema,
  leadDataSchema,
} from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

/* ── CSV parser (same logic as import-leads route) ───────────────────── */

/**
 * Parses a CSV string into rows of string arrays, handling quoted fields.
 *
 * @param text - Raw CSV file contents as a string.
 * @returns 2-D array: rows[0] is the header row, rows[1..] are data rows.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        // Handle escaped quote ("") inside a quoted field
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    rows.push(fields);
  }
  return rows;
}

/* ── Lookup helpers (upsert-or-get) — mirrors import-leads route ─────── */

// In-memory caches to avoid redundant DB round-trips within one request
const jobTitleCache = new Map<string, number>();
const countryCache = new Map<string, number>();
const cityCache = new Map<string, number>();
const industryCache = new Map<string, number>();
const sizeCache = new Map<string, number>();
const companyCache = new Map<string, number>();

async function upsertJobTitle(title: string): Promise<number> {
  const key = title.toLowerCase();
  if (jobTitleCache.has(key)) return jobTitleCache.get(key)!;
  const existing = await db.select({ id: jobTitleSchema.id }).from(jobTitleSchema)
    .where(eq(sql`LOWER(${jobTitleSchema.title})`, key)).limit(1);
  if (existing[0]) { jobTitleCache.set(key, existing[0].id); return existing[0].id; }
  const inserted = await db.insert(jobTitleSchema).values({ title }).returning({ id: jobTitleSchema.id });
  jobTitleCache.set(key, inserted[0]!.id);
  return inserted[0]!.id;
}

async function upsertCountry(name: string): Promise<number> {
  const key = name.toLowerCase();
  if (countryCache.has(key)) return countryCache.get(key)!;
  const existing = await db.select({ id: countrySchema.id }).from(countrySchema)
    .where(eq(sql`LOWER(${countrySchema.name})`, key)).limit(1);
  if (existing[0]) { countryCache.set(key, existing[0].id); return existing[0].id; }
  const safeCode = `${name.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 20)}_${Date.now().toString(36).slice(-4)}`;
  const inserted = await db.insert(countrySchema).values({ name: name.trim(), code: safeCode })
    .returning({ id: countrySchema.id });
  countryCache.set(key, inserted[0]!.id);
  return inserted[0]!.id;
}

async function upsertCity(cityName: string, countryId: number): Promise<number> {
  const key = `${cityName.toLowerCase()}::${countryId}`;
  if (cityCache.has(key)) return cityCache.get(key)!;
  const existing = await db.select({ id: citySchema.id }).from(citySchema)
    .where(eq(sql`LOWER(${citySchema.name})`, cityName.toLowerCase())).limit(1);
  if (existing[0]) { cityCache.set(key, existing[0].id); return existing[0].id; }
  const inserted = await db.insert(citySchema).values({ name: cityName.trim(), countryId })
    .returning({ id: citySchema.id });
  cityCache.set(key, inserted[0]!.id);
  return inserted[0]!.id;
}

async function upsertIndustry(name: string): Promise<number> {
  const key = name.toLowerCase();
  if (industryCache.has(key)) return industryCache.get(key)!;
  const existing = await db.select({ id: companyIndustrySchema.id }).from(companyIndustrySchema)
    .where(eq(sql`LOWER(${companyIndustrySchema.name})`, key)).limit(1);
  if (existing[0]) { industryCache.set(key, existing[0].id); return existing[0].id; }
  const inserted = await db.insert(companyIndustrySchema).values({ name: name.trim() })
    .returning({ id: companyIndustrySchema.id });
  industryCache.set(key, inserted[0]!.id);
  return inserted[0]!.id;
}

async function upsertCompany(name: string): Promise<number> {
  const key = name.toLowerCase();
  if (companyCache.has(key)) return companyCache.get(key)!;
  const existing = await db.select({ id: companySchema.id }).from(companySchema)
    .where(eq(sql`LOWER(${companySchema.companyName})`, key)).limit(1);
  if (existing[0]) { companyCache.set(key, existing[0].id); return existing[0].id; }
  const inserted = await db.insert(companySchema).values({ companyName: name.trim() })
    .returning({ id: companySchema.id });
  companyCache.set(key, inserted[0]!.id);
  return inserted[0]!.id;
}

async function upsertCompanySize(label: string): Promise<number> {
  const key = label.toLowerCase();
  if (sizeCache.has(key)) return sizeCache.get(key)!;
  const existing = await db.select({ id: companySizeSchema.id }).from(companySizeSchema)
    .where(eq(sql`LOWER(${companySizeSchema.label})`, key)).limit(1);
  if (existing[0]) { sizeCache.set(key, existing[0].id); return existing[0].id; }
  const clean = label.replace(/^size:\s*/i, '').trim();
  const inserted = await db.insert(companySizeSchema).values({ label: clean })
    .returning({ id: companySizeSchema.id });
  sizeCache.set(key, inserted[0]!.id);
  return inserted[0]!.id;
}

/* ── Route handler ───────────────────────────────────────────────────── */

/**
 * Enriches existing lead rows with missing data from a CSV file.
 * Matches each CSV row to an existing lead_data row by:
 *   - firstName + lastName + linkedInUrl (all three must match)
 * For any matched row, only NULL columns in the database are updated —
 * existing non-null values are never overwritten.
 *
 * @returns JSON with `{ updated, notFound, skipped, errors }` counts.
 */
export async function POST(request: Request) {
  // Only admins can enrich leads
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCsv(text);

  if (rows.length < 2) {
    return NextResponse.json({ message: 'CSV has no data rows' }, { status: 400 });
  }

  // Normalise headers: lowercase, strip spaces/underscores/hyphens
  const headers = rows[0]!.map(h => h.toLowerCase().replace(/[\s_\-]+/g, ''));

  // Helper: find the first matching column index among the given aliases
  function col(...aliases: string[]): number {
    for (const alias of aliases) {
      const idx = headers.indexOf(alias);
      if (idx !== -1) return idx;
    }
    return -1;
  }

  // Map all known column aliases to their indices in the CSV
  const IDX = {
    // Match key: all three must be present in the CSV row to attempt a match
    firstName: col('firstname', 'first name', 'fname'),
    lastName: col('lastname', 'last name', 'lname'),
    linkedIn: col('personlinkedinurl', 'linkedinurl', 'linkedin', 'linkedin url', 'profileurl'),

    // Enrichment fields: any of these that are non-null in the CSV but null in the DB will be updated
    jobTitle: col('jobtitle', 'job title', 'title', 'position'),
    personCountry: col('personcountry', 'country'),
    companyName: col('companyname', 'company name', 'company', 'organization'),
    companyIndustry: col('companyindustry', 'company industry', 'industry'),
    companySize: col('companysize', 'company size', 'employees', 'headcount', 'numberofemployees'),
    companyCity: col('companycity', 'company city', 'city'),
    workEmail: col('workemail', 'work email', 'email', 'businessemail'),
    phone1: col('phone1', 'phone', 'phonenumber', 'mobile'),
    phone2: col('phone2', 'phone 2', 'mobilephone'),
    websiteUrl: col('websiteurl', 'website', 'website url', 'companywebsite', 'company website', 'url', 'homepage'),
    avatarUrl: col('avatarurl', 'avatar', 'avatar url', 'photo', 'photourl', 'imageurl'),
  };

  // Track statistics for the response summary
  let updated = 0;
  let notFound = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!;
    // Helper: read a cell value by column index, return null if missing or empty
    const get = (idx: number) => (idx >= 0 ? row[idx]?.trim() || null : null);

    try {
      // ── Match key ────────────────────────────────────────────────────────
      // All three match-key fields must be present in this CSV row
      const firstName = get(IDX.firstName);
      const lastName = get(IDX.lastName);
      const linkedIn = get(IDX.linkedIn);

      if (!firstName || !lastName || !linkedIn) {
        // Skip rows that are missing match keys — can't identify which lead to update
        skipped++;
        continue;
      }

      // Find the existing lead row by exact match on all three key fields (case-insensitive)
      const [existing] = await db
        .select()
        .from(leadDataSchema)
        .where(
          and(
            eq(sql`LOWER(${leadDataSchema.firstName})`, firstName.toLowerCase()),
            eq(sql`LOWER(${leadDataSchema.lastName})`, lastName.toLowerCase()),
            eq(sql`LOWER(${leadDataSchema.personalLinkedIn})`, linkedIn.toLowerCase()),
          ),
        )
        .limit(1);

      if (!existing) {
        // No matching lead found in the database — record as notFound
        notFound++;
        continue;
      }

      // ── Build the patch object ────────────────────────────────────────────
      // Only set fields that are NULL in the existing row AND have a value in the CSV.
      // This ensures we never overwrite existing data — we only fill in gaps.
      const patch: Record<string, unknown> = {};

      // avatarUrl: fill if DB row is missing it
      const avatarUrlVal = get(IDX.avatarUrl);
      if (avatarUrlVal && !existing.avatarUrl) patch.avatarUrl = avatarUrlVal;

      // websiteUrl: fill if DB row is missing it
      const websiteUrlVal = get(IDX.websiteUrl);
      if (websiteUrlVal && !existing.websiteUrl) patch.websiteUrl = websiteUrlVal;

      // personalLinkedIn: the match key itself — already present; skip enrichment for this field

      // workEmail: fill if DB row is missing it
      const workEmailVal = get(IDX.workEmail);
      if (workEmailVal && !existing.workEmail) patch.workEmail = workEmailVal;

      // phone1: fill if DB row is missing it
      const phone1Val = get(IDX.phone1);
      if (phone1Val && !existing.phone1) patch.phone1 = phone1Val;

      // phone2: fill if DB row is missing it
      const phone2Val = get(IDX.phone2);
      if (phone2Val && !existing.phone2) patch.phone2 = phone2Val;

      // jobTitleId: resolve FK and fill if DB row is missing it
      if (!existing.jobTitleId) {
        const jobTitleText = get(IDX.jobTitle);
        if (jobTitleText) patch.jobTitleId = await upsertJobTitle(jobTitleText);
      }

      // countryId: resolve FK and fill if DB row is missing it
      if (!existing.countryId) {
        const countryText = get(IDX.personCountry);
        if (countryText) patch.countryId = await upsertCountry(countryText);
      }

      // cityId: resolve FK (uses countryId if we just resolved one) and fill if missing
      if (!existing.cityId) {
        const cityText = get(IDX.companyCity);
        if (cityText) {
          // Use the newly resolved countryId if we have it, otherwise fallback to existing
          const countryIdForCity = (patch.countryId as number | undefined) ?? existing.countryId ?? 0;
          patch.cityId = await upsertCity(cityText, countryIdForCity);
        }
      }

      // companyId: resolve FK and fill if DB row is missing it
      if (!existing.companyId) {
        const companyText = get(IDX.companyName);
        if (companyText) patch.companyId = await upsertCompany(companyText);
      }

      // companyIndustryId: resolve FK and fill if DB row is missing it
      if (!existing.companyIndustryId) {
        const industryText = get(IDX.companyIndustry);
        if (industryText) patch.companyIndustryId = await upsertIndustry(industryText);
      }

      // companySizeId: resolve FK and fill if DB row is missing it
      if (!existing.companySizeId) {
        const sizeText = get(IDX.companySize);
        if (sizeText) patch.companySizeId = await upsertCompanySize(sizeText);
      }

      // If nothing needs updating, count as skipped
      if (Object.keys(patch).length === 0) {
        skipped++;
        continue;
      }

      // Apply the patch — only updates the columns included in patch
      await db
        .update(leadDataSchema)
        .set(patch)
        .where(eq(leadDataSchema.id, existing.id));

      updated++;
    } catch (err) {
      errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  return NextResponse.json({ updated, notFound, skipped, errors });
}
