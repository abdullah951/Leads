// ── /documentation page ───────────────────────────────────────────────────────
// Renders the DocumentationView component (in-app docs hub).
// Layout offset is applied by DocumentationLayout — this page just renders the view.
// ─────────────────────────────────────────────────────────────────────────────

import { setRequestLocale } from 'next-intl/server';
import { DocumentationView } from '@/components/dashboard/DocumentationView';

export default async function DocumentationPage(props: {
  params: Promise<{ locale: string }>;
}) {
  // Activate locale for any server-side i18n calls
  const { locale } = await props.params;
  setRequestLocale(locale);

  return <DocumentationView />;
}
