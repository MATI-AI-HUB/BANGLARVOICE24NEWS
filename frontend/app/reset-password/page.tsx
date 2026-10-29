'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PASSWORD_MIN_LENGTH, passwordPolicyFailure } from '@/lib/password-policy';
import { useRouter } from 'next/navigation';
import { useClientLocale } from '@/lib/use-client-locale';

const COPY = {
  bn: {
    invalidLink: 'এই পাসওয়ার্ড রিসেট লিংকটি অবৈধ বা মেয়াদ শেষ হয়েছে। নতুন একটি রিসেট ইমেইল অনুরোধ করুন।',
    weakPassword: 'পাসওয়ার্ডে অন্তত ১২টি অক্ষর, একটি letter, একটি number এবং একটি symbol থাকতে হবে।',
    mismatch: 'দুটি পাসওয়ার্ড এক নয়।',
    updateFailed: 'পাসওয়ার্ড পরিবর্তন করা যায়নি। লিংকটি বৈধ কি না যাচাই করে আবার চেষ্টা করুন।',
    success: 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে। এখন লগইন করুন।',
    title: 'নতুন পাসওয়ার্ড সেট করুন',
    description: 'Admin console-এ প্রবেশের জন্য একটি নতুন নিরাপদ পাসওয়ার্ড দিন।',
    password: 'নতুন পাসওয়ার্ড',
    confirm: 'নতুন পাসওয়ার্ড আবার লিখুন',
    updating: 'পরিবর্তন করা হচ্ছে…',
    submit: 'পাসওয়ার্ড পরিবর্তন করুন',
    verifying: 'রিসেট লিংক যাচাই করা হচ্ছে…',
  },
  en: {
    invalidLink: 'This password reset link is invalid or expired. Request a new reset email.',
    weakPassword: 'Use at least 12 characters, including a letter, a number, and a symbol.',
    mismatch: 'The passwords do not match.',
    updateFailed: 'We could not update the password. Check that the reset link is valid and try again.',
    success: 'Your password was updated. You can now sign in.',
    title: 'Set a new password',
    description: 'Choose a secure password to access the admin console.',
    password: 'New password',
    confirm: 'Confirm new password',
    updating: 'Updating…',
    submit: 'Update password',
    verifying: 'Checking reset link…',
  },
} as const;

type MessageKey = keyof typeof COPY.bn;

export default function ResetPasswordPage() {
  const router = useRouter();
  const locale = useClientLocale();
  const copy = COPY[locale];
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [messageKey, setMessageKey] = useState<MessageKey | ''>('');
  const [errorKey, setErrorKey] = useState<MessageKey | ''>('');
  const message = messageKey ? copy[messageKey] : '';
  const error = errorKey ? copy[errorKey] : '';

  useEffect(() => {
    const verifyRecoverySession = async () => {
      const { data, error } = await createClient().auth.getSession();
      if (error || !data.session) {
        setErrorKey('invalidLink');
        return;
      }
      setReady(true);
    };
    void verifyRecoverySession();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorKey('');
    setMessageKey('');

    if (passwordPolicyFailure(password)) {
      setErrorKey('weakPassword');
      return;
    }
    if (password !== confirmPassword) {
      setErrorKey('mismatch');
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    if (updateError) {
      setErrorKey('updateFailed');
      setSubmitting(false);
      return;
    }

    setMessageKey('success');
    window.setTimeout(() => {
      router.replace('/login?redirectedFrom=/admin');
      router.refresh();
    }, 1200);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-center text-2xl font-bold">{copy.title}</h1>
        <p className="mt-3 text-center text-sm text-neutral-600">{copy.description}</p>

        {error && <div role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {message && <div role="status" className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}

        {ready ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-neutral-700">{copy.password}</label>
              <input
                id="new-password"
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
              <label htmlFor="confirm-password" className="block text-sm font-medium text-neutral-700">{copy.confirm}</label>
              <input
                id="confirm-password"
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
              {submitting ? copy.updating : copy.submit}
            </button>
          </form>
        ) : !error ? (
          <p className="mt-6 text-center text-sm text-neutral-500">{copy.verifying}</p>
        ) : null}
      </div>
    </main>
  );
}
