const express = require('express');
const { db }  = require('../../config/supabase');
const { optionalAuth } = require('../../middleware/authMiddleware');
const logger  = require('../../config/logger');

const router = express.Router();

// ── GET /api/content/home ──────────────────────────────
router.get('/home', optionalAuth, async (req, res) => {
  try {
    const [featured, trending, animeList, movieList] = await Promise.all([
      db().from('content')
        .select('id,tmdb_id,type,title,title_jp,description,poster,banner,rating,release_year,genres,sub_or_dub,status')
        .eq('is_featured', true).eq('type', 'anime').limit(6),

      db().from('content')
        .select('id,type,title,title_jp,poster,banner,rating,release_year,genres,status')
        .eq('is_trending', true).order('updated_at', { ascending: false }).limit(20),

      db().from('content')
        .select('id,type,title,title_jp,poster,rating,release_year,status,genres,total_episodes,sub_or_dub')
        .eq('type', 'anime').order('created_at', { ascending: false }).limit(20),

      db().from('content')
        .select('id,type,title,poster,rating,release_year,genres,status')
        .eq('type', 'movie').order('created_at', { ascending: false }).limit(20),
    ]);

    res.json({
      featured:     featured.data    || [],
      trending:     trending.data    || [],
      recentAnime:  animeList.data   || [],
      recentMovies: movieList.data   || [],
    });
  } catch (err) {
    logger.error({ err }, 'Home route error');
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/content/list?type=anime&genre=&sort=&page=&limit=&q= ──
router.get('/list', async (req, res) => {
  const { type = 'anime', genre, sort = 'recent', page = 1, limit = 24, q } = req.query;
  const from = (parseInt(page) - 1) * parseInt(limit);

  try {
    let query = db().from('content')
      .select('id,type,title,title_jp,poster,rating,release_year,status,genres,total_episodes,sub_or_dub', { count: 'exact' })
      .eq('type', type);

    if (genre) query = query.contains('genres', [genre]);
    if (q)     query = query.ilike('title', `%${q}%`);

    if (sort === 'rating') query = query.order('rating', { ascending: false, nullsFirst: false });
    else if (sort === 'az') query = query.order('title', { ascending: true });
    else query = query.order('created_at', { ascending: false });

    query = query.range(from, from + parseInt(limit) - 1);
    const { data, count, error } = await query;
    if (error) throw error;

    res.json({ items: data || [], total: count || 0, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    logger.error({ err }, 'Content list error');
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/content/search?q=&type= ──────────────────
router.get('/search', async (req, res) => {
  const { q, type } = req.query;
  if (!q || q.length < 2) return res.json({ items: [] });

  try {
    let query = db().from('content')
      .select('id,type,title,title_jp,poster,rating,release_year')
      .ilike('title', `%${q}%`)
      .limit(20);

    if (type) query = query.eq('type', type);

    const { data } = await query;
    res.json({ items: data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/content/:id ───────────────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { data: content, error } = await db().from('content')
      .select('*').eq('id', req.params.id).single();

    if (error || !content) return res.status(404).json({ error: 'Not found' });

    // Episodes (published only for non-admin)
    const { data: episodes } = await db().from('episodes')
      .select('id,episode_number,season_number,title,description,thumbnail,duration_sec,is_published')
      .eq('content_id', req.params.id)
      .eq('is_published', true)
      .order('season_number', { ascending: true })
      .order('episode_number', { ascending: true });

    content.episodes = episodes || [];

    // User-specific data
    if (req.user) {
      const [histRes, wlRes] = await Promise.all([
        db().from('watch_history')
          .select('episode_id,progress_sec,completed')
          .eq('user_id', req.user.id)
          .in('episode_id', (episodes || []).map(e => e.id)),
        db().from('watchlist')
          .select('id')
          .eq('user_id', req.user.id)
          .eq('content_id', req.params.id)
          .maybeSingle(),
      ]);
      content.watchProgress = histRes.data || [];
      content.inWatchlist   = !!wlRes.data;
    }

    // Similar
    const { data: similar } = await db().from('content')
      .select('id,title,poster,rating,release_year,type')
      .eq('type', content.type)
      .neq('id', req.params.id)
      .limit(8);
    content.similar = similar || [];

    res.json(content);
  } catch (err) {
    logger.error({ err }, 'Content detail error');
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
