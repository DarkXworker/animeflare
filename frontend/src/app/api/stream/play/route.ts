import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/server';
import { jwtVerify } from 'jose';

export const runtime = 'edge';

const SECRET = new TextEncoder().encode(process.env.STREAM_TOKEN_SECRET!);

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return new NextResponse('Unauthorized', { status: 401 });

  try {
    // Verify JWT
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.type !== 'stream') return new NextResponse('Invalid token', { status: 401 });

    // Check token in DB
    const sb = createAdminSupabase();
    const { data: dbToken } = await sb.from('stream_tokens')
      .select('id')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (!dbToken) return new NextResponse('Stream expired', { status: 401 });

    // Get episode URLs
    const { data: ep } = await sb.from('episodes')
      .select('hls_1080p_url,hls_720p_url,hls_480p_url')
      .eq('id', payload.episodeId as string)
      .single();
    if (!ep) return new NextResponse('Episode not found', { status: 404 });

    const allowed = (payload.allowedQualities as string[]) || ['480p', '720p'];
    const base = new URL(req.url).origin;

    // Build master.m3u8 with proxied URLs
    const qualityMap: Record<string, { url: string; bw: number; res: string }> = {
      '1080p': { url: ep.hls_1080p_url, bw: 5000000, res: '1920x1080' },
      '720p':  { url: ep.hls_720p_url,  bw: 2800000, res: '1280x720'  },
      '480p':  { url: ep.hls_480p_url,  bw: 1200000, res: '854x480'   },
    };

    let m3u8 = '#EXTM3U\n#EXT-X-VERSION:3\n';
    for (const q of ['1080p', '720p', '480p']) {
      if (!allowed.includes(q) || !qualityMap[q]?.url) continue;
      const { bw, res, url } = qualityMap[q];
      const proxied = `${base}/api/stream/playlist?token=${encodeURIComponent(token)}&url=${encodeURIComponent(url)}`;
      m3u8 += `#EXT-X-STREAM-INF:BANDWIDTH=${bw},RESOLUTION=${res},NAME="${q}"\n${proxied}\n`;
    }

    return new NextResponse(m3u8, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new NextResponse('Invalid token', { status: 401 });
  }
}
