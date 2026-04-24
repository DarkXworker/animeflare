const express = require('express');
const { db }  = require('../../config/supabase');
const { authMiddleware } = require('../../middleware/authMiddleware');
const logger  = require('../../config/logger');

const router = express.Router();

// ── GET /api/user/profile ──────────────────────────────
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const { data } = await db()
      .from('profiles')
      .select('id, username, avatar, role, plan, plan_expiry, created_at')
      .eq('id', req.user.id)
      .single();

    res.json({ ...data, email: req.user.email });
  } catch (err) {
    logger.error({ err }, 'Profile fetch error');
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/user/profile ────────────────────────────
router.patch('/profile', authMiddleware, async (req, res) => {
  const { username, avatar } = req.body;
  try {
    if (username) {
      const { data: exists } = await db()
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', req.user.id)
        .maybeSingle();
      if (exists) return res.status(409).json({ error: 'Username already taken' });
    }

    const update = {};
    if (username) update.username = username;
    if (avatar)   update.avatar   = avatar;
    update.updated_at = new Date().toISOString();

    const { data } = await db()
      .from('profiles')
      .update(update)
      .eq('id', req.user.id)
      .select('id, username, avatar, plan')
      .single();

    res.json(data);
  } catch (err) {
    logger.error({ err }, 'Profile update error');
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/user/watchlist ────────────────────────────
router.get('/watchlist', authMiddleware, async (req, res) => {
  try {
    const { data } = await db()
      .from('watchlist')
      .select('content_id, added_at, content(id,type,title,poster,rating,release_year,status,total_episodes)')
      .eq('user_id', req.user.id)
      .order('added_at', { ascending: false });

    res.json({ items: data || [] });
  } catch (err) {
    logger.error({ err }, 'Watchlist fetch error');
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/user/watchlist ───────────────────────────
router.post('/watchlist', authMiddleware, async (req, res) => {
  const { contentId } = req.body;
  if (!contentId) return res.status(400).json({ error: 'contentId required' });
  try {
    await db().from('watchlist').upsert(
      { user_id: req.user.id, content_id: contentId },
      { onConflict: 'user_id,content_id' }
    );
    res.json({ ok: true, added: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE /api/user/watchlist ─────────────────────────
router.delete('/watchlist', authMiddleware, async (req, res) => {
  const { contentId } = req.body;
  if (!contentId) return res.status(400).json({ error: 'contentId required' });
  try {
    await db()
      .from('watchlist')
      .delete()
      .eq('user_id', req.user.id)
      .eq('content_id', contentId);
    res.json({ ok: true, removed: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/user/history ──────────────────────────────
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { data } = await db()
      .from('watch_history')
      .select(`
        episode_id, progress_sec, completed, watched_at,
        episodes(episode_number, season_number, title, thumbnail, duration_sec,
          content(id, title, poster, type))
      `)
      .eq('user_id', req.user.id)
      .order('watched_at', { ascending: false })
      .limit(50);

    res.json({ items: data || [] });
  } catch (err) {
    logger.error({ err }, 'History fetch error');
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
