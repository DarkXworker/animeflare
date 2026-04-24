import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
export const runtime = 'edge';
async function checkAdmin() {
  const { data: { user } } = await createServerSupabase().auth.getUser();
  if (!user) return null;
  const { data: p } = await createAdminSupabase().from('profiles').select('role').eq('id', user.id).single();
  return p?.role === 'admin' ? user : null;
}
export async function GET() {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data } = await createAdminSupabase().from('profiles').select('*').order('created_at', { ascending: false }).limit(500);
  return NextResponse.json({ users: data || [] });
}
export async function PATCH(req: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { userId, plan, expiry, banned, banReason } = await req.json();
  const update: any = {};
  if (plan !== undefined) { update.plan = plan; update.plan_expiry = expiry || null; }
  if (banned !== undefined) { update.is_banned = banned; update.ban_reason = banReason || null; }
  await createAdminSupabase().from('profiles').update(update).eq('id', userId);
  return NextResponse.json({ ok: true });
}
