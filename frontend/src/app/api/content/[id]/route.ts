import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase, createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sb    = createAdminSupabase();
    const sbAuth = createServerSupabase();
    const { data: { user } } = await sbAuth.auth.getUser();

    // Fetch content
    const { data: content, error } = await sb.from('content')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !content) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Fetch episodes
    const { data: episodes } = await sb.from('episodes')
      .select('id,episode_number,season_number,title,description,thumbnail,duration_sec,is_published')
      .eq('content_id', params.id)
      .eq('is_published', true)
      .order('season_number', { ascending: true })
      .order('episode_number', { ascending: true });

    content.episodes = episodes || [];

    // User-specific data
    if (user) {
      const [histRes, wlRes] = await Promise.all([
        sb.from('watch_history')
          .select('episode_id,progress_sec,completed')
          .eq('user_id', user.id)
          .in('episode_id', (episodes || []).map(e => e.id)),
        sb.from('watchlist')
          .select('id')
          .eq('user_id', user.id)
          .eq('content_id', params.id)
          .maybeSingle(),
      ]);
      content.watchProgress = histRes.data || [];
      content.inWatchlist   = !!wlRes.data;
    }

    // Similar content
    const { data: similar } = await sb.from('content')
      .select('id,title,poster,rating,release_year,type')
      .eq('type', content.type)
      .neq('id', params.id)
      .limit(8);
    content.similar = similar || [];

    return NextResponse.json(content);
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
