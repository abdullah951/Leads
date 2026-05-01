import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { IntegrationsView } from '@/components/dashboard/IntegrationsView';

export const metadata: Metadata = {
  title: 'Integrations — WarpLeads',
};

/**
 * /integrations page — renders the bento-marketplace IntegrationsView.
 * Layout (AppTopBar + NavRail) handled by the sibling layout.tsx.
 */
export default async function IntegrationsPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return <IntegrationsView />;
}
