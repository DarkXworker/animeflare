import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function GET() {
  try {
    const sb = createAdminSupabase();

    const [featured, trending, animeList, movieList] = await Promise.all([
      sb.from('content')
        .select('id,tmdb_id,type,title,title_jp,description,poster,banner,rating,release_year,genres,sub_or_dub,status')
        .eq('is_featured', true)
        .eq('type', 'anime')
        .limit(6),
      sb.from('content')
        .select('id,type,title,title_jp,poster,banner,rating,release_year,genres,status')
        .eq('is_trending', true)
        .order('updated_at', { ascending: false })
        .limit(20),
      sb.from('content')
        .select('id,type,title,title_jp,poster,rating,release_year,status,genres,total_episodes,sub_or_dub')
        .eq('type', 'anime')
        .order('created_at', { ascending: false })
        .limit(20),
      sb.from('content')
        .select('id,type,title,poster,rating,release_year,genres,status')
        .eq('type', 'movie')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    return NextResponse.json({
      featured:    featured.data    || [],
      trending:    trending.data    || [],
      recentAnime: animeList.data   || [],
      recentMovies: movieList.data  || [],
    });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
