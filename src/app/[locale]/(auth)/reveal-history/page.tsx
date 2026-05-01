// ── /reveal-history page ──────────────────────────────────────────────────────
// Server component — sets locale and renders the RevealHistoryView client shell.
//
// The optional `recent` search param carries a comma-separated list of personIds
// that were just revealed (e.g. after clicking Reveal in the leads table).
// RevealHistoryView uses these IDs to show "Just Now" badges for 30 seconds.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { RevealHistoryView } from '@/components/dashboard/RevealHistoryView';

// Generate page metadata using next-intl server translations
export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'RevealHistoryView' });
  return { title: t('meta_title') };
}

export default async function RevealHistoryPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ recent?: string }>;
}) {
  // Activate locale for server-side translations
  const { locale } = await props.params;
  setRequestLocale(locale);

  // Parse the optional `recent` query param into an array of personIds.
  // This is set by the leads table after a reveal so we can show "Just Now" badges.
  const { recent } = await props.searchParams;
  const recentPersonIds = recent
    ? recent.split(',').map(Number).filter(n => !Number.isNaN(n) && n > 0)
    : undefined;

  return <RevealHistoryView recentPersonIds={recentPersonIds} />;
}
