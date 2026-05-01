'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
});

type FormData = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const router = useRouter();
  const [serverMessage, setServerMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerMessage('');

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    setServerMessage(json.message ?? 'Something went wrong');

    if (res.ok) {
      router.push(`/reset-password?email=${encodeURIComponent(data.email)}`);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6 rounded-lg border p-8">
      <div>
        <h1 className="text-2xl font-bold">Forgot password</h1>
        <p className="mt-1 text-sm text-gray-500">
          Enter your email and we will send you a reset code
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            {...register('email')}
            type="email"
            className="w-full rounded border px-3 py-2"
            placeholder="you@example.com"
          />
          {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
        </div>

        {serverMessage && <p className="text-sm text-gray-600">{serverMessage}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Sending...' : 'Send reset code'}
        </button>
      </form>
    </div>
  );
}
