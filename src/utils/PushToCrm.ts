// ── PushToCrm ─────────────────────────────────────────────────────────────────
// Pushes revealed lead data to all CRM integrations the user has connected.
// Called from FireWebhooks.ts after a lead.revealed event is fired.
//
// Supported providers: hubspot | salesforce | pipedrive | zoho | googlesheets
//
// Each provider receives the full lead contact fields (name, email, phone,
// company, job title) fetched fresh from the DB via the personIds in the payload.
// ─────────────────────────────────────────────────────────────────────────────

import { eq, inArray } from 'drizzle-orm';
import { db } from '@/libs/DB';
import {
  userIntegrationSchema,
  leadDataSchema,
  jobTitleSchema,
  companySchema,
} from '@/models/Schema';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Shape of a single lead record we'll push to each CRM */
type LeadRecord = {
  firstName: string | null;
  lastName: string | null;
  workEmail: string | null;
  personalEmail: string | null;
  phone1: string | null;
  phone2: string | null;
  company: string | null;
  jobTitle: string | null;
};

/** Minimal subset of the user_integration row we need */
type IntegrationRow = {
  provider: string;
  accessToken: string;
  metadata: string;
  settings: string;
};

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Fetches the user's connected CRM integrations and pushes the revealed leads
 * to each one. All pushes are fire-and-forget — errors are swallowed so they
 * never surface to the caller.
 *
 * @param userId - The authenticated user whose integrations to push to.
 * @param data - The event payload from FireWebhooks, expected to contain personIds.
 */
export async function pushToCrm(
  userId: number,
  data: Record<string, unknown>,
): Promise<void> {
  // ── 1. Fetch the user's connected integrations ─────────────────────────────
  const integrations = await db
    .select({
      provider: userIntegrationSchema.provider,
      accessToken: userIntegrationSchema.accessToken,
      metadata: userIntegrationSchema.metadata,
      settings: userIntegrationSchema.settings,
    })
    .from(userIntegrationSchema)
    .where(eq(userIntegrationSchema.userId, userId));

  // No connected integrations — nothing to do
  if (integrations.length === 0) return;

  // ── 2. Extract personIds from the event payload ────────────────────────────
  // The reveal route embeds personIds in the event data
  const rawIds = data.personIds;
  const personIds: number[] = Array.isArray(rawIds)
    ? (rawIds as unknown[]).map(id => Number(id)).filter(id => !Number.isNaN(id))
    : [];

  // No valid person IDs — nothing to push
  if (personIds.length === 0) return;

  // ── 3. Fetch full lead records from the DB ─────────────────────────────────
  // We JOIN job_title and company tables so each CRM gets the human-readable values
  const leads = await db
    .select({
      firstName: leadDataSchema.firstName,
      lastName: leadDataSchema.lastName,
      workEmail: leadDataSchema.workEmail,
      personalEmail: leadDataSchema.personalEmail,
      phone1: leadDataSchema.phone1,
      phone2: leadDataSchema.phone2,
      // company name comes from the joined company table
      company: companySchema.companyName,
      // job title comes from the joined job_title table
      jobTitle: jobTitleSchema.title,
    })
    .from(leadDataSchema)
    // Left join to company so we still get leads with no company linked
    .leftJoin(companySchema, eq(leadDataSchema.companyId, companySchema.id))
    // Left join to job_title so we still get leads with no job title
    .leftJoin(jobTitleSchema, eq(leadDataSchema.jobTitleId, jobTitleSchema.id))
    .where(inArray(leadDataSchema.id, personIds));

  // Nothing returned from DB — return early
  if (leads.length === 0) return;

  // ── 4. Push to each connected CRM in parallel ──────────────────────────────
  await Promise.allSettled(
    integrations.map(integration =>
      pushToProvider(integration, leads).catch(err =>
        // Swallow per-provider errors — one broken CRM must not affect others
        console.warn(`[pushToCrm] ${integration.provider} push failed:`, err),
      ),
    ),
  );
}

// ── Provider router ───────────────────────────────────────────────────────────

/**
 * Routes a batch of leads to the correct CRM API based on the provider name.
 *
 * @param integration - The integration row including access token and metadata.
 * @param leads - Array of lead records to push.
 */
async function pushToProvider(
  integration: IntegrationRow,
  leads: LeadRecord[],
): Promise<void> {
  // Route to the appropriate CRM handler
  switch (integration.provider) {
    case 'hubspot':
      await pushToHubspot(integration, leads);
      break;
    case 'salesforce':
      await pushToSalesforce(integration, leads);
      break;
    case 'pipedrive':
      await pushToPipedrive(integration, leads);
      break;
    case 'zoho':
      await pushToZoho(integration, leads);
      break;
    case 'googlesheets':
      await pushToGoogleSheets(integration, leads);
      break;
    default:
      // Unknown provider — no-op
      break;
  }
}

// ── HubSpot ───────────────────────────────────────────────────────────────────

/**
 * Creates contacts in HubSpot via the CRM v3 contacts API.
 * Each lead becomes one POST to /crm/v3/objects/contacts.
 * Uses the access token as a Bearer token.
 *
 * @param integration - The HubSpot integration row.
 * @param leads - Leads to push to HubSpot.
 */
async function pushToHubspot(
  integration: IntegrationRow,
  leads: LeadRecord[],
): Promise<void> {
  // Push each lead as a separate contact creation request
  await Promise.allSettled(
    leads.map(async (lead) => {
      // Build the HubSpot contact properties payload
      const properties: Record<string, string> = {};

      // Map our fields to HubSpot's standard contact property keys
      if (lead.firstName) properties.firstname = lead.firstName;
      if (lead.lastName) properties.lastname = lead.lastName;
      if (lead.workEmail) properties.email = lead.workEmail;
      if (lead.phone1) properties.phone = lead.phone1;
      if (lead.company) properties.company = lead.company;
      if (lead.jobTitle) properties.jobtitle = lead.jobTitle;

      const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // HubSpot uses Bearer token auth from OAuth
          'Authorization': `Bearer ${integration.accessToken}`,
        },
        body: JSON.stringify({ properties }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.warn('[pushToCrm][hubspot] Contact create failed:', res.status, text);
      }
    }),
  );
}

// ── Salesforce ────────────────────────────────────────────────────────────────

/**
 * Creates Contact records in Salesforce via the REST API.
 * Instance URL is read from the metadata field (set during OAuth callback).
 *
 * @param integration - The Salesforce integration row.
 * @param leads - Leads to push to Salesforce.
 */
async function pushToSalesforce(
  integration: IntegrationRow,
  leads: LeadRecord[],
): Promise<void> {
  // Parse the instance URL stored during OAuth callback
  let instanceUrl: string;
  try {
    const meta = JSON.parse(integration.metadata || '{}') as Record<string, unknown>;
    instanceUrl = (meta.instance_url as string | undefined) ?? '';
  } catch {
    console.warn('[pushToCrm][salesforce] Failed to parse metadata');
    return;
  }

  if (!instanceUrl) {
    console.warn('[pushToCrm][salesforce] instance_url not found in metadata');
    return;
  }

  // Create each lead as a Salesforce Contact object
  await Promise.allSettled(
    leads.map(async (lead) => {
      // Salesforce Contact sobject field names
      const contact: Record<string, string> = {};
      if (lead.firstName) contact.FirstName = lead.firstName;
      if (lead.lastName) contact.LastName = lead.lastName ?? 'Unknown';
      // Salesforce requires a LastName — use fallback if missing
      if (!contact.LastName) contact.LastName = 'Unknown';
      if (lead.workEmail) contact.Email = lead.workEmail;
      if (lead.phone1) contact.Phone = lead.phone1;
      if (lead.company) contact.AccountId = lead.company; // note: ideally resolve to Account ID
      if (lead.jobTitle) contact.Title = lead.jobTitle;

      const res = await fetch(
        `${instanceUrl}/services/data/v58.0/sobjects/Contact`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${integration.accessToken}`,
          },
          body: JSON.stringify(contact),
        },
      );

      if (!res.ok) {
        const text = await res.text();
        console.warn('[pushToCrm][salesforce] Contact create failed:', res.status, text);
      }
    }),
  );
}

// ── Pipedrive ─────────────────────────────────────────────────────────────────

/**
 * Creates Person records in Pipedrive via the v1 API.
 * Uses Bearer token auth from OAuth.
 *
 * @param integration - The Pipedrive integration row.
 * @param leads - Leads to push to Pipedrive.
 */
async function pushToPipedrive(
  integration: IntegrationRow,
  leads: LeadRecord[],
): Promise<void> {
  await Promise.allSettled(
    leads.map(async (lead) => {
      // Build the Pipedrive person payload
      // Pipedrive accepts name (required), email (array), phone (array)
      const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Unknown';

      // Build email array — include both work and personal if present
      const emails: Array<{ value: string; label: string }> = [];
      if (lead.workEmail) emails.push({ value: lead.workEmail, label: 'work' });
      if (lead.personalEmail) emails.push({ value: lead.personalEmail, label: 'personal' });

      // Build phone array
      const phones: Array<{ value: string; label: string }> = [];
      if (lead.phone1) phones.push({ value: lead.phone1, label: 'work' });
      if (lead.phone2) phones.push({ value: lead.phone2, label: 'mobile' });

      const body: Record<string, unknown> = {
        name: fullName,
        email: emails,
        phone: phones,
      };

      // job_title field in Pipedrive
      if (lead.jobTitle) body.job_title = lead.jobTitle;

      const res = await fetch('https://api.pipedrive.com/v1/persons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${integration.accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        console.warn('[pushToCrm][pipedrive] Person create failed:', res.status, text);
      }
    }),
  );
}

// ── Zoho CRM ──────────────────────────────────────────────────────────────────

/**
 * Creates Contact records in Zoho CRM v2.
 * Zoho accepts a batch of records in a single request (up to 100 at a time).
 *
 * @param integration - The Zoho integration row.
 * @param leads - Leads to push to Zoho.
 */
async function pushToZoho(
  integration: IntegrationRow,
  leads: LeadRecord[],
): Promise<void> {
  // Zoho batch API accepts up to 100 records per request
  // Build the Zoho Contact records array
  const records = leads.map(lead => {
    const record: Record<string, string> = {};
    if (lead.firstName) record.First_Name = lead.firstName;
    // Zoho requires Last_Name — use fallback
    record.Last_Name = lead.lastName ?? 'Unknown';
    if (lead.workEmail) record.Email = lead.workEmail;
    if (lead.phone1) record.Phone = lead.phone1;
    if (lead.company) record.Account_Name = lead.company;
    if (lead.jobTitle) record.Title = lead.jobTitle;
    return record;
  });

  const res = await fetch('https://www.zohoapis.com/crm/v2/Contacts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Zoho-oauthtoken ${integration.accessToken}`,
    },
    body: JSON.stringify({ data: records }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.warn('[pushToCrm][zoho] Contacts create failed:', res.status, text);
  }
}

// ── Google Sheets ─────────────────────────────────────────────────────────────

/**
 * Appends lead rows to a Google Sheet via the Sheets v4 API.
 * The spreadsheet ID is read from the integration's settings JSON.
 * Appends to Sheet1!A:Z (first sheet, all columns).
 *
 * @param integration - The Google Sheets integration row.
 * @param leads - Leads to push as new rows.
 */
async function pushToGoogleSheets(
  integration: IntegrationRow,
  leads: LeadRecord[],
): Promise<void> {
  // Parse the spreadsheet ID from user-saved settings
  let spreadsheetId: string;
  try {
    const settings = JSON.parse(integration.settings || '{}') as Record<string, unknown>;
    spreadsheetId = (settings.spreadsheetId as string | undefined) ?? '';
  } catch {
    console.warn('[pushToCrm][googlesheets] Failed to parse settings');
    return;
  }

  if (!spreadsheetId) {
    // User hasn't configured the spreadsheet ID yet — skip silently
    return;
  }

  // Build rows: each lead becomes a flat array of values in column order
  // Column order: First Name | Last Name | Work Email | Personal Email | Phone | Company | Job Title
  const values = leads.map(lead => [
    lead.firstName ?? '',
    lead.lastName ?? '',
    lead.workEmail ?? '',
    lead.personalEmail ?? '',
    lead.phone1 ?? '',
    lead.company ?? '',
    lead.jobTitle ?? '',
  ]);

  // Target range — append to Sheet1 starting from column A
  const range = encodeURIComponent('Sheet1!A:G');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${integration.accessToken}`,
    },
    body: JSON.stringify({ values }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.warn('[pushToCrm][googlesheets] Append failed:', res.status, text);
  }
}
