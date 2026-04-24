import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
export const runtime = 'edge';
export async function GET() {
  const { data: { user } } = await createServerSupabase().auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data } = await createAdminSupabase()
    .from('watchlist')
    .select('content_id, added_at, content(id,type,title,poster,rating,release_year,status,total_episodes)')
    .eq('user_id', user.id)
    .order('added_at', { ascending: false });
  return NextResponse.json({ items: data || [] });
}
export async function POST(req: NextRequest) {
  const { data: { user } } = await createServerSupabase().auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { contentId } = await req.json();
  await createAdminSupabase().from('watchlist').upsert({ user_id: user.id, content_id: contentId }, { onConflict: 'user_id,content_id' });
  return NextResponse.json({ ok: true });
}
export async function DELETE(req: NextRequest) {
  const { data: { user } } = await createServerSupabase().auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { contentId } = await req.json();
  await createAdminSupabase().from('watchlist').delete().eq('user_id', user.id).eq('content_id', contentId);
  return NextResponse.json({ ok: true });
}
