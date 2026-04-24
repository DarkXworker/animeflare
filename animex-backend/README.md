# AnimeX Backend — Express on Render

Standalone Express API server.
Connects to Supabase (DB) and Upstash Redis (stream tracking).

---

## Stack

| What        | Tool              |
|-------------|-------------------|
| Server      | Express + Node.js |
| Hosting     | Render (free tier)|
| Database    | Supabase          |
| Auth verify | Supabase JWT      |
| Cache       | Upstash Redis     |
| Metadata    | TMDB API          |

---

## API Routes

### Content (public)
```
GET  /api/content/home              Featured, trending, recent
GET  /api/content/list?type=anime   Paginated list with filters
GET  /api/content/search?q=         Search titles
GET  /api/content/:id               Detail + episodes
```

### Stream (auth required)
```
POST /api/stream/request/:episodeId  Get stream token
GET  /api/stream/play?token=         Filtered master.m3u8
GET  /api/stream/playlist?token=&url= Quality playlist proxy
GET  /api/stream/segment?token=&url=  .ts segment proxy
POST /api/stream/heartbeat           Keep stream alive (every 30s)
POST /api/stream/stop                End stream
POST /api/stream/progress            Save watch progress
```

### User (auth required)
```
GET    /api/user/profile    Get profile
PATCH  /api/user/profile    Update username/avatar
GET    /api/user/watchlist  Get watchlist
POST   /api/user/watchlist  Add to watchlist  { contentId }
DELETE /api/user/watchlist  Remove            { contentId }
GET    /api/user/history    Watch history
```

### Admin (admin role required)
```
GET    /api/admin/dashboard           Stats
GET    /api/admin/users               User list
PATCH  /api/admin/users/:id/plan      Change plan { plan, expiry }
PATCH  /api/admin/users/:id/ban       Ban/unban   { banned, reason }
GET    /api/admin/content             Content list
POST   /api/admin/content             Add content
PATCH  /api/admin/content/:id         Edit content
DELETE /api/admin/content/:id         Delete content
GET    /api/admin/episodes?content_id= Episode list
POST   /api/admin/episodes            Add episode
PATCH  /api/admin/episodes/:id        Edit episode
DELETE /api/admin/episodes/:id        Delete episode
GET    /api/admin/streams             Active streams
DELETE /api/admin/streams/:userId     Kill user streams
GET    /api/tmdb/search?q=&type=      TMDB search
```

---

## Local Setup

```bash
cd animex-backend
cp .env.example .env
# Fill in all values

npm install
npm run dev
# → http://localhost:4000
```

---

## Deploy to Render

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "initial"
git remote add origin https://github.com/you/animex-backend.git
git push -u origin main
```

### Step 2 — Create Render Web Service
```
1. https://render.com → New → Web Service
2. Connect your GitHub repo
3. Settings:
     Name:            animex-backend
     Region:          Singapore (or nearest)
     Branch:          main
     Runtime:         Node
     Build Command:   npm install
     Start Command:   npm start
     Plan:            Free (or Starter for always-on)
```

### Step 3 — Add Environment Variables in Render Dashboard
```
NODE_ENV                  = production
SUPABASE_URL              = https://xxx.supabase.co
SUPABASE_ANON_KEY         = eyJ...
SUPABASE_SERVICE_ROLE_KEY = eyJ...
STREAM_TOKEN_SECRET       = (click Generate — Render makes one for you)
UPSTASH_REDIS_REST_URL    = https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN  = xxx
TMDB_API_KEY              = your_tmdb_key
FRONTEND_URL              = https://your-animex.vercel.app
```

### Step 4 — Get your backend URL
```
After deploy, Render gives you:
  https://animex-backend.onrender.com

Set this in Vercel frontend env:
  NEXT_PUBLIC_API_URL = https://animex-backend.onrender.com
```

---

## ⚠ Free Tier Note

Render free tier **spins down after 15 minutes** of inactivity.
First request after sleep takes ~30 seconds (cold start).

To avoid this:
- Upgrade to Starter plan ($7/mo) → always on
- Or use a free uptime monitor like https://uptimerobot.com
  to ping `/health` every 10 minutes

---

## Auth Flow

```
Frontend (Vercel)              Backend (Render)
──────────────────             ────────────────
1. User logs in via
   Supabase Auth
   → gets access_token

2. API call with:
   Authorization: Bearer <access_token>

                               3. authMiddleware:
                                  verifySupabaseToken(token)
                                  → calls Supabase to verify
                                  → fetches profile (plan, role)
                                  → attaches to req.user/profile

4. Response ←─────────────────  5. Handler runs with verified user
```

---

## File Structure

```
animex-backend/
├── src/
│   ├── config/
│   │   ├── supabase.js    Supabase admin + anon clients
│   │   ├── redis.js       Upstash Redis stream tracking
│   │   └── logger.js      Pino logger
│   ├── middleware/
│   │   ├── authMiddleware.js  Verify Supabase JWT
│   │   └── streamGuard.js    Check concurrent stream limit
│   ├── modules/
│   │   ├── content/       Home, list, search, detail
│   │   ├── stream/        Token, proxy, heartbeat, progress
│   │   ├── user/          Profile, watchlist, history
│   │   ├── admin/         Dashboard, users, content, episodes
│   │   └── tmdb/          TMDB search integration
│   ├── app.js             Express app setup
│   └── server.js          Entry point
├── render.yaml            Render deployment config
├── package.json
└── .env.example
```
