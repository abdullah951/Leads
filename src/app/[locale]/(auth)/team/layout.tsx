// ── /team layout ──────────────────────────────────────────────────────────────
// Wraps the team management page with the AppTopBar + NavRail.
// TeamView handles its own ml-[160px] + pt-14 content offsets internally.
// ─────────────────────────────────────────────────────────────────────────────

import { setRequestLocale } from 'next-intl/server';
import { AppTopBar } from '@/components/dashboard/AppTopBar';
import { NavRail } from '@/components/dashboard/NavRail';
import { getSessionUser } from '@/utils/SessionUser';

export default async function TeamLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  // Fetch session to populate the top-bar user email
  const session = await getSessionUser();

  return (
    <>
      {/* Fixed 56px topbar */}
      <AppTopBar activePage="team" userEmail={session.email} />

      {/* Fixed 160px left nav rail with team highlighted */}
      <NavRail activePage="team" />

      {/* TeamView handles its own ml-[160px] pt-14 offsets internally */}
      <div className="pt-14">{props.children}</div>
    </>
  );
}
