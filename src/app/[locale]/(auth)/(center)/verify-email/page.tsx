import { setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { VerifyEmailForm } from './VerifyEmailForm';

export default async function VerifyEmailPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
