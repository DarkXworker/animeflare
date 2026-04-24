const logger = require('./logger');

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// ── REST API wrapper ───────────────────────────────────
async function redis(command) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    logger.warn('Upstash Redis not configured — stream tracking disabled');
    return null;
  }
  try {
    const url = `${REDIS_URL}/${command.map(c => encodeURIComponent(c)).join('/')}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.result;
  } catch (err) {
    logger.error({ err }, 'Redis command failed');
    return null;
  }
}

// ── Constants ─────────────────────────────────────────
const STREAM_TTL  = 45; // seconds — refreshed by heartbeat every 30s
const MAX_STREAMS = 2;

// ── Stream tracking ────────────────────────────────────
async function addActiveStream(userId, episodeId) {
  await redis(['SADD', `stream:active:${userId}`, episodeId]);
  await redis(['EXPIRE', `stream:active:${userId}`, String(STREAM_TTL)]);
  await redis(['SETEX', `stream:hb:${userId}:${episodeId}`, String(STREAM_TTL), '1']);
}

async function removeActiveStream(userId, episodeId) {
  await redis(['SREM', `stream:active:${userId}`, episodeId]);
  await redis(['DEL', `stream:hb:${userId}:${episodeId}`]);
}

async function getActiveStreamCount(userId) {
  const members = await redis(['SMEMBERS', `stream:active:${userId}`]);
  if (!members || !Array.isArray(members)) return 0;
  let alive = 0;
  for (const epId of members) {
    const hb = await redis(['EXISTS', `stream:hb:${userId}:${epId}`]);
    if (hb) alive++;
    else await redis(['SREM', `stream:active:${userId}`, epId]); // cleanup stale
  }
  return alive;
}

async function heartbeat(userId, episodeId) {
  await redis(['EXPIRE', `stream:active:${userId}`, String(STREAM_TTL)]);
  await redis(['SETEX', `stream:hb:${userId}:${episodeId}`, String(STREAM_TTL), '1']);
}

async function killUserStreams(userId) {
  const members = await redis(['SMEMBERS', `stream:active:${userId}`]);
  if (members && Array.isArray(members)) {
    for (const epId of members) {
      await redis(['DEL', `stream:hb:${userId}:${epId}`]);
    }
  }
  await redis(['DEL', `stream:active:${userId}`]);
}

async function getAllActiveStreams() {
  const keys = await redis(['KEYS', 'stream:active:*']);
  if (!keys || !Array.isArray(keys)) return [];
  const result = [];
  for (const key of keys) {
    const userId  = key.replace('stream:active:', '');
    const episodes = await redis(['SMEMBERS', key]) || [];
    result.push({ userId, episodes });
  }
  return result;
}

module.exports = {
  addActiveStream,
  removeActiveStream,
  getActiveStreamCount,
  heartbeat,
  killUserStreams,
  getAllActiveStreams,
  MAX_STREAMS,
  STREAM_TTL,
};
