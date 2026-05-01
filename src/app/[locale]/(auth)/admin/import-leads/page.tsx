import { setRequestLocale } from 'next-intl/server';
import { ImportLeadsForm } from '@/components/dashboard/ImportLeadsForm';

export default async function ImportLeadsPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-20 px-4">
      <ImportLeadsForm />
    </div>
  );
}
