const express  = require('express');
const jwt      = require('jsonwebtoken');
const axios    = require('axios');
const { db }   = require('../../config/supabase');
const { authMiddleware } = require('../../middleware/authMiddleware');
const { streamGuard }    = require('../../middleware/streamGuard');
const {
  addActiveStream, removeActiveStream,
  heartbeat, getActiveStreamCount,
} = require('../../config/redis');
const logger = require('../../config/logger');

const router = express.Router();
const STREAM_SECRET = process.env.STREAM_TOKEN_SECRET;

// ─────────────────────────────────────────────────────
// POST /api/stream/request/:episodeId
// Returns stream token after validating user + plan
// ─────────────────────────────────────────────────────
router.post('/request/:episodeId', authMiddleware, streamGuard, async (req, res) => {
  try {
    const { episodeId } = req.params;
    const profile       = req.profile;

    // Check episode exists and is published
    const { data: episode, error: epErr } = await db()
      .from('episodes')
      .select('id, hls_master_url, hls_1080p_url, hls_720p_url, hls_480p_url, content_id, duration_sec')
      .eq('id', episodeId)
      .eq('is_published', true)
      .single();

    if (epErr || !episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    // Quality based on plan
    const plan = profile.plan || 'free';
    const allowedQualities = (plan === 'pro' || plan === 'premium')
      ? ['480p', '720p', '1080p']
      : ['480p', '720p'];

    // Sign stream token — expires in 4 hours
    const token = jwt.sign(
      { userId: req.user.id, episodeId, contentId: episode.content_id, plan, allowedQualities, type: 'stream' },
      STREAM_SECRET,
      { expiresIn: '4h' }
    );

    // Save to Supabase
    const expiresAt = new Date(Date.now() + 4 * 3600 * 1000).toISOString();
    await db().from('stream_tokens').insert({
      token,
      user_id:    req.user.id,
      episode_id: episodeId,
      expires_at: expiresAt,
    });

    // Track in Redis
    await addActiveStream(req.user.id, episodeId);

    logger.info({ userId: req.user.id, episodeId, plan }, 'Stream token issued');
    res.json({ token, allowedQualities });
  } catch (err) {
    logger.error({ err }, 'Stream request error');
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────
// GET /api/stream/play?token=
// Returns modified master.m3u8 (quality filtered by plan)
// ─────────────────────────────────────────────────────
router.get('/play', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(401).json({ error: 'Token required' });

  try {
    const decoded = jwt.verify(token, STREAM_SECRET);
    if (decoded.type !== 'stream') return res.status(401).json({ error: 'Invalid token' });

    // Check token still valid in DB
    const { data: dbToken } = await db()
      .from('stream_tokens')
      .select('id')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (!dbToken) return res.status(401).json({ error: 'Stream expired' });

    // Get episode HLS URLs
    const { data: ep } = await db()
      .from('episodes')
      .select('hls_1080p_url, hls_720p_url, hls_480p_url')
      .eq('id', decoded.episodeId)
      .single();

    if (!ep) return res.status(404).json({ error: 'Episode not found' });

    const allowed = decoded.allowedQualities || ['480p', '720p'];
    const base    = `${req.protocol}://${req.get('host')}`;

    // Build filtered master.m3u8
    const qualityMap = {
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

    res.set({
      'Content-Type':  'application/vnd.apple.mpegurl',
      'Cache-Control': 'no-store',
    });
    res.send(m3u8);
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Stream token expired' });
    logger.error({ err }, 'Play route error');
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────
// GET /api/stream/playlist?token=&url=
// Fetches quality .m3u8 and rewrites segment URLs
// ─────────────────────────────────────────────────────
router.get('/playlist', async (req, res) => {
  const { token, url } = req.query;
  if (!token || !url) return res.status(400).send('Bad request');

  try {
    jwt.verify(token, STREAM_SECRET);

    const sourceUrl = decodeURIComponent(url);
    const response  = await axios.get(sourceUrl, { timeout: 10000 });
    let content     = response.data;

    const baseUrl = sourceUrl.substring(0, sourceUrl.lastIndexOf('/') + 1);
    const origin  = `${req.protocol}://${req.get('host')}`;

    // Rewrite .ts segment URLs through our proxy
    content = content.replace(/^(?!#)(.+\.ts.*)$/gm, (match) => {
      const segUrl = match.startsWith('http') ? match : baseUrl + match;
      return `${origin}/api/stream/segment?token=${encodeURIComponent(token)}&url=${encodeURIComponent(segUrl)}`;
    });

    res.set({ 'Content-Type': 'application/vnd.apple.mpegurl', 'Cache-Control': 'no-store' });
    res.send(content);
  } catch (err) {
    logger.error({ err }, 'Playlist proxy error');
    res.status(500).send('Playlist fetch failed');
  }
});

// ─────────────────────────────────────────────────────
// GET /api/stream/segment?token=&url=
// Proxies .ts video segments — direct URL never exposed
// ─────────────────────────────────────────────────────
router.get('/segment', async (req, res) => {
  const { token, url } = req.query;
  if (!token || !url) return res.status(401).send('Unauthorized');

  try {
    jwt.verify(token, STREAM_SECRET);

    // Verify token still alive in DB
    const { data: dbToken } = await db()
      .from('stream_tokens')
      .select('id')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (!dbToken) return res.status(401).send('Stream expired');

    const segUrl  = decodeURIComponent(url);
    const response = await axios.get(segUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: { 'User-Agent': 'AnimeX-Proxy/1.0' },
    });

    res.set({
      'Content-Type':  'video/MP2T',
      'Cache-Control': 'private, max-age=3600',
    });
    res.send(response.data);
  } catch (err) {
    if (err.name?.includes('Token')) return res.status(401).send('Unauthorized');
    logger.error({ err }, 'Segment proxy error');
    res.status(502).send('Segment fetch failed');
  }
});

// ─────────────────────────────────────────────────────
// POST /api/stream/heartbeat
// Client calls every 30s to keep stream alive in Redis
// ─────────────────────────────────────────────────────
router.post('/heartbeat', authMiddleware, async (req, res) => {
  const { episodeId } = req.body;
  if (!episodeId) return res.status(400).json({ error: 'episodeId required' });
  try {
    await heartbeat(req.user.id, episodeId);
    res.json({ ok: true });
  } catch {
    res.json({ ok: true }); // Never fail on Redis issues
  }
});

// ─────────────────────────────────────────────────────
// POST /api/stream/stop
// Client calls when closing player
// ─────────────────────────────────────────────────────
router.post('/stop', authMiddleware, async (req, res) => {
  const { episodeId } = req.body;
  try {
    if (episodeId) await removeActiveStream(req.user.id, episodeId);
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

// ─────────────────────────────────────────────────────
// POST /api/stream/progress
// Save watch progress to Supabase
// ─────────────────────────────────────────────────────
router.post('/progress', authMiddleware, async (req, res) => {
  const { episodeId, progressSec, completed } = req.body;
  if (!episodeId || progressSec === undefined) {
    return res.status(400).json({ error: 'episodeId and progressSec required' });
  }

  try {
    const { data: ep } = await db()
      .from('episodes').select('content_id').eq('id', episodeId).single();
    if (!ep) return res.status(404).json({ error: 'Episode not found' });

    await db().from('watch_history').upsert({
      user_id:     req.user.id,
      episode_id:  episodeId,
      content_id:  ep.content_id,
      progress_sec: Math.floor(progressSec),
      completed:   !!completed,
      watched_at:  new Date().toISOString(),
    }, { onConflict: 'user_id,episode_id' });

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, 'Progress save error');
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
