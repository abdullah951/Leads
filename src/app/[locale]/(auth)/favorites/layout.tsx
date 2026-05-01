import { setRequestLocale } from 'next-intl/server';
import { AppTopBar } from '@/components/dashboard/AppTopBar';
import { NavRail } from '@/components/dashboard/NavRail';
import { getSessionUser } from '@/utils/SessionUser';

/**
 * Layout for the /favorites page.
 * Renders the AppTopBar and NavRail (activePage="favorites").
 * The FavoritesView component handles its own ml-[220px] + pt-14 internally.
 */
export default async function FavoritesLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const session = await getSessionUser();

  return (
    <>
      {/* Fixed 56px topbar */}
      <AppTopBar activePage="favorites" userEmail={session.email} />

      {/* Fixed 160px left nav rail */}
      <NavRail activePage="favorites" />

      {/* Page content — FavoritesView handles its own ml-[220px] + pt-14 */}
      <div>
        {props.children}
      </div>
    </>
  );
}
