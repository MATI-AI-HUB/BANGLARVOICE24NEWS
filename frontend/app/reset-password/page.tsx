'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  PASSWORD_MIN_LENGTH,
  passwordPolicyFailure,
} from '@/lib/password-policy';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();

    const verifyRecoverySession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        setError(
          'এই পাসওয়ার্ড রিসেট লিংকটি অবৈধ বা মেয়াদ শেষ হয়েছে। নতুন একটি রিসেট ইমেইল অনুরোধ করুন।',
        );
        return;
      }

      setReady(true);
    };

    void verifyRecoverySession();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (passwordPolicyFailure(password)) {
      setError('পাসওয়ার্ডে অন্তত ১২টি অক্ষর, একটি letter, একটি number এবং একটি symbol থাকতে হবে।');
      return;
    }

    if (password !== confirmPassword) {
      setError('দুটি পাসওয়ার্ড এক নয়।');
      return;
    }

    setSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
    }

    setMessage('পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে। এখন লগইন করুন।');

    window.setTimeout(() => {
      router.replace('/login?redirectedFrom=/admin');
      router.refresh();
    }, 1200);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-center text-2xl font-bold">নতুন পাসওয়ার্ড সেট করুন</h1>

        <p className="mt-3 text-center text-sm text-neutral-600">
          Admin console-এ প্রবেশের জন্য একটি নতুন নিরাপদ পাসওয়ার্ড দিন।
        </p>

        {error && (
          <div className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        {ready ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700">
                নতুন পাসওয়ার্ড
              </label>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700">
                নতুন পাসওয়ার্ড আবার লিখুন
              </label>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'পরিবর্তন করা হচ্ছে...' : 'পাসওয়ার্ড পরিবর্তন করুন'}
            </button>
          </form>
        ) : !error ? (
          <p className="mt-6 text-center text-sm text-neutral-500">
            রিসেট লিংক যাচাই করা হচ্ছে…
          </p>
        ) : null}
      </div>
    </main>
  );
}
