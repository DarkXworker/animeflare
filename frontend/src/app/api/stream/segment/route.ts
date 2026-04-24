import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { createAdminSupabase } from '@/lib/supabase/server';

export const runtime = 'edge';

const SECRET = new TextEncoder().encode(process.env.STREAM_TOKEN_SECRET!);

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const url   = req.nextUrl.searchParams.get('url');
  if (!token || !url) return new NextResponse('Bad request', { status: 400 });

  try {
    await jwtVerify(token, SECRET);

    // Verify token still valid in DB (every segment call)
    const sb = createAdminSupabase();
    const { data } = await sb.from('stream_tokens')
      .select('id')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (!data) return new NextResponse('Stream expired', { status: 401 });

    // Fetch and proxy the .ts segment
    const segUrl = decodeURIComponent(url);
    const segRes = await fetch(segUrl, {
      headers: { 'User-Agent': 'AnimeX/1.0' },
    });
    if (!segRes.ok) return new NextResponse('Segment fetch failed', { status: 502 });

    const body = await segRes.arrayBuffer();
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'video/MP2T',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return new NextResponse('Unauthorized', { status: 401 });
  }
}
