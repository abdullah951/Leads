/**
 * Reference data seed script.
 * Run with: npm run db:seed
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../models/Schema';
import { REGION_GROUPS } from '../constants/regionCountries';

const {
  managementLevelSchema,
  departmentSchema,
  companySizeSchema,
  countrySchema,
} = schema;

const MANAGEMENT_LEVELS = [
  'Founder',
  'Owner',
  'Director',
  'Manager',
  'Head',
  'VP',
  'Partner',
  'Senior',
  // C-Suite sub-types
  'Executive',
  'Finance Executive',
  'Human Resource Executive',
  'IT Executive',
  'Legal Executive',
  'Marketing Executive',
  'Medical & Health Executive',
  'Operations Executive',
  'Sales Executive',
];

const DEPARTMENTS = [
  'Engineering',
  'Consulting',
  'Education',
  'Arts And Design',
  'Healthcare Services',
  'Finance',
  'Human Resources',
  'Information Technology',
  'Legal',
  'Marketing',
  'Operations',
  'Sales',
];

const COMPANY_SIZES = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1001-5000',
  '5001-10000',
  '10001+',
];

// All unique country names from the hardcoded region map
const ALL_COUNTRIES = [...new Set(REGION_GROUPS.flatMap(r => r.countryNames))];

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool, schema });

  console.log('Seeding management levels...');
  for (const name of MANAGEMENT_LEVELS) {
    await db.insert(managementLevelSchema).values({ name }).onConflictDoNothing();
  }

  console.log('Seeding departments...');
  for (const name of DEPARTMENTS) {
    await db.insert(departmentSchema).values({ name }).onConflictDoNothing();
  }

  console.log('Seeding company sizes...');
  for (const label of COMPANY_SIZES) {
    await db.insert(companySizeSchema).values({ label }).onConflictDoNothing();
  }

  console.log(`Seeding ${ALL_COUNTRIES.length} countries...`);
  for (const name of ALL_COUNTRIES) {
    // Check if already exists by name (case-insensitive) before inserting
    const existing = await db
      .select({ id: countrySchema.id })
      .from(countrySchema)
      .where(sql`LOWER(${countrySchema.name}) = ${name.toLowerCase()}`)
      .limit(1);
    if (existing[0]) continue;

    const code = name.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 16);
    const safeCode = `${code}_${Date.now().toString(36).slice(-4)}`;
    await db.insert(countrySchema).values({ name, code: safeCode });
  }

  console.log('Done.');
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
