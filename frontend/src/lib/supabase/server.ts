import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// ── Server component / route handler client ────────────
export function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string)                           { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options)  { try { cookieStore.set({ name, value, ...options }); } catch {} },
        remove(name: string, options)               { try { cookieStore.set({ name, value: '', ...options }); } catch {} },
      },
    }
  );
}

// ── Admin client with service role (bypasses RLS) ─────
// Only use server-side in API routes for admin operations
export function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
