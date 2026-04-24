import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { addActiveStream, getActiveStreamCount, MAX_STREAMS } from '@/lib/redis';
import { SignJWT } from 'jose';

export const runtime = 'edge';

const SECRET = new TextEncoder().encode(process.env.STREAM_TOKEN_SECRET!);

export async function POST(req: NextRequest, { params }: { params: { episodeId: string } }) {
  try {
    // Auth check
    const sbAuth = createServerSupabase();
    const { data: { user }, error: authErr } = await sbAuth.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get user profile
    const sb = createAdminSupabase();
    const { data: profile } = await sb.from('profiles').select('plan,plan_expiry,is_banned').eq('id', user.id).single();
    if (!profile || profile.is_banned) return NextResponse.json({ error: 'Account banned' }, { status: 403 });

    // Downgrade expired plan
    let plan = profile.plan;
    if (plan !== 'free' && profile.plan_expiry && new Date(profile.plan_expiry) < new Date()) {
      await sb.from('profiles').update({ plan: 'free' }).eq('id', user.id);
      plan = 'free';
    }

    // Concurrent stream check
    const activeCount = await getActiveStreamCount(user.id);
    if (activeCount >= MAX_STREAMS) {
      return NextResponse.json({ error: 'Max streams reached', code: 'MAX_STREAMS' }, { status: 429 });
    }

    // Get episode
    const { data: episode, error: epErr } = await sb.from('episodes')
      .select('id,hls_master_url,hls_1080p_url,hls_720p_url,hls_480p_url,content_id')
      .eq('id', params.episodeId)
      .eq('is_published', true)
      .single();
    if (epErr || !episode) return NextResponse.json({ error: 'Episode not found' }, { status: 404 });

    const allowedQualities = (plan === 'pro' || plan === 'premium')
      ? ['480p', '720p', '1080p']
      : ['480p', '720p'];

    // Sign JWT (4h expiry)
    const token = await new SignJWT({
      userId: user.id,
      episodeId: episode.id,
      plan,
      allowedQualities,
      type: 'stream',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('4h')
      .sign(SECRET);

    // Save token in Supabase
    const expiresAt = new Date(Date.now() + 4 * 3600 * 1000).toISOString();
    await sb.from('stream_tokens').insert({ token, user_id: user.id, episode_id: episode.id, expires_at: expiresAt });

    // Track in Redis
    await addActiveStream(user.id, episode.id);

    return NextResponse.json({ token, allowedQualities });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
