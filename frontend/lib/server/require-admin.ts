/**
 * Server-side admin guard (defense in depth on top of middleware).
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const ALLOWED_ROLES = ['admin', 'chief_editor', 'desk_editor'];

export type AuthUser = { id: string; email: string; role: string };

export async function requireAdmin(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data: profile } = await sb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || !ALLOWED_ROLES.includes(profile.role)) return null;
  return { id: user.id, email: user.email || '', role: profile.role };
}
