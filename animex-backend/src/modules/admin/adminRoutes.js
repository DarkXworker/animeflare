const express = require('express');
const { db }  = require('../../config/supabase');
const { authMiddleware, adminOnly } = require('../../middleware/authMiddleware');
const { getAllActiveStreams, killUserStreams } = require('../../config/redis');
const logger  = require('../../config/logger');

const router = express.Router();

// All admin routes require auth + admin role
router.use(authMiddleware, adminOnly);

// ── GET /api/admin/dashboard ───────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const [profilesRes, contentRes, episodesRes, streams] = await Promise.all([
      db().from('profiles').select('plan, is_banned, created_at'),
      db().from('content').select('type'),
      db().from('episodes').select('is_published'),
      getAllActiveStreams(),
    ]);

    const users    = profilesRes.data  || [];
    const content  = contentRes.data   || [];
    const episodes = episodesRes.data  || [];
    const now      = Date.now();

    res.json({
      users: {
        total:    users.length,
        free:     users.filter(u => u.plan === 'free').length,
        mini:     users.filter(u => u.plan === 'mini').length,
        pro:      users.filter(u => u.plan === 'pro').length,
        premium:  users.filter(u => u.plan === 'premium').length,
        paid:     users.filter(u => u.plan !== 'free').length,
        banned:   users.filter(u => u.is_banned).length,
        newToday: users.filter(u => now - new Date(u.created_at).getTime() < 86400000).length,
      },
      content: {
        total:    content.length,
        anime:    content.filter(c => c.type === 'anime').length,
        movies:   content.filter(c => c.type === 'movie').length,
        episodes: episodes.length,
        published: episodes.filter(e => e.is_published).length,
      },
      activeStreams: streams.length,
      streams,
    });
  } catch (err) {
    logger.error({ err }, 'Admin dashboard error');
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/admin/users ───────────────────────────────
router.get('/users', async (req, res) => {
  const { search, plan, banned, limit = 200 } = req.query;
  try {
    let query = db()
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (plan)   query = query.eq('plan', plan);
    if (banned !== undefined) query = query.eq('is_banned', banned === 'true');

    const { data, error } = await query;
    if (error) throw error;

    let users = data || [];
    if (search) {
      const s = search.toLowerCase();
      users = users.filter(u =>
        u.username?.toLowerCase().includes(s) ||
        u.id?.toLowerCase().includes(s)
      );
    }

    res.json({ users, total: users.length });
  } catch (err) {
    logger.error({ err }, 'Admin users list error');
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/admin/users/:id/plan ───────────────────
router.patch('/users/:id/plan', async (req, res) => {
  const { plan, expiry } = req.body;
  if (!['free', 'mini', 'pro', 'premium'].includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan' });
  }
  try {
    await db().from('profiles').update({
      plan,
      plan_expiry: expiry || null,
      updated_at:  new Date().toISOString(),
    }).eq('id', req.params.id);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/admin/users/:id/ban ────────────────────
router.patch('/users/:id/ban', async (req, res) => {
  const { banned, reason } = req.body;
  try {
    await db().from('profiles').update({
      is_banned:  !!banned,
      ban_reason: reason || null,
      updated_at: new Date().toISOString(),
    }).eq('id', req.params.id);

    if (banned) await killUserStreams(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/admin/content ─────────────────────────────
router.get('/content', async (req, res) => {
  const { type, search, limit = 100 } = req.query;
  try {
    let query = db()
      .from('content')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (type)   query = query.eq('type', type);
    if (search) query = query.ilike('title', `%${search}%`);

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({ items: data || [], total: count || (data || []).length });
  } catch (err) {
    logger.error({ err }, 'Admin content list error');
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/admin/content ────────────────────────────
router.post('/content', async (req, res) => {
  try {
    const {
      tmdb_id, type, title, title_jp, description, genres,
      poster, banner, trailer_url, rating, release_year,
      status, is_featured, is_trending, language, sub_or_dub, total_episodes,
    } = req.body;

    if (!type || !title) return res.status(400).json({ error: 'type and title required' });

    const { data, error } = await db().from('content').insert({
      tmdb_id:       tmdb_id || null,
      type,
      title,
      title_jp:      title_jp      || null,
      description:   description   || null,
      genres:        genres        || [],
      poster:        poster        || null,
      banner:        banner        || null,
      trailer_url:   trailer_url   || null,
      rating:        rating        || null,
      release_year:  release_year  || null,
      status:        status        || 'ongoing',
      is_featured:   is_featured   || false,
      is_trending:   is_trending   || false,
      language:      language      || 'ja',
      sub_or_dub:    sub_or_dub    || 'sub',
      total_episodes: total_episodes || null,
    }).select('id').single();

    if (error) throw error;
    res.status(201).json({ id: data.id });
  } catch (err) {
    logger.error({ err }, 'Admin add content error');
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ── PATCH /api/admin/content/:id ──────────────────────
router.patch('/content/:id', async (req, res) => {
  const allowed = [
    'title', 'title_jp', 'description', 'genres', 'poster', 'banner',
    'trailer_url', 'rating', 'release_year', 'status',
    'is_featured', 'is_trending', 'language', 'sub_or_dub', 'total_episodes',
  ];
  const update = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }
  if (!Object.keys(update).length) return res.status(400).json({ error: 'No fields to update' });

  try {
    update.updated_at = new Date().toISOString();
    await db().from('content').update(update).eq('id', req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE /api/admin/content/:id ─────────────────────
router.delete('/content/:id', async (req, res) => {
  try {
    await db().from('content').delete().eq('id', req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/admin/episodes?content_id= ───────────────
router.get('/episodes', async (req, res) => {
  const { content_id } = req.query;
  if (!content_id) return res.status(400).json({ error: 'content_id required' });
  try {
    const { data } = await db()
      .from('episodes')
      .select('*')
      .eq('content_id', content_id)
      .order('season_number', { ascending: true })
      .order('episode_number', { ascending: true });

    res.json({ episodes: data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/admin/episodes ───────────────────────────
router.post('/episodes', async (req, res) => {
  try {
    const {
      content_id, episode_number, season_number = 1,
      title, description, thumbnail, duration_sec,
      hls_master_url, hls_1080p_url, hls_720p_url, hls_480p_url,
      tg_message_id, tg_file_id, is_published,
    } = req.body;

    if (!content_id || !episode_number) {
      return res.status(400).json({ error: 'content_id and episode_number required' });
    }

    const { data, error } = await db().from('episodes').insert({
      content_id,
      episode_number,
      season_number,
      title:         title         || null,
      description:   description   || null,
      thumbnail:     thumbnail     || null,
      duration_sec:  duration_sec  || null,
      hls_master_url: hls_master_url || null,
      hls_1080p_url:  hls_1080p_url  || null,
      hls_720p_url:   hls_720p_url   || null,
      hls_480p_url:   hls_480p_url   || null,
      tg_message_id: tg_message_id || null,
      tg_file_id:    tg_file_id    || null,
      is_published:  is_published !== false,
    }).select('id').single();

    if (error) throw error;

    // Update total_episodes count
    const { count } = await db()
      .from('episodes')
      .select('id', { count: 'exact', head: true })
      .eq('content_id', content_id)
      .eq('is_published', true);

    await db().from('content').update({
      total_episodes: count || 0,
      updated_at: new Date().toISOString(),
    }).eq('id', content_id);

    res.status(201).json({ id: data.id });
  } catch (err) {
    logger.error({ err }, 'Admin add episode error');
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ── PATCH /api/admin/episodes/:id ─────────────────────
router.patch('/episodes/:id', async (req, res) => {
  const allowed = [
    'title', 'description', 'thumbnail', 'duration_sec',
    'hls_master_url', 'hls_1080p_url', 'hls_720p_url', 'hls_480p_url',
    'tg_message_id', 'tg_file_id', 'is_published',
  ];
  const update = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }
  if (!Object.keys(update).length) return res.status(400).json({ error: 'No fields to update' });

  try {
    update.updated_at = new Date().toISOString();
    await db().from('episodes').update(update).eq('id', req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE /api/admin/episodes/:id ────────────────────
router.delete('/episodes/:id', async (req, res) => {
  try {
    const { data: ep } = await db()
      .from('episodes').select('content_id').eq('id', req.params.id).single();

    await db().from('episodes').delete().eq('id', req.params.id);

    if (ep?.content_id) {
      const { count } = await db()
        .from('episodes')
        .select('id', { count: 'exact', head: true })
        .eq('content_id', ep.content_id)
        .eq('is_published', true);

      await db().from('content').update({
        total_episodes: count || 0,
        updated_at: new Date().toISOString(),
      }).eq('id', ep.content_id);
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/admin/streams ─────────────────────────────
router.get('/streams', async (req, res) => {
  try {
    const streams = await getAllActiveStreams();
    res.json({ streams, total: streams.length });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE /api/admin/streams/:userId ─────────────────
router.delete('/streams/:userId', async (req, res) => {
  try {
    await killUserStreams(req.params.userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
