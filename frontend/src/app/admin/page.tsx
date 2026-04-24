'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { adminApi } from '@/lib/api';
import {
  LayoutDashboard, Users, Film, Tv2, Zap,
  ChevronLeft, Plus, Trash2, RefreshCw,
  Loader2, Ban, Check, Shield, Search,
  TrendingUp, Star, Eye, EyeOff,
} from 'lucide-react';
import Link from 'next/link';

type Tab = 'dashboard' | 'users' | 'content' | 'episodes' | 'streams';

export default function AdminPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('dashboard');

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'admin')) router.replace('/');
  }, [user, profile, loading]);

  if (loading || !profile || profile.role !== 'admin') return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <Loader2 size={28} className="animate-spin" style={{ color: '#9d7ffd' }} />
    </div>
  );

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'users',     label: 'Users',     icon: Users           },
    { key: 'content',   label: 'Content',   icon: Film            },
    { key: 'episodes',  label: 'Episodes',  icon: Tv2             },
    { key: 'streams',   label: 'Streams',   icon: Zap             },
  ];

  return (
    <div className="min-h-dvh pb-6" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-40 flex items-center gap-3 px-4"
        style={{
          height: 'var(--header-h)',
          background: 'rgba(8,8,15,0.92)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(124,92,252,0.15)',
        }}
      >
        <Link href="/" className="w-9 h-9 rounded-xl glass flex items-center justify-center flex-shrink-0">
          <ChevronLeft size={18} />
        </Link>
        <div className="flex items-center gap-2">
          <Shield size={16} style={{ color: '#9d7ffd' }} />
          <span className="font-black text-sm grad-text" style={{ fontFamily: 'Syne, sans-serif' }}>
            Admin Panel
          </span>
        </div>
        <span className="ml-auto text-xs" style={{ color: 'var(--text3)', fontFamily: 'Syne, sans-serif' }}>
          {profile.username}
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1.5 px-4 py-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
            style={{
              fontFamily: 'Syne, sans-serif',
              background: tab === key ? 'rgba(124,92,252,0.2)' : 'rgba(255,255,255,0.05)',
              border: tab === key ? '1px solid rgba(124,92,252,0.4)' : '1px solid transparent',
              color: tab === key ? '#9d7ffd' : 'var(--text3)',
            }}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-4">
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'users'     && <UsersTab />}
        {tab === 'content'   && <ContentTab />}
        {tab === 'episodes'  && <EpisodesTab />}
        {tab === 'streams'   && <StreamsTab />}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   DASHBOARD TAB
───────────────────────────────────────────────────── */
function DashboardTab() {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    adminApi.dashboard().then(setData).catch(console.error).finally(() => setBusy(false));
  }, []);

  if (busy) return <Spinner />;
  if (!data) return null;

  const statCards = [
    { label: 'Total Users',    value: data.users.total,      color: '#9d7ffd', sub: `+${data.users.newToday} today` },
    { label: 'Paid Users',     value: data.users.paid,       color: '#f472b6', sub: `${data.users.free} free`       },
    { label: 'Banned',         value: data.users.banned,     color: '#f87171', sub: 'accounts'                      },
    { label: 'Active Streams', value: data.activeStreams,    color: '#4ade80', sub: 'right now'                     },
    { label: 'Anime',          value: data.content.anime,    color: '#60a5fa', sub: 'titles'                        },
    { label: 'Movies',         value: data.content.movies,   color: '#fb923c', sub: 'titles'                        },
    { label: 'Episodes',       value: data.content.episodes, color: '#a78bfa', sub: 'total'                         },
    { label: 'Content Total',  value: data.content.total,    color: '#67e8f9', sub: 'all types'                     },
  ];

  return (
    <div className="animate-fade-in">
      <p className="section-label mb-4">Overview</p>
      <div className="grid grid-cols-2 gap-3">
        {statCards.map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-2xl font-black" style={{ color: s.color, fontFamily: 'Syne, sans-serif' }}>
              {s.value ?? 0}
            </p>
            <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text)' }}>{s.label}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   USERS TAB
───────────────────────────────────────────────────── */
function UsersTab() {
  const [users, setUsers]   = useState<any[]>([]);
  const [busy, setBusy]     = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    try { const r = await adminApi.users(); setUsers(r.users || []); }
    catch {} finally { setBusy(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u =>
    !search || u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.id?.toLowerCase().includes(search.toLowerCase())
  );

  const updatePlan = async (userId: string, plan: string) => {
    setSaving(userId);
    let expiry: string | undefined;
    if (plan !== 'free') {
      const weeks = plan === 'premium' ? 4 : 1;
      expiry = new Date(Date.now() + weeks * 7 * 24 * 3600 * 1000).toISOString();
    }
    try { await adminApi.updateUser({ userId, plan, expiry }); await load(); }
    catch {} finally { setSaving(null); }
  };

  const toggleBan = async (userId: string, isBanned: boolean) => {
    setSaving(userId);
    try { await adminApi.updateUser({ userId, banned: !isBanned }); await load(); }
    catch {} finally { setSaving(null); }
  };

  return (
    <div className="animate-fade-in">
      {/* Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users…"
            className="input pl-9 text-sm"
            style={{ height: '38px' }}
          />
        </div>
        <button onClick={load} className="w-9 h-9 rounded-xl glass flex items-center justify-center">
          <RefreshCw size={14} style={{ color: 'var(--text2)' }} />
        </button>
        <span className="text-xs flex-shrink-0" style={{ color: 'var(--text3)' }}>{filtered.length}</span>
      </div>

      {busy ? <Spinner /> : (
        <div className="space-y-2">
          {filtered.map(u => (
            <div key={u.id} className="card p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-black text-white"
                    style={{ background: 'linear-gradient(135deg, #7c5cfc, #f040a0)', fontFamily: 'Syne, sans-serif' }}
                  >
                    {u.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate" style={{ fontFamily: 'Syne, sans-serif' }}>{u.username}</p>
                    <p className="text-[10px] truncate" style={{ color: 'var(--text3)' }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {u.role === 'admin' && <span className="badge badge-pink" style={{ fontSize: '0.6rem' }}>Admin</span>}
                  <span className={`badge ${u.is_banned ? 'badge-red' : 'badge-green'}`} style={{ fontSize: '0.6rem' }}>
                    {u.is_banned ? 'Banned' : 'Active'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Plan selector */}
                <select
                  value={u.plan || 'free'}
                  onChange={e => updatePlan(u.id, e.target.value)}
                  disabled={saving === u.id}
                  className="text-xs rounded-xl px-2 py-1.5 outline-none transition-all"
                  style={{
                    background: 'rgba(124,92,252,0.1)',
                    border: '1px solid rgba(124,92,252,0.25)',
                    color: '#9d7ffd',
                    fontFamily: 'Syne, sans-serif',
                    fontWeight: 700,
                  }}
                >
                  {['free', 'mini', 'pro', 'premium'].map(p => (
                    <option key={p} value={p} style={{ background: '#0c0c16' }}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>
                  ))}
                </select>

                {/* Ban toggle */}
                <button
                  onClick={() => toggleBan(u.id, u.is_banned)}
                  disabled={saving === u.id || u.role === 'admin'}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all"
                  style={{
                    fontFamily: 'Syne, sans-serif',
                    background: u.is_banned ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                    border: `1px solid ${u.is_banned ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
                    color: u.is_banned ? '#4ade80' : '#f87171',
                    opacity: (saving === u.id || u.role === 'admin') ? 0.5 : 1,
                  }}
                >
                  {saving === u.id
                    ? <Loader2 size={11} className="animate-spin" />
                    : u.is_banned ? <><Check size={11} /> Unban</> : <><Ban size={11} /> Ban</>
                  }
                </button>

                {u.plan_expiry && (
                  <span className="text-[10px]" style={{ color: 'var(--text3)' }}>
                    Exp: {new Date(u.plan_expiry).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   CONTENT TAB
───────────────────────────────────────────────────── */
function ContentTab() {
  const [items, setItems]       = useState<any[]>([]);
  const [busy, setBusy]         = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [tmdbQ, setTmdbQ]       = useState('');
  const [tmdbRes, setTmdbRes]   = useState<any[]>([]);
  const [tmdbBusy, setTmdbBusy] = useState(false);
  const [form, setForm]         = useState<any>({ type: 'anime', status: 'ongoing', is_featured: false, is_trending: false });

  const load = async () => {
    setBusy(true);
    try { const r = await adminApi.content({ limit: 100 }); setItems(r.items || []); }
    catch {} finally { setBusy(false); }
  };

  useEffect(() => { load(); }, []);

  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const searchTmdb = async () => {
    if (!tmdbQ.trim()) return;
    setTmdbBusy(true);
    try {
      const r = await adminApi.tmdbSearch(tmdbQ, form.type);
      setTmdbRes(r.results || []);
    } catch {} finally { setTmdbBusy(false); }
  };

  const fillTmdb = (item: any) => {
    setForm((p: any) => ({ ...p, ...item }));
    setTmdbRes([]);
    setTmdbQ('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.addContent(form);
      setShowForm(false);
      setForm({ type: 'anime', status: 'ongoing', is_featured: false, is_trending: false });
      await load();
    } catch (err: any) {
      alert(err?.error || 'Failed to add content');
    } finally { setSaving(false); }
  };

  const del = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This removes all episodes too.`)) return;
    try { await adminApi.deleteContent(id); await load(); }
    catch (err: any) { alert(err?.error || 'Delete failed'); }
  };

  const toggle = async (id: string, field: 'is_featured' | 'is_trending', current: boolean) => {
    try {
      await adminApi.updateContent(id, { [field]: !current });
      setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: !current } : i));
    } catch {}
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <p className="section-label">Content ({items.length})</p>
        <button onClick={() => setShowForm(s => !s)} className="btn py-2 px-4 text-xs">
          <Plus size={14} /> {showForm ? 'Cancel' : 'Add'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={submit} className="card p-4 mb-4 space-y-3 animate-fade-in">
          <p className="text-sm font-black grad-text" style={{ fontFamily: 'Syne, sans-serif' }}>New Content</p>

          {/* TMDB Search */}
          <div>
            <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text2)', fontFamily: 'Syne, sans-serif' }}>
              Auto-fill from TMDB
            </p>
            <div className="flex gap-2">
              <input
                value={tmdbQ}
                onChange={e => setTmdbQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchTmdb())}
                placeholder="Search TMDB…"
                className="input text-sm flex-1"
                style={{ height: '36px' }}
              />
              <button type="button" onClick={searchTmdb} className="btn-ghost px-3 text-xs py-1">
                {tmdbBusy ? <Loader2 size={12} className="animate-spin" /> : 'Search'}
              </button>
            </div>
            {tmdbRes.length > 0 && (
              <div className="mt-2 space-y-1 max-h-44 overflow-y-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
                {tmdbRes.map((r: any) => (
                  <button key={r.tmdb_id} type="button" onClick={() => fillTmdb(r)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-white/5 transition-colors">
                    {r.poster && <img src={r.poster} className="w-8 h-11 rounded-lg object-cover flex-shrink-0" alt="" />}
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate" style={{ fontFamily: 'Syne, sans-serif' }}>{r.title}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text3)' }}>{r.release_year} · {r.type}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label-xs">Type *</label>
              <select value={form.type} onChange={e => f('type', e.target.value)} className="input text-sm" style={{ height: '38px' }}>
                <option value="anime"  style={{ background: '#0c0c16' }}>Anime</option>
                <option value="movie"  style={{ background: '#0c0c16' }}>Movie</option>
              </select>
            </div>
            <div>
              <label className="label-xs">Status</label>
              <select value={form.status||'ongoing'} onChange={e => f('status', e.target.value)} className="input text-sm" style={{ height: '38px' }}>
                <option value="ongoing"   style={{ background: '#0c0c16' }}>Ongoing</option>
                <option value="completed" style={{ background: '#0c0c16' }}>Completed</option>
                <option value="upcoming"  style={{ background: '#0c0c16' }}>Upcoming</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label-xs">Title *</label>
            <input value={form.title||''} onChange={e => f('title', e.target.value)} placeholder="Title" required className="input text-sm" />
          </div>
          <div>
            <label className="label-xs">Japanese Title</label>
            <input value={form.title_jp||''} onChange={e => f('title_jp', e.target.value)} placeholder="日本語タイトル" className="input text-sm" />
          </div>
          <div>
            <label className="label-xs">Description</label>
            <textarea value={form.description||''} onChange={e => f('description', e.target.value)}
              placeholder="Synopsis…" rows={3} className="input text-sm resize-none" />
          </div>
          <div>
            <label className="label-xs">Poster URL</label>
            <input value={form.poster||''} onChange={e => f('poster', e.target.value)} placeholder="https://…" className="input text-sm" />
          </div>
          <div>
            <label className="label-xs">Banner URL</label>
            <input value={form.banner||''} onChange={e => f('banner', e.target.value)} placeholder="https://… (wide image for hero)" className="input text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label-xs">Year</label>
              <input value={form.release_year||''} onChange={e => f('release_year', parseInt(e.target.value)||null)} type="number" placeholder="2024" className="input text-sm" />
            </div>
            <div>
              <label className="label-xs">Rating (0-10)</label>
              <input value={form.rating||''} onChange={e => f('rating', parseFloat(e.target.value)||null)} type="number" step="0.1" min="0" max="10" placeholder="8.5" className="input text-sm" />
            </div>
          </div>
          <div>
            <label className="label-xs">Sub / Dub</label>
            <select value={form.sub_or_dub||'sub'} onChange={e => f('sub_or_dub', e.target.value)} className="input text-sm" style={{ height: '38px' }}>
              <option value="sub"  style={{ background: '#0c0c16' }}>Sub</option>
              <option value="dub"  style={{ background: '#0c0c16' }}>Dub</option>
              <option value="both" style={{ background: '#0c0c16' }}>Both</option>
            </select>
          </div>
          <div className="flex gap-4">
            {([['is_featured','Featured (Hero)'],['is_trending','Trending']] as const).map(([k,l]) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--text2)' }}>
                <input type="checkbox" checked={!!form[k]} onChange={e => f(k, e.target.checked)}
                  className="rounded" style={{ accentColor: '#7c5cfc' }} />
                {l}
              </label>
            ))}
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn flex-1 justify-center text-sm py-2.5">
              {saving ? <Loader2 size={14} className="animate-spin" /> : 'Save Content'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost px-4">Cancel</button>
          </div>
        </form>
      )}

      {/* List */}
      {busy ? <Spinner /> : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="card flex items-center gap-3 p-3">
              <div className="w-10 h-14 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'var(--glass2)' }}>
                {item.poster && <img src={item.poster} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ fontFamily: 'Syne, sans-serif' }}>{item.title}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>
                  {item.type} · {item.release_year || '—'} · {item.status}
                </p>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {/* Featured toggle */}
                  <button
                    onClick={() => toggle(item.id, 'is_featured', item.is_featured)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all"
                    style={{
                      background: item.is_featured ? 'rgba(240,64,160,0.15)' : 'rgba(255,255,255,0.05)',
                      color: item.is_featured ? '#f472b6' : 'var(--text3)',
                      border: item.is_featured ? '1px solid rgba(240,64,160,0.25)' : '1px solid transparent',
                    }}
                  >
                    <Star size={9} fill={item.is_featured ? 'currentColor' : 'none'} /> Featured
                  </button>
                  {/* Trending toggle */}
                  <button
                    onClick={() => toggle(item.id, 'is_trending', item.is_trending)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all"
                    style={{
                      background: item.is_trending ? 'rgba(124,92,252,0.15)' : 'rgba(255,255,255,0.05)',
                      color: item.is_trending ? '#9d7ffd' : 'var(--text3)',
                      border: item.is_trending ? '1px solid rgba(124,92,252,0.25)' : '1px solid transparent',
                    }}
                  >
                    <TrendingUp size={9} /> Trending
                  </button>
                </div>
              </div>
              <button onClick={() => del(item.id, item.title)}
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(248,113,113,0.1)' }}>
                <Trash2 size={13} style={{ color: '#f87171' }} />
              </button>
            </div>
          ))}
          {items.length === 0 && <Empty text="No content yet. Add some!" />}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   EPISODES TAB
───────────────────────────────────────────────────── */
function EpisodesTab() {
  const [allContent, setAllContent] = useState<any[]>([]);
  const [selContent, setSelContent] = useState('');
  const [episodes, setEpisodes]     = useState<any[]>([]);
  const [showForm, setShowForm]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [epBusy, setEpBusy]         = useState(false);
  const [form, setForm]             = useState<any>({
    episode_number: 1, season_number: 1, is_published: true,
  });

  useEffect(() => {
    adminApi.content({ limit: 200 }).then(r => setAllContent(r.items || [])).catch(() => {});
  }, []);

  const loadEps = async (contentId: string) => {
    if (!contentId) { setEpisodes([]); return; }
    setEpBusy(true);
    try {
      // Fetch detail to get episodes
      const res = await fetch(`/api/content/${contentId}`);
      const data = await res.json();
      // Include unpublished for admin — fetch all via admin route
      const r = await fetch(`/api/admin/episodes?content_id=${contentId}`);
      if (r.ok) {
        const d = await r.json();
        setEpisodes(d.episodes || data.episodes || []);
      } else {
        setEpisodes(data.episodes || []);
      }
    } catch {} finally { setEpBusy(false); }
  };

  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selContent) return alert('Select content first');
    setSaving(true);
    try {
      await adminApi.addEpisode({ ...form, content_id: selContent });
      setShowForm(false);
      setForm({ episode_number: (form.episode_number || 0) + 1, season_number: form.season_number, is_published: true });
      await loadEps(selContent);
    } catch (err: any) {
      alert(err?.error || 'Failed to add episode');
    } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm('Delete this episode?')) return;
    try { await adminApi.deleteEpisode(id); await loadEps(selContent); }
    catch (err: any) { alert(err?.error || 'Delete failed'); }
  };

  const togglePublish = async (ep: any) => {
    try {
      await adminApi.updateEpisode(ep.id, { is_published: !ep.is_published });
      setEpisodes(prev => prev.map(e => e.id === ep.id ? { ...e, is_published: !e.is_published } : e));
    } catch {}
  };

  return (
    <div className="animate-fade-in">
      {/* Content selector */}
      <div className="mb-4">
        <label className="label-xs mb-1.5 block">Select Content</label>
        <select
          value={selContent}
          onChange={e => { setSelContent(e.target.value); loadEps(e.target.value); }}
          className="input text-sm"
          style={{ height: '40px' }}
        >
          <option value="" style={{ background: '#0c0c16' }}>— Choose title —</option>
          {allContent.map(c => (
            <option key={c.id} value={c.id} style={{ background: '#0c0c16' }}>
              [{c.type.toUpperCase()}] {c.title}
            </option>
          ))}
        </select>
      </div>

      {selContent && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">Episodes ({episodes.length})</p>
            <button onClick={() => setShowForm(s => !s)} className="btn py-2 px-3 text-xs">
              <Plus size={13} /> Add
            </button>
          </div>

          {/* Episode form */}
          {showForm && (
            <form onSubmit={submit} className="card p-4 mb-4 space-y-3 animate-fade-in">
              <p className="text-sm font-black grad-text" style={{ fontFamily: 'Syne, sans-serif' }}>New Episode</p>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label-xs">Episode # *</label>
                  <input value={form.episode_number} onChange={e => f('episode_number', parseInt(e.target.value)||1)}
                    type="number" min={1} required className="input text-sm" />
                </div>
                <div>
                  <label className="label-xs">Season</label>
                  <input value={form.season_number} onChange={e => f('season_number', parseInt(e.target.value)||1)}
                    type="number" min={1} className="input text-sm" />
                </div>
              </div>

              <div>
                <label className="label-xs">Title (optional)</label>
                <input value={form.title||''} onChange={e => f('title', e.target.value)} placeholder="Episode title" className="input text-sm" />
              </div>

              <div>
                <label className="label-xs">Thumbnail URL</label>
                <input value={form.thumbnail||''} onChange={e => f('thumbnail', e.target.value)} placeholder="https://…" className="input text-sm" />
              </div>

              <div>
                <label className="label-xs">Duration (seconds)</label>
                <input value={form.duration_sec||''} onChange={e => f('duration_sec', parseInt(e.target.value)||null)}
                  type="number" placeholder="1440 = 24 min" className="input text-sm" />
              </div>

              {/* HLS URLs */}
              <div className="space-y-2">
                <p className="text-xs font-bold" style={{ color: 'var(--text2)', fontFamily: 'Syne, sans-serif' }}>
                  HLS Stream URLs
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text3)' }}>
                  After running convert.sh, upload to your server and paste the URLs here.
                </p>
                {[
                  ['hls_master_url', 'Master M3U8 URL (master.m3u8)'],
                  ['hls_1080p_url',  '1080p playlist URL'],
                  ['hls_720p_url',   '720p playlist URL'],
                  ['hls_480p_url',   '480p playlist URL'],
                ].map(([k, ph]) => (
                  <div key={k}>
                    <label className="label-xs">{ph.split(' (')[0]}</label>
                    <input
                      value={form[k] || ''}
                      onChange={e => f(k, e.target.value)}
                      placeholder={ph}
                      className="input text-sm"
                    />
                  </div>
                ))}
              </div>

              {/* Telegram refs */}
              <div className="space-y-2">
                <p className="text-xs font-bold" style={{ color: 'var(--text2)', fontFamily: 'Syne, sans-serif' }}>
                  Telegram Reference (optional)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label-xs">Message ID</label>
                    <input value={form.tg_message_id||''} onChange={e => f('tg_message_id', e.target.value)}
                      placeholder="123456789" className="input text-sm" />
                  </div>
                  <div>
                    <label className="label-xs">File ID</label>
                    <input value={form.tg_file_id||''} onChange={e => f('tg_file_id', e.target.value)}
                      placeholder="BAADAgAD…" className="input text-sm" />
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--text2)' }}>
                <input type="checkbox" checked={form.is_published !== false}
                  onChange={e => f('is_published', e.target.checked)}
                  style={{ accentColor: '#7c5cfc' }} />
                Published (visible to users)
              </label>

              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="btn flex-1 justify-center text-sm py-2.5">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : 'Save Episode'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost px-4">Cancel</button>
              </div>
            </form>
          )}

          {/* Episodes list */}
          {epBusy ? <Spinner /> : (
            <div className="space-y-2">
              {episodes.map((ep: any) => (
                <div key={ep.id} className="card flex items-center gap-3 p-3">
                  {ep.thumbnail ? (
                    <div className="w-16 h-10 rounded-xl overflow-hidden flex-shrink-0">
                      <img src={ep.thumbnail} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div
                      className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-black"
                      style={{ background: 'rgba(124,92,252,0.12)', color: '#9d7ffd', fontFamily: 'Syne, sans-serif' }}
                    >
                      {ep.episode_number}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ fontFamily: 'Syne, sans-serif' }}>
                      {ep.title || `Episode ${ep.episode_number}`}
                    </p>
                    <div className="flex gap-2 mt-0.5 items-center">
                      {ep.duration_sec && (
                        <span className="text-[10px]" style={{ color: 'var(--text3)' }}>
                          {Math.floor(ep.duration_sec / 60)}m
                        </span>
                      )}
                      {ep.hls_720p_url && (
                        <span className="badge badge-cyan" style={{ fontSize: '0.58rem' }}>HLS ✓</span>
                      )}
                    </div>
                  </div>

                  {/* Publish toggle */}
                  <button
                    onClick={() => togglePublish(ep)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      background: ep.is_published ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.06)',
                      border: ep.is_published ? '1px solid rgba(74,222,128,0.2)' : '1px solid var(--border)',
                    }}
                    title={ep.is_published ? 'Unpublish' : 'Publish'}
                  >
                    {ep.is_published
                      ? <Eye size={13} style={{ color: '#4ade80' }} />
                      : <EyeOff size={13} style={{ color: 'var(--text3)' }} />
                    }
                  </button>

                  <button onClick={() => del(ep.id)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(248,113,113,0.1)' }}>
                    <Trash2 size={13} style={{ color: '#f87171' }} />
                  </button>
                </div>
              ))}
              {episodes.length === 0 && <Empty text="No episodes yet." />}
            </div>
          )}
        </>
      )}

      {!selContent && (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <Tv2 size={32} style={{ color: 'var(--text3)' }} />
          <p className="text-sm" style={{ color: 'var(--text3)' }}>Select a title above to manage episodes</p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   STREAMS TAB
───────────────────────────────────────────────────── */
function StreamsTab() {
  const [streams, setStreams] = useState<any[]>([]);
  const [busy, setBusy]       = useState(true);
  const [killing, setKilling] = useState<string | null>(null);

  const load = async () => {
    setBusy(true);
    try { const r = await adminApi.streams(); setStreams(r.streams || []); }
    catch {} finally { setBusy(false); }
  };

  useEffect(() => { load(); }, []);

  const kill = async (userId: string) => {
    setKilling(userId);
    try { await adminApi.killStream(userId); await load(); }
    catch {} finally { setKilling(null); }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <p className="section-label">
          Active Streams
          {streams.length > 0 && (
            <span className="ml-2 inline-flex w-5 h-5 rounded-full items-center justify-center text-[10px] font-black"
              style={{ background: 'rgba(74,222,128,0.2)', color: '#4ade80' }}>
              {streams.length}
            </span>
          )}
        </p>
        <button onClick={load} disabled={busy} className="btn-ghost py-2 px-3 text-xs">
          <RefreshCw size={13} className={busy ? 'animate-spin' : ''} />
        </button>
      </div>

      {busy ? <Spinner /> : streams.length === 0 ? (
        <Empty text="No active streams right now" />
      ) : (
        <div className="space-y-2">
          {streams.map((s: any) => (
            <div key={s.userId} className="card p-4 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
                style={{ background: 'rgba(74,222,128,0.1)' }}
              >
                <Zap size={16} style={{ color: '#4ade80' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>
                  User: <span style={{ color: 'var(--text2)' }}>{s.userId.slice(0, 12)}…</span>
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>
                  {s.episodes?.length || 0} concurrent stream{s.episodes?.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => kill(s.userId)}
                disabled={killing === s.userId}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                style={{
                  fontFamily: 'Syne, sans-serif',
                  background: 'rgba(248,113,113,0.1)',
                  border: '1px solid rgba(248,113,113,0.2)',
                  color: '#f87171',
                }}
              >
                {killing === s.userId ? <Loader2 size={11} className="animate-spin" /> : 'Kill'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   SHARED HELPERS
───────────────────────────────────────────────────── */
function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 size={26} className="animate-spin" style={{ color: '#9d7ffd' }} />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="text-center py-10 text-sm" style={{ color: 'var(--text3)' }}>{text}</p>
  );
}
