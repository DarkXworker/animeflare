import { NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { getAllActiveStreams } from '@/lib/redis';
export const runtime = 'edge';
export async function GET() {
  const { data: { user } } = await createServerSupabase().auth.getUser();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data: p } = await createAdminSupabase().from('profiles').select('role').eq('id', user.id).single();
  if (p?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const sb = createAdminSupabase();
  const [profiles, contentData, episodesData, streams] = await Promise.all([
    sb.from('profiles').select('plan,is_banned,created_at'),
    sb.from('content').select('type'),
    sb.from('episodes').select('is_published'),
    getAllActiveStreams(),
  ]);
  const users = profiles.data || [];
  const now = Date.now();
  return NextResponse.json({
    users: {
      total: users.length,
      free: users.filter(u => u.plan === 'free').length,
      paid: users.filter(u => u.plan !== 'free').length,
      banned: users.filter(u => u.is_banned).length,
      newToday: users.filter(u => now - new Date(u.created_at).getTime() < 86400000).length,
    },
    content: {
      total: (contentData.data || []).length,
      anime: (contentData.data || []).filter(c => c.type === 'anime').length,
      movies: (contentData.data || []).filter(c => c.type === 'movie').length,
      episodes: (episodesData.data || []).length,
    },
    activeStreams: streams.length,
    streams,
  });
}
