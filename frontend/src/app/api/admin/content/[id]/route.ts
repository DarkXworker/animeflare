import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
export const runtime = 'edge';
async function checkAdmin() {
  const { data: { user } } = await createServerSupabase().auth.getUser();
  if (!user) return null;
  const { data: p } = await createAdminSupabase().from('profiles').select('role').eq('id', user.id).single();
  return p?.role === 'admin' ? user : null;
}
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  await createAdminSupabase().from('content').update(body).eq('id', params.id);
  return NextResponse.json({ ok: true });
}
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await createAdminSupabase().from('content').delete().eq('id', params.id);
  return NextResponse.json({ ok: true });
}
