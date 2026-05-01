import { setRequestLocale } from 'next-intl/server';
import { EnrichLeadsForm } from '@/components/dashboard/EnrichLeadsForm';

export default async function EnrichLeadsPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-20 px-4">
      <EnrichLeadsForm />
    </div>
  );
}
