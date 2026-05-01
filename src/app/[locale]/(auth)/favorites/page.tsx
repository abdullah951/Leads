import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { FavoritesView } from '@/components/dashboard/FavoritesView';

export const metadata: Metadata = {
  title: 'Favorites — WarpLeads',
};

/**
 * /favorites page — renders the FavoritesView client component.
 * Layout (AppTopBar + NavRail + pt-14) is handled by the sibling layout.tsx.
 */
export default async function FavoritesPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return <FavoritesView />;
}
