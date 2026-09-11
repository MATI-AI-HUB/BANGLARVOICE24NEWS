// frontend/components/paywall.tsx
// Paywall component — shows for non-premium users

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface PaywallProps {
  articleId: string;
  articleTitle: string;
  children: React.ReactNode;
}

export function Paywall({ articleId, articleTitle, children }: PaywallProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAccess() {
      try {
        // Call paywall edge function
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        
        const { data, error } = await supabase.functions.invoke('paywall', {
          body: { articleId },
        });

        if (error) {
          console.error('paywall check failed:', error);
          setHasAccess(false);
        } else {
          setHasAccess(data.allowed ?? false);
        }
      } catch (err) {
        console.error('paywall error:', err);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    }

    checkAccess();
  }, [articleId]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
        <div className="h-4 bg-neutral-200 rounded"></div>
        <div className="h-4 bg-neutral-200 rounded w-5/6"></div>
      </div>
    );
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  // Paywall UI
  return (
    <div className="relative">
      {/* Blurred content preview */}
      <div className="pointer-events-none select-none blur-sm opacity-50">
        {children}
      </div>
      
      {/* Paywall overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-white via-white/90 to-transparent">
        <div className="max-w-md text-center px-6 py-8">
          <div className="mb-4 text-5xl">🔒</div>
          <h2 className="text-2xl font-bold text-neutral-900">
            প্রিমিয়াম আর্টিকেল
          </h2>
          <p className="mt-2 text-neutral-600">
            "{articleTitle}" পড়তে Premium সাবস্ক্রিপশন প্রয়োজন
          </p>
          <div className="mt-6 space-y-3">
            <Link
              href="/pricing"
              className="block w-full rounded-lg bg-blue-500 px-6 py-3 font-medium text-white hover:bg-blue-600 transition"
            >
              Premium নিন — ১৯৯৳/মাস
            </Link>
            <p className="text-sm text-neutral-500">
              সীমাহীন article • বিজ্ঞাপন মুক্ত • অফলাইন পড়া
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
