// ── /reveal-history layout ────────────────────────────────────────────────────
// Wraps the Reveal History page with AppTopBar and NavRail.
// Server component — reads locale from params and validates the session.
// ─────────────────────────────────────────────────────────────────────────────

import { setRequestLocale } from 'next-intl/server';
import { AppTopBar } from '@/components/dashboard/AppTopBar';
import { NavRail } from '@/components/dashboard/NavRail';
import { getSessionUser } from '@/utils/SessionUser';

export default async function RevealHistoryLayout(props: {
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
      {/* Top navigation bar with "Reveal History" as the active page */}
      <AppTopBar activePage="reveal-history" userEmail={session.email} />
      {/* Left navigation rail */}
      <NavRail activePage="reveal-history" />
      {/* Main content area — offset for the 60 px rail and 56 px topbar */}
      <div className="pl-[160px] pt-14">
        {props.children}
      </div>
    </>
  );
}
