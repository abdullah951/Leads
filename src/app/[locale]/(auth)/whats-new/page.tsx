// ── /whats-new page ───────────────────────────────────────────────────────────
// Renders the WhatsNewView component (changelog / release notes).
// Layout offset is applied by WhatsNewLayout — this page just renders the view.
// ─────────────────────────────────────────────────────────────────────────────

import { setRequestLocale } from 'next-intl/server';
import { WhatsNewView } from '@/components/dashboard/WhatsNewView';

export default async function WhatsNewPage(props: {
  params: Promise<{ locale: string }>;
}) {
  // Activate locale for any server-side i18n calls
  const { locale } = await props.params;
  setRequestLocale(locale);

  return <WhatsNewView />;
}
