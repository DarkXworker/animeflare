import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
export const runtime = 'edge';
async function checkAdmin() {
  const { data: { user } } = await createServerSupabase().auth.getUser();
  if (!user) return null;
  const { data: p } = await createAdminSupabase().from('profiles').select('role').eq('id', user.id).single();
  return p?.role === 'admin' ? user : null;
}
export async function GET(req: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type'); const search = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '100');
  const sb = createAdminSupabase();
  let q = sb.from('content').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(limit);
  if (type) q = q.eq('type', type);
  if (search) q = q.ilike('title', `%${search}%`);
  const { data, count } = await q;
  return NextResponse.json({ items: data || [], total: count || 0 });
}
export async function POST(req: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const { data, error } = await createAdminSupabase().from('content').insert(body).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
