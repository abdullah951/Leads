import { setRequestLocale } from 'next-intl/server';
import { AppTopBar } from '@/components/dashboard/AppTopBar';
import { NavRail } from '@/components/dashboard/NavRail';
import { getSessionUser } from '@/utils/SessionUser';

// Layout: NavRail (60px, left-0) + filter Sidebar (60px, left-[60px]) + content (ml-[120px])
// NavRail sits immediately left of the filter Sidebar icon strip.
export default async function DashboardLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const session = await getSessionUser();

  return (
    <>
      {/* Fixed top bar — 56 px tall */}
      <AppTopBar activePage="dashboard" userEmail={session.email} />

      {/* NavRail at left-0; filter Sidebar sits at left-[60px] beside it */}
      <NavRail activePage="dashboard" />

      {/* pt-14 offsets the topbar; LeadsDashboard handles its own ml-[120px] internally */}
      <div className="pt-14">
        {props.children}
      </div>
    </>
  );
}
