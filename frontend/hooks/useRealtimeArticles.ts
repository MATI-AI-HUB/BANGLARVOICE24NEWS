'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';

export type RealtimeArticle = {
  id: string;
  title_bn: string;
  category: string | null;
  published_at: string | null;
};

export function useRealtimeArticles(initial: RealtimeArticle[] = []) {
  const [articles, setArticles] = useState<RealtimeArticle[]>(initial);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('articles-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'articles',
          filter: 'status=eq.published',
        },
        (payload: RealtimePostgresInsertPayload<RealtimeArticle>) => {
          const row = payload.new;
          setArticles((prev) => [row, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return articles;
}
