import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
export const runtime = 'edge';
export async function POST(req: NextRequest) {
  const { data: { user } } = await createServerSupabase().auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { episodeId, progressSec, completed } = await req.json();
  if (!episodeId || progressSec === undefined) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  const sb = createAdminSupabase();
  const { data: ep } = await sb.from('episodes').select('content_id').eq('id', episodeId).single();
  if (!ep) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await sb.from('watch_history').upsert({
    user_id: user.id, episode_id: episodeId, content_id: ep.content_id,
    progress_sec: Math.floor(progressSec), completed: !!completed,
    watched_at: new Date().toISOString(),
  }, { onConflict: 'user_id,episode_id' });
  return NextResponse.json({ ok: true });
}
