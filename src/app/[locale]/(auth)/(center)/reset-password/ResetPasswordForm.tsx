'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const schema = z.object({
  otp: z.string().length(6, 'Enter the 6-digit code'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormData = z.infer<typeof schema>;

export function ResetPasswordForm() {
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

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp: data.otp, password: data.password }),
    });

    const json = await res.json();

    if (res.ok) {
      router.push('/sign-in');
    } else {
      setServerError(json.message ?? 'Something went wrong');
    }
  };

  return (
    <div className="w-full max-w-md space-y-6 rounded-lg border p-8">
      <div>
        <h1 className="text-2xl font-bold">Reset password</h1>
        <p className="mt-1 text-sm text-gray-500">
          Enter the code sent to your email and choose a new password
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Reset code</label>
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

        <div>
          <label className="mb-1 block text-sm font-medium">New password</label>
          <input
            {...register('password')}
            type="password"
            className="w-full rounded border px-3 py-2"
            placeholder="At least 8 characters"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>

        {serverError && <p className="text-sm text-red-500">{serverError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Resetting...' : 'Reset password'}
        </button>
      </form>

      <p className="text-center text-sm">
        <Link href="/sign-in" className="text-blue-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
