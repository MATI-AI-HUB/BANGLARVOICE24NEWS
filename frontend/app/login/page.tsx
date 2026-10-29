// frontend/app/login/page.tsx
'use client';

import { Suspense, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { safeRedirectPath } from '@/lib/safe-redirect';
import { useClientLocale } from '@/lib/use-client-locale';

const COPY = {
  bn: {
    auth_unconfigured: 'লগইন সেবা এই মুহূর্তে কনফিগার করা নেই। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।',
    auth_unavailable: 'লগইন সেবা সাময়িকভাবে অনুপলব্ধ। কিছুক্ষণ পরে আবার চেষ্টা করুন।',
    invalidCredentials: 'ইমেইল বা পাসওয়ার্ড সঠিক নয়।',
    title: 'লগইন করুন',
    email: 'ইমেইল',
    password: 'পাসওয়ার্ড',
    loading: 'লোড হচ্ছে…',
    submit: 'লগইন',
    help: 'অ্যাক্সেস নেই? অ্যাকাউন্টের জন্য অ্যাডমিনের সাথে যোগাযোগ করুন।',
  },
  en: {
    auth_unconfigured: 'Sign-in is not configured right now. Please contact an administrator.',
    auth_unavailable: 'Sign-in is temporarily unavailable. Please try again shortly.',
    invalidCredentials: 'The email or password is incorrect.',
    title: 'Sign in',
    email: 'Email',
    password: 'Password',
    loading: 'Loading…',
    submit: 'Sign in',
    help: 'Need access? Contact an administrator to request an account.',
  },
} as const;

type NoticeKey = 'auth_unconfigured' | 'auth_unavailable';

function LoginForm() {
  const locale = useClientLocale();
  const copy = COPY[locale];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get('redirectedFrom'));
  const requestedNotice = searchParams.get('error');
  const noticeKey = requestedNotice === 'auth_unconfigured' || requestedNotice === 'auth_unavailable'
    ? requestedNotice as NoticeKey
    : null;
  const notice = noticeKey ? copy[noticeKey] : '';

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: signInError } = await createClient().auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(copy.invalidCredentials);
      } else {
        router.push(redirectTo);
        router.refresh();
      }
    } catch {
      setError(copy.auth_unavailable);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-bold">{copy.title}</h1>
        {(error || notice) && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error || notice}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700">{copy.email}</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700">{copy.password}</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-500 px-4 py-2 font-medium text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? copy.loading : copy.submit}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-neutral-500">{copy.help}</p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-neutral-50"><p className="text-sm text-neutral-500">লোড হচ্ছে… / Loading…</p></main>}>
      <LoginForm />
    </Suspense>
  );
}
