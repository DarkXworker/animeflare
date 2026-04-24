import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';

export const runtime = 'edge';

async function checkAdmin() {
  const { data: { user } } = await createServerSupabase().auth.getUser();
  if (!user) return null;
  const { data: p } = await createAdminSupabase().from('profiles').select('role').eq('id', user.id).single();
  return p?.role === 'admin' ? user : null;
}

// GET /api/admin/episodes?content_id=xxx
export async function GET(req: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const contentId = req.nextUrl.searchParams.get('content_id');
  if (!contentId) return NextResponse.json({ episodes: [] });

  const { data } = await createAdminSupabase()
    .from('episodes')
    .select('*')
    .eq('content_id', contentId)
    .order('season_number', { ascending: true })
    .order('episode_number', { ascending: true });

  return NextResponse.json({ episodes: data || [] });
}

// PATCH /api/admin/episodes/:id
export async function PATCH(req: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id, ...data } = await req.json();
  await createAdminSupabase().from('episodes').update(data).eq('id', id);
  return NextResponse.json({ ok: true });
}
