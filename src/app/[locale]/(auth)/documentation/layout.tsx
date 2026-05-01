// ── /documentation layout ─────────────────────────────────────────────────────
// Wraps the Documentation page with AppTopBar and NavRail.
// Layout applies pl-[160px] pt-14 on the wrapper so DocumentationView does NOT
// need to repeat those offsets internally.
// ─────────────────────────────────────────────────────────────────────────────

import { setRequestLocale } from 'next-intl/server';
import { AppTopBar } from '@/components/dashboard/AppTopBar';
import { NavRail } from '@/components/dashboard/NavRail';
import { getSessionUser } from '@/utils/SessionUser';

export default async function DocumentationLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Read locale from route params and activate it for next-intl
  const { locale } = await props.params;
  setRequestLocale(locale);

  // Guard — redirects to /sign-in if the JWT cookie is absent or expired
  const session = await getSessionUser();

  return (
    <>
      {/* Fixed top bar with "Documentation" as active page */}
      <AppTopBar activePage="documentation" userEmail={session.email} />

      {/* Fixed left navigation rail */}
      <NavRail activePage="documentation" />

      {/* Main content area — offset for 160px rail and 56px topbar */}
      <div className="pl-[160px] pt-14">
        {props.children}
      </div>
    </>
  );
}
