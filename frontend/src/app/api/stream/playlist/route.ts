import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export const runtime = 'edge';

const SECRET = new TextEncoder().encode(process.env.STREAM_TOKEN_SECRET!);

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const url   = req.nextUrl.searchParams.get('url');
  if (!token || !url) return new NextResponse('Bad request', { status: 400 });

  try {
    await jwtVerify(token, SECRET);

    const sourceUrl = decodeURIComponent(url);
    const res = await fetch(sourceUrl, { headers: { 'User-Agent': 'AnimeX/1.0' } });
    if (!res.ok) return new NextResponse('Playlist fetch failed', { status: 502 });

    let content = await res.text();
    const base = sourceUrl.substring(0, sourceUrl.lastIndexOf('/') + 1);
    const origin = new URL(req.url).origin;

    // Rewrite .ts segment URLs to go through our /api/stream/segment proxy
    content = content.replace(/^(?!#)(.+\.ts.*)$/gm, (match) => {
      const segUrl = match.startsWith('http') ? match : base + match;
      return `${origin}/api/stream/segment?token=${encodeURIComponent(token)}&url=${encodeURIComponent(segUrl)}`;
    });

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return new NextResponse('Unauthorized', { status: 401 });
  }
}
