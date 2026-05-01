import { setRequestLocale } from 'next-intl/server';
import { AppTopBar } from '@/components/dashboard/AppTopBar';
import { NavRail } from '@/components/dashboard/NavRail';
import { getSessionUser } from '@/utils/SessionUser';

/**
 * Layout for the /integrations page.
 * IntegrationsView handles its own ml-[220px] + pt-14 offsets internally.
 */
export default async function IntegrationsLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const session = await getSessionUser();

  return (
    <>
      {/* Fixed 56px topbar */}
      <AppTopBar activePage="integrations" userEmail={session.email} />

      {/* Fixed 160px left nav rail with integrations highlighted */}
      <NavRail activePage="integrations" />

      {/* IntegrationsView manages its own ml + pt offsets */}
      <div>{props.children}</div>
    </>
  );
}
