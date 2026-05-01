import { and, eq, inArray, or } from 'drizzle-orm';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import {
  citySchema,
  companyIndustrySchema,
  companySchema,
  companySizeSchema,
  countrySchema,
  exportJobSchema,
  jobTitleSchema,
  leadDataSchema,
  leadSkillSchema,
  leadTechnologySchema,
  revealedContactSchema,
  userSettingsSchema,
  userSubscriptionSchema,
} from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

function toCsv(rows: Record<string, string | null | undefined>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]!);
  const escape = (v: string | null | undefined) => {
    if (v == null) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
  ].join('\n');
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { userId } = auth;
  const body = await request.json();

  // Check subscription
  const [subscription] = await db
    .select({ plan: userSubscriptionSchema.plan, status: userSubscriptionSchema.status })
    .from(userSubscriptionSchema)
    .where(eq(userSubscriptionSchema.userId, userId))
    .limit(1);

  const isUnlimited = subscription?.plan === 'unlimited' && subscription.status === 'active';

  // Mode 2: background job (select-all or enter-number)
  if (body.export === true) {
    const [job] = await db
      .insert(exportJobSchema)
      .values({ userId, status: 'pending' })
      .returning({ id: exportJobSchema.id });

    // Process asynchronously (fire-and-forget for now)
    processBackgroundExport(job!.id, userId, body, isUnlimited).catch(() => {});

    return NextResponse.json({ jobId: job!.id, status: 'pending' });
  }

  // Mode 1: specific persons — synchronous
  const { selectedPersons }: { selectedPersons: number[] } = body;

  if (!selectedPersons?.length) {
    return NextResponse.json({ message: 'No persons selected' }, { status: 422 });
  }

  const [job] = await db
    .insert(exportJobSchema)
    .values({ userId, status: 'processing' })
    .returning({ id: exportJobSchema.id });

  try {
    const csvData = await buildCsv(userId, selectedPersons);
    const downloadUrl = await saveCsvFile(job!.id, csvData);

    await db
      .update(exportJobSchema)
      .set({ status: 'completed', downloadUrl })
      .where(eq(exportJobSchema.id, job!.id));

    // ── Fire lead.exported webhook (sync path) ─────────────────────────────
    // Fire-and-forget — webhook failures must never block the export response.
    import('@/utils/FireWebhooks').then(({ fireWebhooks }) => {
      fireWebhooks(userId, 'lead.exported', {
        jobId: job!.id,
        downloadUrl,
      }).catch(() => {});
    }).catch(() => {});

    return NextResponse.json({ jobId: job!.id, downloadUrl, status: 'completed' });
  } catch (err) {
    await db
      .update(exportJobSchema)
      .set({ status: 'failed', error: String(err) })
      .where(eq(exportJobSchema.id, job!.id));
    return NextResponse.json({ message: 'Export failed' }, { status: 500 });
  }
}

// ── Column key → CSV header label mapping ─────────────────────────────────────
// Must match the keys used in ExportColumnSorter in SettingsView.tsx.
const COLUMN_HEADER: Record<string, string> = {
  firstName:       'First name',
  lastName:        'Last name',
  workEmail:       'Work email',
  personalEmail:   'Personal email',
  phone1:          'Phone 1',
  phone2:          'Phone 2',
  jobTitle:        'Job title',
  company:         'Company',
  city:            'City',
  country:         'Country',
  linkedIn:        'LinkedIn URL',
  industry:        'Industry',
  companySize:     'Company size',
  department:      'Department',
  managementLevel: 'Mgmt level',
};

// Default column order if the user has not saved a preference
const DEFAULT_COLUMNS = [
  'firstName', 'lastName', 'workEmail', 'personalEmail',
  'phone1', 'phone2', 'jobTitle', 'company', 'city', 'country',
  'linkedIn', 'industry', 'companySize',
];

async function buildCsv(userId: number, personIds: number[]): Promise<string> {
  // ── Load user's saved export column preference ────────────────────────────
  const [settings] = await db
    .select({ exportColumnsJson: userSettingsSchema.exportColumnsJson })
    .from(userSettingsSchema)
    .where(eq(userSettingsSchema.userId, userId))
    .limit(1);

  // Parse the saved column order; fall back to defaults if empty or invalid
  let exportColumns: string[] = DEFAULT_COLUMNS;
  if (settings?.exportColumnsJson) {
    try {
      const parsed = JSON.parse(settings.exportColumnsJson) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) exportColumns = parsed;
    } catch { /* use default */ }
  }

  const [leads, revealedRows] = await Promise.all([
    db
      .select({
        id: leadDataSchema.id,
        firstName: leadDataSchema.firstName,
        lastName: leadDataSchema.lastName,
        // company_name lives in the normalised company table — join to get it
        companyName: companySchema.companyName,
        jobTitle: jobTitleSchema.title,
        city: citySchema.name,
        country: countrySchema.name,
        linkedIn: leadDataSchema.personalLinkedIn,
        websiteUrl: leadDataSchema.websiteUrl,
        // Industry name from company_industry table
        industry: companyIndustrySchema.name,
        // Company size label from company_size table
        companySize: companySizeSchema.label,
      })
      .from(leadDataSchema)
      .leftJoin(companySchema, eq(leadDataSchema.companyId, companySchema.id))
      .leftJoin(jobTitleSchema, eq(leadDataSchema.jobTitleId, jobTitleSchema.id))
      .leftJoin(citySchema, eq(leadDataSchema.cityId, citySchema.id))
      .leftJoin(countrySchema, eq(leadDataSchema.countryId, countrySchema.id))
      .leftJoin(companyIndustrySchema, eq(leadDataSchema.companyIndustryId, companyIndustrySchema.id))
      .leftJoin(companySizeSchema, eq(leadDataSchema.companySizeId, companySizeSchema.id))
      .where(inArray(leadDataSchema.id, personIds)),
    db
      .select()
      .from(revealedContactSchema)
      .where(
        and(
          eq(revealedContactSchema.userId, userId),
          inArray(revealedContactSchema.personId, personIds),
        ),
      ),
  ]);

  const revealedMap = new Map(revealedRows.map(r => [r.personId, r]));

  // Build the full data map per row, then filter + reorder by the user's column preference
  const rows = leads.map((l) => {
    const rev = revealedMap.get(l.id);

    // All possible column values keyed by the SettingsView column key
    const allCols: Record<string, string | null | undefined> = {
      firstName:       l.firstName,
      lastName:        l.lastName,
      workEmail:       rev?.workEmail,
      personalEmail:   rev?.personalEmail,
      phone1:          rev?.phone1,
      phone2:          rev?.phone2,
      jobTitle:        l.jobTitle,
      company:         l.companyName,
      city:            l.city,
      country:         l.country,
      linkedIn:        l.linkedIn,
      industry:        l.industry,
      companySize:     l.companySize,
      department:      null, // available in schema but not joined here
      managementLevel: null, // same — extend the join if needed
    };

    // Build output row with only the user's selected columns in their preferred order
    const row: Record<string, string | null | undefined> = {};
    for (const key of exportColumns) {
      const header = COLUMN_HEADER[key] ?? key;
      row[header] = allCols[key] ?? null;
    }
    return row;
  });

  return toCsv(rows);
}

async function saveCsvFile(jobId: number, csv: string): Promise<string> {
  const dir = join(process.cwd(), 'public', 'exports');
  await mkdir(dir, { recursive: true });
  const filename = `export-${jobId}-${Date.now()}.csv`;
  await writeFile(join(dir, filename), csv, 'utf-8');
  return `/exports/${filename}`;
}

async function processBackgroundExport(
  jobId: number,
  userId: number,
  body: Record<string, unknown>,
  _isUnlimited: boolean,
) {
  await db
    .update(exportJobSchema)
    .set({ status: 'processing' })
    .where(eq(exportJobSchema.id, jobId));

  try {
    // Read limit (default 25,000) and filter payload from the request body
    const limit = typeof body.limit === 'number' ? body.limit : 25000;
    const filters = (body.filters ?? {}) as Record<string, unknown>;

    const {
      jobTitleIds,
      locationIds,
      industryIds,
      technologyIds,
      skillIds,
      managementLevelIds,
      departmentIds,
      companySizeIds,
      companies,
      educationMajorIds,
      countryIds,
    } = filters as {
      jobTitleIds?: number[];
      locationIds?: number[];
      industryIds?: number[];
      technologyIds?: number[];
      skillIds?: number[];
      managementLevelIds?: number[];
      departmentIds?: number[];
      companySizeIds?: number[];
      companies?: number[];
      educationMajorIds?: number[];
      countryIds?: number[];
    };

    // Build OR conditions from filters — same logic as /api/leads/search
    const orConditions = [];

    if (jobTitleIds?.length) orConditions.push(inArray(leadDataSchema.jobTitleId, jobTitleIds));
    if (managementLevelIds?.length) orConditions.push(inArray(leadDataSchema.managementLevelId, managementLevelIds));
    if (departmentIds?.length) orConditions.push(inArray(leadDataSchema.departmentId, departmentIds));
    if (locationIds?.length) orConditions.push(inArray(leadDataSchema.cityId, locationIds));
    if (countryIds?.length) orConditions.push(inArray(leadDataSchema.countryId, countryIds));
    if (companySizeIds?.length) orConditions.push(inArray(leadDataSchema.companySizeId, companySizeIds));
    if (industryIds?.length) orConditions.push(inArray(leadDataSchema.companyIndustryId, industryIds));
    if (companies?.length) orConditions.push(inArray(leadDataSchema.companyId, companies));

    // Technology filter via join table
    if (technologyIds?.length) {
      const leadIdsWithTech = db
        .selectDistinct({ leadId: leadTechnologySchema.leadId })
        .from(leadTechnologySchema)
        .where(inArray(leadTechnologySchema.technologyId, technologyIds));
      orConditions.push(inArray(leadDataSchema.id, leadIdsWithTech));
    }

    // Skill filter via join table
    if (skillIds?.length) {
      const leadIdsWithSkill = db
        .selectDistinct({ leadId: leadSkillSchema.leadId })
        .from(leadSkillSchema)
        .where(inArray(leadSkillSchema.skillId, skillIds));
      orConditions.push(inArray(leadDataSchema.id, leadIdsWithSkill));
    }

    // Education major filter via ilike on education name
    if (educationMajorIds?.length) {
      orConditions.push(inArray(leadDataSchema.educationId, educationMajorIds));
    }

    // Combine: if any OR conditions exist, apply them; otherwise no WHERE clause (all leads)
    const whereClause = orConditions.length > 0 ? or(...orConditions) : undefined;

    // Fetch up to `limit` matching lead IDs
    const query = db
      .select({ id: leadDataSchema.id })
      .from(leadDataSchema)
      .limit(limit);

    const allPersonIds = whereClause
      ? await query.where(whereClause)
      : await query;

    const personIds = allPersonIds.map(r => r.id);

    const csvData = await buildCsv(userId, personIds);
    const downloadUrl = await saveCsvFile(jobId, csvData);

    await db
      .update(exportJobSchema)
      .set({ status: 'completed', downloadUrl })
      .where(eq(exportJobSchema.id, jobId));

    // ── Fire lead.exported webhook (background path) ───────────────────────
    // Fire-and-forget — webhook failures must never block background processing.
    import('@/utils/FireWebhooks').then(({ fireWebhooks }) => {
      fireWebhooks(userId, 'lead.exported', {
        jobId,
        downloadUrl,
        recordCount: personIds.length,
      }).catch(() => {});
    }).catch(() => {});
  } catch (err) {
    await db
      .update(exportJobSchema)
      .set({ status: 'failed', error: String(err) })
      .where(eq(exportJobSchema.id, jobId));
  }
}
