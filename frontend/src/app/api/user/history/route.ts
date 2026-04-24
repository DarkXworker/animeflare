import { NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function GET() {
  const { data: { user } } = await createServerSupabase().auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await createAdminSupabase()
    .from('watch_history')
    .select(`
      episode_id, progress_sec, completed, watched_at,
      episodes(episode_number, season_number, title, thumbnail, duration_sec,
        content(id, title, poster, type))
    `)
    .eq('user_id', user.id)
    .order('watched_at', { ascending: false })
    .limit(50);

  return NextResponse.json({ items: data || [] });
}
