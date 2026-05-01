'use client';

import { useRouter } from '@/libs/I18nNavigation';

export function SignOutButton(props: { label: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      className="border-none text-gray-700 hover:text-gray-900"
      onClick={async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/sign-in');
      }}
    >
      {props.label}
    </button>
  );
}
