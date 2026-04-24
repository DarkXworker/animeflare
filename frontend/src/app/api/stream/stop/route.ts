import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { removeActiveStream } from '@/lib/redis';
export const runtime = 'edge';
export async function POST(req: NextRequest) {
  const { data: { user } } = await createServerSupabase().auth.getUser();
  if (!user) return NextResponse.json({ ok: true });
  const { episodeId } = await req.json();
  if (episodeId) await removeActiveStream(user.id, episodeId);
  return NextResponse.json({ ok: true });
}
