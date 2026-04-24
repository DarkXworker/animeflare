// Upstash Redis REST API — no TCP, works on Vercel Edge/Serverless
// Free tier: 10k commands/day — plenty for stream tracking

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL!;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

async function redis(command: string[]) {
  const res = await fetch(`${REDIS_URL}/${command.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.result;
}

const STREAM_TTL  = 45; // seconds
const MAX_STREAMS = 2;

export async function addActiveStream(userId: string, episodeId: string) {
  await redis(['SADD', `stream:active:${userId}`, episodeId]);
  await redis(['EXPIRE', `stream:active:${userId}`, String(STREAM_TTL)]);
  await redis(['SETEX', `stream:hb:${userId}:${episodeId}`, String(STREAM_TTL), '1']);
}

export async function removeActiveStream(userId: string, episodeId: string) {
  await redis(['SREM', `stream:active:${userId}`, episodeId]);
  await redis(['DEL', `stream:hb:${userId}:${episodeId}`]);
}

export async function getActiveStreamCount(userId: string): Promise<number> {
  const members: string[] = (await redis(['SMEMBERS', `stream:active:${userId}`])) || [];
  let alive = 0;
  for (const epId of members) {
    const hb = await redis(['EXISTS', `stream:hb:${userId}:${epId}`]);
    if (hb) alive++;
    else await redis(['SREM', `stream:active:${userId}`, epId]);
  }
  return alive;
}

export async function heartbeat(userId: string, episodeId: string) {
  await redis(['EXPIRE', `stream:active:${userId}`, String(STREAM_TTL)]);
  await redis(['SETEX', `stream:hb:${userId}:${episodeId}`, String(STREAM_TTL), '1']);
}

export async function killUserStreams(userId: string) {
  const members: string[] = (await redis(['SMEMBERS', `stream:active:${userId}`])) || [];
  for (const epId of members) await redis(['DEL', `stream:hb:${userId}:${epId}`]);
  await redis(['DEL', `stream:active:${userId}`]);
}

export async function getAllActiveStreams() {
  // Get all active stream keys (admin use)
  const keys: string[] = (await redis(['KEYS', 'stream:active:*'])) || [];
  const result = [];
  for (const key of keys) {
    const userId = key.replace('stream:active:', '');
    const episodes: string[] = (await redis(['SMEMBERS', key])) || [];
    result.push({ userId, episodes });
  }
  return result;
}

export { MAX_STREAMS };
