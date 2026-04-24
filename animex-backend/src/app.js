require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit  = require('express-rate-limit');
const logger     = require('./config/logger');

// ── Routes ────────────────────────────────────────────
const contentRoutes = require('./modules/content/contentRoutes');
const streamRoutes  = require('./modules/stream/streamRoutes');
const userRoutes    = require('./modules/user/userRoutes');
const adminRoutes   = require('./modules/admin/adminRoutes');
const tmdbRoutes    = require('./modules/tmdb/tmdbRoutes');

const app = express();

// ── Trust Render's proxy ──────────────────────────────
app.set('trust proxy', 1);

// ── Security headers ──────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// ── CORS ──────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_DEV,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    logger.warn({ origin }, 'CORS blocked origin');
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parsing ──────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Rate limiting ──────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

const streamLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many stream requests.' },
});

const segmentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500, // High — many segments per minute per user
  message: { error: 'Too many requests.' },
});

app.use('/api/', generalLimiter);
app.use('/api/stream/request', streamLimiter);
app.use('/api/stream/segment', segmentLimiter);

// ── Request logger ─────────────────────────────────────
app.use((req, res, next) => {
  logger.debug({ method: req.method, path: req.path }, 'Incoming request');
  next();
});

// ── Routes ────────────────────────────────────────────
app.use('/api/content', contentRoutes);
app.use('/api/stream',  streamRoutes);
app.use('/api/user',    userRoutes);
app.use('/api/admin',   adminRoutes);
app.use('/api/tmdb',    tmdbRoutes);

// ── Health check ──────────────────────────────────────
// Render uses this to verify the service is up
app.get('/health', (req, res) => {
  res.json({
    status:    'ok',
    service:   'animex-backend',
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV,
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'AnimeX API is running ✅' });
});

// ── 404 ────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────
app.use((err, req, res, next) => {
  logger.error({ err, path: req.path }, 'Unhandled error');
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS: origin not allowed' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
