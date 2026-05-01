// ── /settings page ────────────────────────────────────────────────────────────
// Renders the SettingsView client shell.
// Layout (AppTopBar + NavRail) is handled by the sibling layout.tsx.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { SettingsView } from '@/components/dashboard/SettingsView';

export const metadata: Metadata = {
  title: 'Settings — WarpLeads',
};

export default async function SettingsPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return <SettingsView />;
}
