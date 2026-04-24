import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type   = searchParams.get('type') || 'anime';
  const genre  = searchParams.get('genre') || '';
  const sort   = searchParams.get('sort')  || 'recent';
  const page   = parseInt(searchParams.get('page')  || '1');
  const limit  = parseInt(searchParams.get('limit') || '24');
  const search = searchParams.get('q') || '';
  const from   = (page - 1) * limit;

  try {
    const sb = createAdminSupabase();
    let query = sb.from('content')
      .select('id,type,title,title_jp,poster,rating,release_year,status,genres,total_episodes,sub_or_dub', { count: 'exact' })
      .eq('type', type);

    if (genre) query = query.contains('genres', [genre]);
    if (search) query = query.ilike('title', `%${search}%`);

    if (sort === 'rating') query = query.order('rating', { ascending: false, nullsFirst: false });
    else if (sort === 'az') query = query.order('title', { ascending: true });
    else query = query.order('created_at', { ascending: false });

    query = query.range(from, from + limit - 1);
    const { data, count, error } = await query;
    if (error) throw error;

    return NextResponse.json({ items: data || [], total: count || 0, page, limit });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
