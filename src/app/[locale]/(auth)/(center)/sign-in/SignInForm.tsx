'use client';

// SignInForm — rendered in the white right panel of the split auth layout.
// No card wrapper needed — the layout provides the white bg and centering.
// Styling: light inputs, Slate text, indigo gradient submit button.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export function SignInForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (res.ok) {
      // Silently update the user's timezone on every login so changes (e.g. travel,
      // DST, new device) are picked up. Fire-and-forget — no await needed.
      fetch('/api/auth/timezone', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      }).catch(() => {/* non-critical, ignore errors */});

      router.push('/dashboard');
      router.refresh();
    } else if (res.status === 403) {
      // Email not verified — redirect to verify-email
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
    } else {
      setServerError(json.message ?? 'Something went wrong');
    }
  };

  return (
    <div className="space-y-6">

      {/* ── Mobile-only logo — hidden on md+ since the left panel shows it ── */}
      <div className="flex items-center gap-2 md:hidden">
        <span
          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366F1, #7C3AED)' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </span>
        <span className="font-bold text-[#0F172A] text-xl">Warp</span>
        <span className="font-bold text-[#4F46E5] text-xl -ml-1">Leads</span>
      </div>

      {/* ── Heading ── */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Sign in</h1>
        <p className="mt-1 text-sm text-[#64748B]">Enter your credentials to access your account</p>
      </div>

      {/* ── Google sign-in ── */}
      <GoogleSignInButton label="Sign in with Google" />

      {/* ── OR divider ── */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[#E2E8F0]" />
        <span className="text-xs text-[#94A3B8]">OR</span>
        <div className="h-px flex-1 bg-[#E2E8F0]" />
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Email */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#374151]">Email</label>
          <input
            {...register('email')}
            type="email"
            className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] shadow-sm focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 transition-colors"
            placeholder="you@example.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        {/* Password with show/hide toggle */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#374151]">Password</label>
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 pr-10 text-sm text-[#0F172A] placeholder:text-[#94A3B8] shadow-sm focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 transition-colors"
              placeholder="••••••••"
            />
            {/* Eye toggle */}
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors"
              onClick={() => setShowPassword(prev => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword
                ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  )
                : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>

        {/* Forgot password — right-aligned */}
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-[#4F46E5] hover:text-[#4338CA] transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        {/* Server error */}
        {serverError && <p className="text-sm text-red-500">{serverError}</p>}

        {/* Submit button — indigo gradient */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      {/* ── Footer link ── */}
      <p className="text-center text-sm text-[#64748B]">
        {"Don't have an account? "}
        <Link
          href="/sign-up"
          className="font-medium text-[#4F46E5] hover:text-[#4338CA] transition-colors"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
