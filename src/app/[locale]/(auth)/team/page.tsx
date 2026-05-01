// ── /team page ────────────────────────────────────────────────────────────────
// Renders the TeamView client shell.
// Layout (AppTopBar + NavRail) is handled by the sibling layout.tsx.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { TeamView } from '@/components/dashboard/TeamView';

export const metadata: Metadata = {
  title: 'Team — WarpLeads',
};

export default async function TeamPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return <TeamView />;
}
