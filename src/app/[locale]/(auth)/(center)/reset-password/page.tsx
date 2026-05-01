import { setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { ResetPasswordForm } from './ResetPasswordForm';

export default async function ResetPasswordPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
