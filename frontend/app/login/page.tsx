// frontend/app/login/page.tsx
// Simple Login Page for Protected Routes

'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectedFrom') || '/';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
    } else {
      router.push(redirectTo);
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-center mb-6">লগইন করুন</h1>
        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700">ইমেইল</label>
            <input 
              type="email" 
              required 
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">পাসওয়ার্ড</label>
            <input 
              type="password" 
              required 
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full rounded-lg bg-blue-500 px-4 py-2 font-medium text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'লোড হচ্ছে...' : 'লগইন'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-neutral-500">
          অ্যাক্সেস নেই? <a href="/register" className="text-blue-600 hover:underline">রেজিস্ট্রেশন করুন</a>
        </p>
      </div>
    </main>
  );
}
