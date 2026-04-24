const express = require('express');
const axios   = require('axios');
const { authMiddleware, adminOnly } = require('../../middleware/authMiddleware');
const logger  = require('../../config/logger');

const router   = express.Router();
const TMDB     = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
const IMG_BASE = process.env.TMDB_IMAGE_BASE || 'https://image.tmdb.org/t/p/original';
const API_KEY  = process.env.TMDB_API_KEY;

// Only admins can use TMDB search
router.use(authMiddleware, adminOnly);

// ── GET /api/tmdb/search?q=&type= ─────────────────────
router.get('/search', async (req, res) => {
  const { q, type = 'anime' } = req.query;
  if (!q) return res.json({ results: [] });

  try {
    const endpoint = type === 'movie' ? 'search/movie' : 'search/tv';
    const response = await axios.get(`${TMDB}/${endpoint}`, {
      params: { api_key: API_KEY, query: q },
      timeout: 8000,
    });

    const results = (response.data.results || []).slice(0, 10).map(item => {
      const isMovie = type === 'movie';
      return {
        tmdb_id:      item.id,
        type,
        title:        isMovie ? item.title : item.name,
        description:  item.overview || null,
        poster:       item.poster_path   ? `${IMG_BASE}${item.poster_path}`   : null,
        banner:       item.backdrop_path ? `${IMG_BASE}${item.backdrop_path}` : null,
        rating:       item.vote_average  ? parseFloat(item.vote_average.toFixed(1)) : null,
        release_year: isMovie
          ? (item.release_date?.slice(0, 4)   ? parseInt(item.release_date.slice(0, 4))   : null)
          : (item.first_air_date?.slice(0, 4) ? parseInt(item.first_air_date.slice(0, 4)) : null),
        genres:  [],
        status:  (!isMovie && item.status === 'Ended') ? 'completed' : 'ongoing',
      };
    });

    res.json({ results });
  } catch (err) {
    logger.error({ err }, 'TMDB search error');
    res.status(500).json({ error: 'TMDB fetch failed' });
  }
});

// ── GET /api/tmdb/movie/:id ────────────────────────────
router.get('/movie/:id', async (req, res) => {
  try {
    const { data } = await axios.get(`${TMDB}/movie/${req.params.id}`, {
      params: { api_key: API_KEY },
    });
    res.json({
      tmdb_id:     data.id,
      type:        'movie',
      title:       data.title,
      description: data.overview,
      poster:      data.poster_path   ? `${IMG_BASE}${data.poster_path}`   : null,
      banner:      data.backdrop_path ? `${IMG_BASE}${data.backdrop_path}` : null,
      rating:      data.vote_average  ? parseFloat(data.vote_average.toFixed(1)) : null,
      release_year: data.release_date?.slice(0, 4) ? parseInt(data.release_date.slice(0, 4)) : null,
      genres:      (data.genres || []).map(g => g.name),
    });
  } catch (err) {
    res.status(500).json({ error: 'TMDB fetch failed' });
  }
});

// ── GET /api/tmdb/tv/:id ───────────────────────────────
router.get('/tv/:id', async (req, res) => {
  try {
    const { data } = await axios.get(`${TMDB}/tv/${req.params.id}`, {
      params: { api_key: API_KEY },
    });
    res.json({
      tmdb_id:        data.id,
      type:           'anime',
      title:          data.name,
      description:    data.overview,
      poster:         data.poster_path   ? `${IMG_BASE}${data.poster_path}`   : null,
      banner:         data.backdrop_path ? `${IMG_BASE}${data.backdrop_path}` : null,
      rating:         data.vote_average  ? parseFloat(data.vote_average.toFixed(1)) : null,
      release_year:   data.first_air_date?.slice(0, 4) ? parseInt(data.first_air_date.slice(0, 4)) : null,
      genres:         (data.genres || []).map(g => g.name),
      total_episodes: data.number_of_episodes || null,
      status:         data.status === 'Ended' ? 'completed' : 'ongoing',
    });
  } catch (err) {
    res.status(500).json({ error: 'TMDB fetch failed' });
  }
});

module.exports = router;
