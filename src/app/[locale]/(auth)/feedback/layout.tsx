// ── /feedback layout ──────────────────────────────────────────────────────────
// Wraps the feedback page with AppTopBar + NavRail.
// FeedbackView handles its own ml-[160px] + pt-14 content offsets.
// ─────────────────────────────────────────────────────────────────────────────

import { setRequestLocale } from 'next-intl/server';
import { AppTopBar } from '@/components/dashboard/AppTopBar';
import { NavRail } from '@/components/dashboard/NavRail';
import { getSessionUser } from '@/utils/SessionUser';

export default async function FeedbackLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const session = await getSessionUser();

  return (
    <>
      {/* Fixed 56px top bar */}
      <AppTopBar activePage="feedback" userEmail={session.email} />

      {/* Fixed 160px left nav rail with Feedback highlighted */}
      <NavRail activePage="feedback" />

      {/* FeedbackView manages its own ml + pt offsets */}
      <div>{props.children}</div>
    </>
  );
}
