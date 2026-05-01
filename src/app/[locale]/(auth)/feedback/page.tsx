// ── /feedback page ────────────────────────────────────────────────────────────
// Renders the FeedbackView client shell.
// Layout (AppTopBar + NavRail) is handled by the sibling layout.tsx.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { FeedbackView } from '@/components/dashboard/FeedbackView';

export const metadata: Metadata = {
  title: 'Feedback — WarpLeads',
};

export default async function FeedbackPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return <FeedbackView />;
}
