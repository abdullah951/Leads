import { eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import {
  citySchema,
  companySizeSchema,
  companyIndustrySchema,
  companySchema,
  countrySchema,
  jobTitleSchema,
  leadDataSchema,
} from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

/* ── CSV parser ──────────────────────────────────────────────────────── */

/**
 * Parses a CSV string into rows of string arrays, handling quoted fields.
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

/* ── Lookup helpers (upsert-or-get) ──────────────────────────────────── */

const jobTitleCache = new Map<string, number>();
const countryCache = new Map<string, number>();
const cityCache = new Map<string, number>();
const industryCache = new Map<string, number>();
const sizeCache = new Map<string, number>();
// Cache for company name → company.id lookups to avoid repeated DB round-trips
const companyCache = new Map<string, number>();

async function upsertJobTitle(title: string): Promise<number> {
  const key = title.toLowerCase();
  if (jobTitleCache.has(key)) return jobTitleCache.get(key)!;
  const existing = await db.select({ id: jobTitleSchema.id }).from(jobTitleSchema)
    .where(eq(sql`LOWER(${jobTitleSchema.title})`, key))
    .limit(1);
  if (existing[0]) {
    jobTitleCache.set(key, existing[0].id);
    return existing[0].id;
  }
  const inserted = await db.insert(jobTitleSchema).values({ title }).returning({ id: jobTitleSchema.id });
  jobTitleCache.set(key, inserted[0]!.id);
  return inserted[0]!.id;
}

async function upsertCountry(name: string): Promise<number> {
  const key = name.toLowerCase();
  if (countryCache.has(key)) return countryCache.get(key)!;
  const existing = await db.select({ id: countrySchema.id }).from(countrySchema)
    .where(eq(sql`LOWER(${countrySchema.name})`, key))
    .limit(1);
  if (existing[0]) {
    countryCache.set(key, existing[0].id);
    return existing[0].id;
  }
  const code = name.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 20);
  // Handle duplicate code by appending a suffix
  const safeCode = `${code}_${Date.now().toString(36).slice(-4)}`;
  const inserted = await db.insert(countrySchema)
    .values({ name: name.trim(), code: safeCode })
    .returning({ id: countrySchema.id });
  countryCache.set(key, inserted[0]!.id);
  return inserted[0]!.id;
}

async function upsertCity(cityName: string, countryId: number): Promise<number> {
  const key = `${cityName.toLowerCase()}::${countryId}`;
  if (cityCache.has(key)) return cityCache.get(key)!;
  const existing = await db.select({ id: citySchema.id }).from(citySchema)
    .where(eq(sql`LOWER(${citySchema.name})`, cityName.toLowerCase()))
    .limit(1);
  if (existing[0]) {
    cityCache.set(key, existing[0].id);
    return existing[0].id;
  }
  const inserted = await db.insert(citySchema)
    .values({ name: cityName.trim(), countryId })
    .returning({ id: citySchema.id });
  cityCache.set(key, inserted[0]!.id);
  return inserted[0]!.id;
}

async function upsertIndustry(name: string): Promise<number> {
  const key = name.toLowerCase();
  if (industryCache.has(key)) return industryCache.get(key)!;
  const existing = await db.select({ id: companyIndustrySchema.id }).from(companyIndustrySchema)
    .where(eq(sql`LOWER(${companyIndustrySchema.name})`, key))
    .limit(1);
  if (existing[0]) {
    industryCache.set(key, existing[0].id);
    return existing[0].id;
  }
  const inserted = await db.insert(companyIndustrySchema)
    .values({ name: name.trim() })
    .returning({ id: companyIndustrySchema.id });
  industryCache.set(key, inserted[0]!.id);
  return inserted[0]!.id;
}

/**
 * Upsert a company name into the `company` table and return its ID.
 * Uses an in-memory cache to avoid redundant DB round-trips within the same request.
 *
 * @param name - Company name string from the CSV row.
 * @returns The integer PK of the company row.
 */
async function upsertCompany(name: string): Promise<number> {
  // Normalise to lowercase for cache key (DB lookup is case-sensitive on unique col)
  const key = name.toLowerCase();
  if (companyCache.has(key)) return companyCache.get(key)!;

  // Try to find an existing row by exact name match (unique constraint)
  const existing = await db.select({ id: companySchema.id }).from(companySchema)
    .where(eq(sql`LOWER(${companySchema.companyName})`, key))
    .limit(1);

  if (existing[0]) {
    companyCache.set(key, existing[0].id);
    return existing[0].id;
  }

  // Insert new company row; onConflictDoNothing handles any race condition
  const inserted = await db.insert(companySchema)
    .values({ companyName: name.trim() })
    .returning({ id: companySchema.id });
  companyCache.set(key, inserted[0]!.id);
  return inserted[0]!.id;
}

async function upsertCompanySize(label: string): Promise<number> {
  const key = label.toLowerCase();
  if (sizeCache.has(key)) return sizeCache.get(key)!;
  const existing = await db.select({ id: companySizeSchema.id }).from(companySizeSchema)
    .where(eq(sql`LOWER(${companySizeSchema.label})`, key))
    .limit(1);
  if (existing[0]) {
    sizeCache.set(key, existing[0].id);
    return existing[0].id;
  }
  // Strip "Size: " prefix if present and parse range
  const clean = label.replace(/^size:\s*/i, '').trim();
  const inserted = await db.insert(companySizeSchema)
    .values({ label: clean })
    .returning({ id: companySizeSchema.id });
  sizeCache.set(key, inserted[0]!.id);
  return inserted[0]!.id;
}

/* ── Route handler ───────────────────────────────────────────────────── */

export async function POST(request: Request) {
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

  // Map header names to column indices.
  // Normalise each header to lowercase with all spaces, underscores, and hyphens removed
  // so we can match common CSV export variants regardless of casing or separator style.
  // e.g. "Company Industry", "company_industry", "CompanyIndustry" all normalise to "companyindustry"
  const headers = rows[0]!.map(h => h.toLowerCase().replace(/[\s_\-]+/g, ''));

  // Returns the first matching column index for any of the provided normalised aliases.
  // Returns -1 if none of the aliases are found (same as Array.indexOf when not found).
  function col(...aliases: string[]): number {
    for (const alias of aliases) {
      const idx = headers.indexOf(alias);
      if (idx !== -1) return idx;
    }
    return -1;
  }

  const IDX = {
    firstName: col('firstname', 'first name', 'fname'),
    lastName: col('lastname', 'last name', 'lname'),
    jobTitle: col('jobtitle', 'job title', 'title', 'position'),
    linkedIn: col('personlinkedinurl', 'linkedinurl', 'linkedin', 'linkedin url', 'profileurl'),
    personCountry: col('personcountry', 'country'),
    companyName: col('companyname', 'company name', 'company', 'organization'),
    // Accept all common variations: "CompanyIndustry", "Company Industry", "company_industry", "Industry"
    companyIndustry: col('companyindustry', 'company industry', 'industry'),
    companySize: col('companysize', 'company size', 'employees', 'headcount', 'numberofemployees'),
    companyCity: col('companycity', 'company city', 'city'),
    workEmail: col('workemail', 'work email', 'email', 'businessemail'),
    personalEmail: col('personalemail', 'personal email'),
    phone1: col('phone1', 'phone', 'phonenumber', 'mobile'),
    phone2: col('phone2', 'phone 2', 'mobilephone'),
    // Website URL — accept common header names from various CRM exports
    websiteUrl: col('websiteurl', 'website', 'website url', 'companywebsite', 'company website', 'url', 'homepage'),
  };

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!;
    const get = (idx: number) => (idx >= 0 ? row[idx]?.trim() || null : null);

    try {
      // Resolve FK IDs
      const jobTitleText = get(IDX.jobTitle);
      const jobTitleId = jobTitleText ? await upsertJobTitle(jobTitleText) : null;

      const personCountryText = get(IDX.personCountry);
      const countryId = personCountryText ? await upsertCountry(personCountryText) : null;

      const companyCityText = get(IDX.companyCity);
      const cityId = companyCityText
        ? await upsertCity(companyCityText, countryId ?? 0)
        : null;

      const industryText = get(IDX.companyIndustry);
      const companyIndustryId = industryText ? await upsertIndustry(industryText) : null;

      const sizeText = get(IDX.companySize);
      const companySizeId = sizeText ? await upsertCompanySize(sizeText) : null;

      // Upsert company name into the normalised company table and get its FK
      const companyNameText = get(IDX.companyName);
      const companyId = companyNameText ? await upsertCompany(companyNameText) : null;

      const workEmail = get(IDX.workEmail);
      const personalEmail = get(IDX.personalEmail);
      const phone1 = get(IDX.phone1);
      const phone2 = get(IDX.phone2);

      await db.insert(leadDataSchema).values({
        firstName: get(IDX.firstName),
        lastName: get(IDX.lastName),
        personalLinkedIn: get(IDX.linkedIn),
        // Website URL — store raw value from CSV; API filters out bare "http://" at query time
        websiteUrl: get(IDX.websiteUrl),
        // Use FK to company table instead of inline text column
        companyId,
        workEmail: workEmail || null,
        personalEmail: personalEmail || null,
        phone1: phone1 || null,
        phone2: phone2 || null,
        jobTitleId,
        countryId,
        cityId,
        companyIndustryId,
        companySizeId,
      }).onConflictDoNothing();

      inserted++;
    } catch (err) {
      skipped++;
      errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  return NextResponse.json({ inserted, skipped, errors });
}
