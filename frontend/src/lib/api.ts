// All API calls go to Express backend on Render
// Set NEXT_PUBLIC_API_URL=https://animex-backend.onrender.com in Vercel

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function getToken(): Promise<string | null> {
  try {
    const { getSupabase } = await import('@/lib/supabase/client');
    const { data: { session } } = await getSupabase().auth.getSession();
    return session?.access_token ?? null;
  } catch { return null; }
}

async function call<T = any>(path: string, opts?: RequestInit): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts?.headers as any) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: 'Request failed' })); throw e; }
  return res.json();
}

function qs(p?: Record<string, any>) {
  if (!p) return '';
  const s = Object.entries(p).filter(([,v]) => v !== undefined && v !== null && v !== '').map(([k,v]) => `${k}=${encodeURIComponent(String(v))}`);
  return s.length ? '?' + s.join('&') : '';
}

export const contentApi = {
  home:   () => call('/api/content/home'),
  list:   (p: any) => call('/api/content/list' + qs(p)),
  detail: (id: string) => call(`/api/content/${id}`),
  search: (q: string, type?: string) => call('/api/content/search' + qs({ q, type })),
};

export const streamApi = {
  request:  (episodeId: string) => call(`/api/stream/request/${episodeId}`, { method: 'POST' }),
  heartbeat: (episodeId: string) => call('/api/stream/heartbeat', { method: 'POST', body: JSON.stringify({ episodeId }) }),
  stop:      (episodeId: string) => call('/api/stream/stop',      { method: 'POST', body: JSON.stringify({ episodeId }) }),
  progress:  (episodeId: string, progressSec: number, completed?: boolean) =>
    call('/api/stream/progress', { method: 'POST', body: JSON.stringify({ episodeId, progressSec, completed }) }),
  playUrl: (token: string) => `${API}/api/stream/play?token=${token}`,
};

export const userApi = {
  profile:         () => call('/api/user/profile'),
  updateProfile:   (d: any) => call('/api/user/profile',   { method: 'PATCH',  body: JSON.stringify(d) }),
  watchlist:       () => call('/api/user/watchlist'),
  addWatchlist:    (contentId: string) => call('/api/user/watchlist', { method: 'POST',   body: JSON.stringify({ contentId }) }),
  removeWatchlist: (contentId: string) => call('/api/user/watchlist', { method: 'DELETE', body: JSON.stringify({ contentId }) }),
  history:         () => call('/api/user/history'),
};

export const adminApi = {
  dashboard:     () => call('/api/admin/dashboard'),
  users:         (p?: any) => call('/api/admin/users' + qs(p)),
  updateUserPlan:(id: string, plan: string, expiry?: string) => call(`/api/admin/users/${id}/plan`, { method: 'PATCH', body: JSON.stringify({ plan, expiry }) }),
  banUser:       (id: string, banned: boolean, reason?: string) => call(`/api/admin/users/${id}/ban`, { method: 'PATCH', body: JSON.stringify({ banned, reason }) }),
  content:       (p?: any) => call('/api/admin/content' + qs(p)),
  addContent:    (d: any) => call('/api/admin/content',        { method: 'POST',   body: JSON.stringify(d) }),
  updateContent: (id: string, d: any) => call(`/api/admin/content/${id}`,  { method: 'PATCH',  body: JSON.stringify(d) }),
  deleteContent: (id: string) => call(`/api/admin/content/${id}`,           { method: 'DELETE' }),
  episodes:      (contentId: string) => call(`/api/admin/episodes?content_id=${contentId}`),
  addEpisode:    (d: any) => call('/api/admin/episodes',       { method: 'POST',   body: JSON.stringify(d) }),
  updateEpisode: (id: string, d: any) => call(`/api/admin/episodes/${id}`,  { method: 'PATCH',  body: JSON.stringify(d) }),
  deleteEpisode: (id: string) => call(`/api/admin/episodes/${id}`,           { method: 'DELETE' }),
  streams:       () => call('/api/admin/streams'),
  killStream:    (userId: string) => call(`/api/admin/streams/${userId}`,    { method: 'DELETE' }),
  tmdbSearch:    (q: string, type: string) => call(`/api/tmdb/search?q=${encodeURIComponent(q)}&type=${type}`),
};
