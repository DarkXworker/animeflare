import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';

export const runtime = 'edge';

const TMDB = 'https://api.themoviedb.org/3';
const IMG  = 'https://image.tmdb.org/t/p/original';

export async function GET(req: NextRequest) {
  // Admin only
  const { data: { user } } = await createServerSupabase().auth.getUser();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data: p } = await createAdminSupabase().from('profiles').select('role').eq('id', user.id).single();
  if (p?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const q    = req.nextUrl.searchParams.get('q');
  const type = req.nextUrl.searchParams.get('type') || 'anime';
  if (!q) return NextResponse.json({ results: [] });

  const endpoint = type === 'movie' ? 'search/movie' : 'search/tv';
  const res = await fetch(
    `${TMDB}/${endpoint}?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(q)}`,
    { next: { revalidate: 60 } }
  );
  const data = await res.json();

  const results = (data.results || []).slice(0, 10).map((item: any) => {
    const isMovie = type === 'movie';
    return {
      tmdb_id:      item.id,
      type,
      title:        isMovie ? item.title : item.name,
      description:  item.overview,
      poster:       item.poster_path   ? `${IMG}${item.poster_path}`   : null,
      banner:       item.backdrop_path ? `${IMG}${item.backdrop_path}` : null,
      rating:       item.vote_average  ? parseFloat(item.vote_average.toFixed(1)) : null,
      release_year: isMovie
        ? item.release_date?.slice(0, 4) ? parseInt(item.release_date.slice(0, 4)) : null
        : item.first_air_date?.slice(0, 4) ? parseInt(item.first_air_date.slice(0, 4)) : null,
      genres: [],
      status: !isMovie && item.status === 'Ended' ? 'completed' : 'ongoing',
    };
  });

  return NextResponse.json({ results });
}
