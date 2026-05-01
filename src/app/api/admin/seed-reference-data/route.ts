import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { companySizeSchema, departmentSchema, managementLevelSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

const MANAGEMENT_LEVELS = [
  'Founder', 'Owner', 'Director', 'Manager', 'Head', 'VP', 'Partner', 'Senior',
  'Executive', 'Finance Executive', 'Human Resource Executive', 'IT Executive',
  'Legal Executive', 'Marketing Executive', 'Medical & Health Executive',
  'Operations Executive', 'Sales Executive',
];

const DEPARTMENTS = [
  'Engineering', 'Consulting', 'Education', 'Arts And Design', 'Healthcare Services',
  'Finance', 'Human Resources', 'Information Technology', 'Legal', 'Marketing',
  'Operations', 'Sales',
];

const COMPANY_SIZES = [
  '1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10000+',
];

/**
 * Admin-only endpoint to seed reference lookup tables.
 * Idempotent — uses onConflictDoNothing.
 */
export async function POST(_request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  await db
    .insert(managementLevelSchema)
    .values(MANAGEMENT_LEVELS.map(name => ({ name })))
    .onConflictDoNothing();

  await db
    .insert(departmentSchema)
    .values(DEPARTMENTS.map(name => ({ name })))
    .onConflictDoNothing();

  await db
    .insert(companySizeSchema)
    .values(COMPANY_SIZES.map(label => ({ label })))
    .onConflictDoNothing();

  return NextResponse.json({ message: 'Reference data seeded' });
}
