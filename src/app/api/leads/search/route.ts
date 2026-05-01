import * as fs from 'node:fs';
import { and, eq, ilike, inArray, isNotNull, isNull, notInArray, or, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import {
  citySchema,
  companyIndustrySchema,
  companySchema,
  countrySchema,
  educationSchema,
  jobTitleSchema,
  leadDataSchema,
  leadSkillSchema,
  leadTechnologySchema,
  listLeadSchema,
  revealedContactSchema,
  uploadedFileSchema,
  userSubscriptionSchema,
} from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { userId } = auth;
  const body = await request.json();

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
    listId,
    page = 1,
    pageSize = 25,
    hasWorkEmail,
    hasPersonalEmail,
    hasPhone,
    countryIds,
    haveBachelor,
    haveMaster,
    haveAssociate,
    haveDoctorate,
    fullName,
    // File-chip filter IDs — arrays of uploaded_file PKs (OR logic across files)
    includeEmailFileIds,
    excludeEmailFileIds,
    includeLinkedInFileIds,
    excludeLinkedInFileIds,
    // Keyword arrays for job_title ILIKE search — each label becomes '%keyword%'
    // These come from the selected management level and department checkbox labels
    managementLevelKeywords,
    departmentKeywords,
  } = body;

  /**
   * Parses a single CSV column from raw file content.
   * Reads every row, skips header if `firstRowIsHeader` is true,
   * and extracts the value at the given 0-based column index.
   *
   * @param content - Raw CSV file contents as a string.
   * @param colIndex - 0-based column index to extract.
   * @param firstRowIsHeader - Whether to skip the first row.
   * @returns Deduplicated, trimmed, non-empty array of values from that column.
   */
  function parseCsvColumn(content: string, colIndex: number, firstRowIsHeader: boolean): string[] {
    const lines = content.split(/\r?\n/);
    // Skip header row when flagged
    const dataLines = firstRowIsHeader ? lines.slice(1) : lines;
    const values = new Set<string>();
    for (const line of dataLines) {
      if (!line.trim()) continue;
      // Split on comma; handle basic quoted fields by stripping surrounding quotes
      const cols = line.split(',');
      const raw = cols[colIndex];
      if (raw == null) continue;
      const val = raw.trim().replace(/^["']|["']$/g, '').trim().toLowerCase();
      if (val) values.add(val);
    }
    return [...values];
  }

  /**
   * Loads a specific column from an uploaded CSV file, verifying ownership.
   * Returns an empty array if the file doesn't exist, isn't owned by this user,
   * or the column is not mapped.
   *
   * @param fileId - PK of the uploaded_file row to load.
   * @param colType - Which column to extract ('email' | 'linkedin').
   * @param ownerUserId - userId to verify file ownership.
   * @returns Array of lowercased, trimmed values from the requested column.
   */
  async function loadFileColumn(fileId: number, colType: 'email' | 'linkedin', ownerUserId: number): Promise<string[]> {
    // Fetch the file record and confirm ownership in one query
    const [fileRow] = await db
      .select({
        filePath: uploadedFileSchema.filePath,
        firstRowIsHeader: uploadedFileSchema.firstRowIsHeader,
        emailColumn: uploadedFileSchema.emailColumn,
        linkedInColumn: uploadedFileSchema.linkedInColumn,
      })
      .from(uploadedFileSchema)
      .where(and(eq(uploadedFileSchema.id, fileId), eq(uploadedFileSchema.userId, ownerUserId)))
      .limit(1);

    // File not found or not owned by this user — skip silently
    if (!fileRow) return [];

    // Determine which column index to use based on the requested type
    const colIndex = colType === 'email' ? fileRow.emailColumn : fileRow.linkedInColumn;
    // Column not mapped for this file — skip
    if (colIndex == null) return [];

    // Read the file from disk — skip if missing
    let content: string;
    try {
      content = fs.readFileSync(fileRow.filePath, 'utf-8');
    } catch {
      return [];
    }

    return parseCsvColumn(content, colIndex, fileRow.firstRowIsHeader);
  }

  /**
   * Unions values from multiple uploaded CSV files into a single deduplicated array.
   * Files that fail to load are silently skipped.
   *
   * @param fileIds - Array of uploaded_file PKs to load.
   * @param colType - Which column to extract from each file.
   * @param ownerUserId - userId for ownership verification.
   * @returns Flat, deduplicated array of all values across all files.
   */
  async function loadUnionFromFiles(fileIds: number[], colType: 'email' | 'linkedin', ownerUserId: number): Promise<string[]> {
    // Load all files in parallel and union results
    const arrays = await Promise.all(fileIds.map(id => loadFileColumn(id, colType, ownerUserId)));
    // Deduplicate across all files using a Set
    const union = new Set<string>();
    for (const arr of arrays) {
      for (const v of arr) union.add(v);
    }
    return [...union];
  }

  const take = pageSize;
  const skip = (page - 1) * pageSize;

  // OR group — a lead matches if it satisfies ANY of these conditions
  const orConditions = [];
  // AND group — hard constraints every matching lead must satisfy
  const andConditions = [];

  if (jobTitleIds?.length) {
    orConditions.push(inArray(leadDataSchema.jobTitleId, jobTitleIds));
  }
  if (managementLevelIds?.length) {
    orConditions.push(inArray(leadDataSchema.managementLevelId, managementLevelIds));
  }

  // Job title keyword search for management level labels (e.g. "Director" matches
  // "Sales Director", "Director of Engineering", "Senior Director", etc.)
  // Each selected label becomes an ILIKE '%label%' condition on the job_title table,
  // all OR'd together into a single subquery.
  if (managementLevelKeywords?.length) {
    const keywordClauses = (managementLevelKeywords as string[]).map(kw =>
      ilike(jobTitleSchema.title, `%${kw}%`),
    );
    // Subquery: collect all job_title IDs whose title matches any keyword
    const matchingJobTitleIds = db
      .select({ id: jobTitleSchema.id })
      .from(jobTitleSchema)
      .where(or(...keywordClauses)!);
    orConditions.push(inArray(leadDataSchema.jobTitleId, matchingJobTitleIds));
  }

  if (departmentIds?.length) {
    orConditions.push(inArray(leadDataSchema.departmentId, departmentIds));
  }

  // Job title keyword search for department labels (e.g. "Engineering" matches
  // "Software Engineering Manager", "Head of Engineering", etc.)
  if (departmentKeywords?.length) {
    const keywordClauses = (departmentKeywords as string[]).map(kw =>
      ilike(jobTitleSchema.title, `%${kw}%`),
    );
    const matchingJobTitleIds = db
      .select({ id: jobTitleSchema.id })
      .from(jobTitleSchema)
      .where(or(...keywordClauses)!);
    orConditions.push(inArray(leadDataSchema.jobTitleId, matchingJobTitleIds));
  }
  if (locationIds?.length) {
    orConditions.push(inArray(leadDataSchema.cityId, locationIds));
  }
  if (countryIds?.length) {
    orConditions.push(inArray(leadDataSchema.countryId, countryIds));
  }
  if (companySizeIds?.length) {
    orConditions.push(inArray(leadDataSchema.companySizeId, companySizeIds));
  }
  if (industryIds?.length) {
    orConditions.push(inArray(leadDataSchema.companyIndustryId, industryIds));
  }
  if (companies?.length) {
    // companies is now an array of company IDs (integers) from the normalised company table
    orConditions.push(inArray(leadDataSchema.companyId, companies));
  }
  if (educationMajorIds?.length) {
    orConditions.push(inArray(leadDataSchema.educationId, educationMajorIds));
  }

  // Contact presence filters — these must NOT be in the main OR group because they
  // would match nearly every lead (workEmail IS NOT NULL is true for most rows),
  // making all other OR conditions irrelevant.
  //
  // Instead they form their OWN OR group that is AND'd into andConditions:
  //   "lead must have at least one of the checked contact types"
  //
  // e.g. hasWorkEmail=true AND hasPersonalEmail=true means:
  //   AND (workEmail IS NOT NULL OR personalEmail IS NOT NULL)
  const contactPresenceClauses = [];
  if (hasWorkEmail === true) {
    contactPresenceClauses.push(isNotNull(leadDataSchema.workEmail));
  }
  if (hasPersonalEmail === true) {
    contactPresenceClauses.push(isNotNull(leadDataSchema.personalEmail));
  }
  if (hasPhone === true) {
    contactPresenceClauses.push(isNotNull(leadDataSchema.phone1));
  }
  // Only add the AND condition when at least one contact type is required
  if (contactPresenceClauses.length > 0) {
    andConditions.push(or(...contactPresenceClauses)!);
  }

  // Education degree filter — included in OR group
  const degreeKeywords: string[] = [];
  if (haveBachelor === true) degreeKeywords.push('bachelor');
  if (haveMaster === true) degreeKeywords.push('master');
  if (haveAssociate === true) degreeKeywords.push('associate');
  if (haveDoctorate === true) degreeKeywords.push('doctorate');
  if (degreeKeywords.length > 0) {
    const degreeLeadIds = db
      .selectDistinct({ id: leadDataSchema.id })
      .from(leadDataSchema)
      .innerJoin(educationSchema, eq(leadDataSchema.educationId, educationSchema.id))
      .where(or(...degreeKeywords.map(k => ilike(educationSchema.name, `%${k}%`)))!);
    orConditions.push(inArray(leadDataSchema.id, degreeLeadIds));
  }

  // Search query — matches against fullName, work email, personal email, and LinkedIn URL (OR logic)
  // This allows users to search by any identifier: name, email address, or LinkedIn profile URL
  if (fullName && typeof fullName === 'string' && fullName.trim()) {
    const term = `%${fullName.trim().toLowerCase()}%`;
    orConditions.push(
      or(
        // Match first name alone
        ilike(leadDataSchema.firstName, term),
        // Match last name alone
        ilike(leadDataSchema.lastName, term),
        // Match full "First Last" concatenated name
        sql`LOWER(CONCAT(${leadDataSchema.firstName}, ' ', ${leadDataSchema.lastName})) LIKE ${term}`,
        // Match work email address
        ilike(leadDataSchema.workEmail, term),
        // Match personal email address
        ilike(leadDataSchema.personalEmail, term),
        // Match LinkedIn profile URL
        ilike(leadDataSchema.personalLinkedIn, term),
      )!,
    );
  }

  // Technology filter — included in OR group
  if (technologyIds?.length) {
    const leadIdsWithTech = db
      .selectDistinct({ leadId: leadTechnologySchema.leadId })
      .from(leadTechnologySchema)
      .where(inArray(leadTechnologySchema.technologyId, technologyIds));
    orConditions.push(inArray(leadDataSchema.id, leadIdsWithTech));
  }

  // Skills filter — included in OR group
  if (skillIds?.length) {
    const leadIdsWithSkill = db
      .selectDistinct({ leadId: leadSkillSchema.leadId })
      .from(leadSkillSchema)
      .where(inArray(leadSkillSchema.skillId, skillIds));
    orConditions.push(inArray(leadDataSchema.id, leadIdsWithSkill));
  }

  // List filter — included in OR group
  if (listId != null) {
    const leadIdsInList = db
      .selectDistinct({ leadId: listLeadSchema.leadId })
      .from(listLeadSchema)
      .where(eq(listLeadSchema.listId, listId));
    orConditions.push(inArray(leadDataSchema.id, leadIdsInList));
  }

  // AND group (continued) — include/exclude by uploaded CSV file columns

  // Include by email files — union emails from all selected files, lead must match any
  if (includeEmailFileIds?.length) {
    const emails = await loadUnionFromFiles(includeEmailFileIds, 'email', userId);
    if (emails.length > 0) {
      // Use (IS NOT NULL AND IN) explicitly so NULL columns are treated as non-matching
      // rather than relying on implicit NULL-falsy behaviour in SQL
      andConditions.push(
        or(
          and(isNotNull(leadDataSchema.workEmail), inArray(leadDataSchema.workEmail, emails))!,
          and(isNotNull(leadDataSchema.personalEmail), inArray(leadDataSchema.personalEmail, emails))!,
        )!,
      );
    }
  }

  // Exclude by email files — union emails from all selected files, lead must NOT match any
  if (excludeEmailFileIds?.length) {
    const emails = await loadUnionFromFiles(excludeEmailFileIds, 'email', userId);
    if (emails.length > 0) {
      // Use (IS NULL OR NOT IN) so NULL email columns evaluate to TRUE (keep lead),
      // not NULL (which would silently drop the lead from results).
      andConditions.push(or(isNull(leadDataSchema.workEmail), notInArray(leadDataSchema.workEmail, emails))!);
      andConditions.push(or(isNull(leadDataSchema.personalEmail), notInArray(leadDataSchema.personalEmail, emails))!);
    }
  }

  // Include by LinkedIn files — union URLs from all selected files, lead must match any
  if (includeLinkedInFileIds?.length) {
    const urls = await loadUnionFromFiles(includeLinkedInFileIds, 'linkedin', userId);
    if (urls.length > 0) {
      andConditions.push(inArray(leadDataSchema.personalLinkedIn, urls));
    }
  }

  // Exclude by LinkedIn files — union URLs from all selected files, lead must NOT match any
  if (excludeLinkedInFileIds?.length) {
    const urls = await loadUnionFromFiles(excludeLinkedInFileIds, 'linkedin', userId);
    if (urls.length > 0) {
      // Same NULL-safety fix: NULL NOT IN (...) = NULL in SQL, so wrap with IS NULL OR
      andConditions.push(or(isNull(leadDataSchema.personalLinkedIn), notInArray(leadDataSchema.personalLinkedIn, urls))!);
    }
  }

  // If no filters are active, return empty results
  if (orConditions.length === 0 && andConditions.length === 0) {
    return NextResponse.json({ leads: [], total: 0 });
  }

  // Build final WHERE: AND(...andConditions, OR(...orConditions))
  const parts = [...andConditions];
  if (orConditions.length > 0) {
    parts.push(or(...orConditions)!);
  }
  const whereClause = parts.length > 0 ? and(...parts) : undefined;

  // Fetch total count and page data in parallel
  const [countResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(leadDataSchema)
      // Must join company here too because the WHERE clause may reference companyId
      .leftJoin(companySchema, eq(leadDataSchema.companyId, companySchema.id))
      .where(whereClause),
    db
      .select({
        id: leadDataSchema.id,
        firstName: leadDataSchema.firstName,
        lastName: leadDataSchema.lastName,
        // company_name comes from the joined company table (company_name column was moved there)
        companyName: companySchema.companyName,
        // Raw contact fields — only used directly for unlimited plan users.
        // Free plan users receive these masked unless they have revealed the contact.
        workEmail: leadDataSchema.workEmail,
        personalEmail: leadDataSchema.personalEmail,
        phone1: leadDataSchema.phone1,
        phone2: leadDataSchema.phone2,
        // Reference fields — always shown unmasked (not sensitive contact data)
        personalLinkedIn: leadDataSchema.personalLinkedIn,
        websiteUrl: leadDataSchema.websiteUrl,
        jobTitle: jobTitleSchema.title,
        // Industry name from company_industry — shown in the Industry column
        industryName: companyIndustrySchema.name,
        cityName: citySchema.name,
        countryName: countrySchema.name,
      })
      .from(leadDataSchema)
      .leftJoin(jobTitleSchema, eq(leadDataSchema.jobTitleId, jobTitleSchema.id))
      // Left join company so leads without a company still appear
      .leftJoin(companySchema, eq(leadDataSchema.companyId, companySchema.id))
      // Left join so leads without an industry still appear
      .leftJoin(companyIndustrySchema, eq(leadDataSchema.companyIndustryId, companyIndustrySchema.id))
      .leftJoin(citySchema, eq(leadDataSchema.cityId, citySchema.id))
      .leftJoin(countrySchema, eq(leadDataSchema.countryId, countrySchema.id))
      .where(whereClause)
      .limit(take)
      .offset(skip),
  ]);

  // Check if the user has an active unlimited subscription.
  // Unlimited users always see all contact details unmasked.
  const [subscription] = await db
    .select({ plan: userSubscriptionSchema.plan, status: userSubscriptionSchema.status })
    .from(userSubscriptionSchema)
    .where(eq(userSubscriptionSchema.userId, userId))
    .limit(1);

  const isUnlimited = subscription?.plan === 'unlimited' && subscription.status === 'active';

  // Fetch revealed contacts for this user within the result set
  const personIds = rows.map(r => r.id);
  const revealed = personIds.length > 0
    ? await db
        .select()
        .from(revealedContactSchema)
        .where(
          and(
            eq(revealedContactSchema.userId, userId),
            inArray(revealedContactSchema.personId, personIds),
          ),
        )
    : [];

  const revealedMap = new Map(revealed.map(r => [r.personId, r]));

  const total = Number(countResult[0]?.count ?? 0);

  /**
   * Masks the local part of an email address, preserving the domain.
   * e.g. "john.doe@gmail.com" → "••••••••@gmail.com"
   * Returns null when the input is null (contact truly has no email).
   *
   * @param email - Raw email string or null.
   * @returns Masked email string showing only the domain, or null.
   */
  function maskEmail(email: string | null): string {
    // Always return a mask — even null emails show ••••••••
    // so the UI always indicates a contact field slot exists.
    // Credits are only deducted for non-null fields (handled in the reveal route).
    if (!email) return '••••••••';
    // Find the @ separator; if malformed just return full mask
    const atIdx = email.indexOf('@');
    if (atIdx < 0) return '••••••••';
    // Replace the local part (before @) with bullet dots, keep @domain intact
    const domain = email.slice(atIdx); // includes the @ sign
    return `••••••••${domain}`;
  }

  /**
   * Masks a phone number, showing only the last 4 digits.
   * e.g. "+1 555 123 4567" → "••••••••4567"
   * Returns null when the input is null.
   *
   * @param phone - Raw phone string or null.
   * @returns Masked phone string, or null.
   */
  function maskPhone(phone: string | null): string {
    // Always return a mask — even null phones show ••••••••
    // Credits are only deducted for non-null fields (handled in the reveal route).
    if (!phone) return '••••••••';
    // Strip non-digit characters to find the numeric suffix
    const digits = phone.replace(/\D/g, '');
    const suffix = digits.length >= 4 ? digits.slice(-4) : digits;
    return `••••••••${suffix}`;
  }

  const leads = rows.map((r) => {
    const rev = revealedMap.get(r.id);
    const locationParts = [r.cityName, r.countryName].filter(Boolean);

    return {
      id: r.id,
      fullName: [r.firstName, r.lastName].filter(Boolean).join(' '),
      jobTitle: r.jobTitle ?? null,
      companyName: r.companyName ?? null,
      // Industry from company_industry table — null when not mapped
      industry: r.industryName ?? null,
      location: locationParts.length > 0 ? locationParts.join(', ') : null,
      // Reference links — shown as icons in the Reference column (always visible, not masked)
      linkedIn: r.personalLinkedIn ?? null,
      // Exclude placeholder-only website values like "http://" or "https://" with no path
      websiteUrl: r.websiteUrl && r.websiteUrl.replace(/https?:\/\//i, '').trim() ? r.websiteUrl : null,
      // Contact fields — three possible states:
      //   1. Unlimited plan: show raw values from lead_data directly (no reveal needed)
      //   2. Free plan + revealed (rev record exists): show the stored value, which may be
      //      null if the contact genuinely has no email/phone — do NOT mask nulls here
      //   3. Free plan + not yet revealed (no rev record): return smart partial mask
      //      Emails → ••••••••@domain.com  (proves data exists, hides local part)
      //      Phones → ••••••••4567         (proves data exists, hides all but last 4)
      // Key: use `rev != null` as the gate, not `rev?.field ?? mask(...)`, so that a
      // revealed contact with a null field shows null rather than a masked placeholder.
      workEmail: isUnlimited ? (r.workEmail ?? null) : (rev != null ? rev.workEmail : maskEmail(r.workEmail)),
      personalEmail: isUnlimited ? (r.personalEmail ?? null) : (rev != null ? rev.personalEmail : maskEmail(r.personalEmail)),
      phone1: isUnlimited ? (r.phone1 ?? null) : (rev != null ? rev.phone1 : maskPhone(r.phone1)),
      phone2: isUnlimited ? (r.phone2 ?? null) : (rev != null ? rev.phone2 : maskPhone(r.phone2)),
      // revealed flag: true if the user has explicitly revealed this contact
      revealed: rev != null,
    };
  });

  return NextResponse.json({ leads, total });
}
