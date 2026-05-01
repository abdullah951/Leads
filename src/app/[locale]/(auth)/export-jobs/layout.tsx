import { setRequestLocale } from 'next-intl/server';
import { AppTopBar } from '@/components/dashboard/AppTopBar';
import { NavRail } from '@/components/dashboard/NavRail';
import { getSessionUser } from '@/utils/SessionUser';

export default async function ExportJobsLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const session = await getSessionUser();

  return (
    <>
      <AppTopBar activePage="export-jobs" userEmail={session.email} />
      <NavRail activePage="export-jobs" />
      <div className="pl-[160px] pt-14">
        {props.children}
      </div>
    </>
  );
}
