'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const schema = z.object({
  otp: z.string().length(6, 'Enter the 6-digit code'),
});

type FormData = z.infer<typeof schema>;

export function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError('');

    const res = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp: data.otp }),
    });

    const json = await res.json();

    if (res.ok) {
      router.push('/dashboard');
      router.refresh();
    } else {
      setServerError(json.message ?? 'Something went wrong');
    }
  };

  return (
    <div className="w-full max-w-md space-y-6 rounded-lg border p-8">
      <div>
        <h1 className="text-2xl font-bold">Verify your email</h1>
        <p className="mt-1 text-sm text-gray-500">
          {email
            ? `We sent a 6-digit code to ${email}`
            : 'Enter the 6-digit code sent to your email'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Verification code</label>
          <input
            {...register('otp')}
            type="text"
            inputMode="numeric"
            maxLength={6}
            className="w-full rounded border px-3 py-2 tracking-widest"
            placeholder="123456"
          />
          {errors.otp && <p className="mt-1 text-sm text-red-500">{errors.otp.message}</p>}
        </div>

        {serverError && <p className="text-sm text-red-500">{serverError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Verifying...' : 'Verify email'}
        </button>
      </form>
    </div>
  );
}
