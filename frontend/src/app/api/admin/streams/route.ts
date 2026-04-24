import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { getAllActiveStreams, killUserStreams } from '@/lib/redis';

export const runtime = 'edge';

async function checkAdmin() {
  const { data: { user } } = await createServerSupabase().auth.getUser();
  if (!user) return null;
  const { data: p } = await createAdminSupabase().from('profiles').select('role').eq('id', user.id).single();
  return p?.role === 'admin' ? user : null;
}

export async function GET() {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const streams = await getAllActiveStreams();
  return NextResponse.json({ streams, total: streams.length });
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { userId } = await req.json();
  await killUserStreams(userId);
  return NextResponse.json({ ok: true });
}
