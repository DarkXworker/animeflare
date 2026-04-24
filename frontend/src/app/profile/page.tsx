'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/context/AuthContext';
import { userApi } from '@/lib/api';
import { LogOut, BookMarked, History, Shield, ChevronRight, Trash2, Crown, Tv2 } from 'lucide-react';
import Link from 'next/link';

const PLAN_STYLE: Record<string, { color: string; bg: string }> = {
  free:    { color: '#9ca3af', bg: 'rgba(156,163,175,0.12)' },
  mini:    { color: '#60a5fa', bg: 'rgba(59,130,246,0.12)'  },
  pro:     { color: '#9d7ffd', bg: 'rgba(124,92,252,0.14)'  },
  premium: { color: '#f472b6', bg: 'rgba(240,64,160,0.12)'  },
};

export default function ProfilePage() {
  const { user, profile, logout, loading } = useAuth();
  const router = useRouter();
  const [tab,setTab]           = useState<'watchlist'|'history'>('watchlist');
  const [watchlist,setWl]      = useState<any[]>([]);
  const [history,setHist]      = useState<any[]>([]);
  const [dataLoading,setDL]    = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    setDL(true);
    Promise.all([
      userApi.watchlist().then(r => setWl(r.items || [])),
      userApi.history().then(r => setHist(r.items || [])),
    ]).finally(() => setDL(false));
  }, [user]);

  if (loading || !user || !profile) return null;

  const plan = profile.plan || 'free';
  const ps   = PLAN_STYLE[plan] || PLAN_STYLE.free;

  return (
    <div className="page">
      <Header />
      <main>
        {/* Profile card */}
        <div className="mx-4 mt-4 p-5 rounded-3xl relative overflow-hidden" style={{
          background: 'linear-gradient(135deg, rgba(124,92,252,0.12), rgba(240,64,160,0.07))',
          border: '1px solid rgba(124,92,252,0.18)',
        }}>
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black flex-shrink-0 text-white"
              style={{ background: 'linear-gradient(135deg, #7c5cfc, #f040a0)', fontFamily: 'Syne, sans-serif' }}
            >
              {profile.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-base truncate" style={{ fontFamily: 'Syne, sans-serif' }}>{profile.username}</p>
              <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text3)' }}>{user.email}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <span className="badge flex items-center gap-1" style={{ background: ps.bg, color: ps.color, border: `1px solid ${ps.color}40` }}>
                  <Crown size={9} /> {plan.charAt(0).toUpperCase()+plan.slice(1)}
                </span>
                {profile.role === 'admin' && (
                  <span className="badge badge-pink flex items-center gap-1"><Shield size={9} /> Admin</span>
                )}
              </div>
            </div>
          </div>
          {profile.plan_expiry && (
            <p className="text-xs mt-3" style={{ color: 'var(--text3)' }}>
              Plan expires: {new Date(profile.plan_expiry).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Quick actions */}
        <div className="px-4 mt-3 space-y-2">
          {profile.role === 'admin' && (
            <Link href="/admin" className="card flex items-center gap-3 px-4 py-3">
              <Shield size={16} style={{ color: '#9d7ffd' }} />
              <span className="text-sm font-bold grad-text" style={{ fontFamily: 'Syne, sans-serif' }}>Admin Panel</span>
              <ChevronRight size={16} className="ml-auto" style={{ color: 'var(--text3)' }} />
            </Link>
          )}
          <button onClick={logout} className="card w-full flex items-center gap-3 px-4 py-3 text-left">
            <LogOut size={16} style={{ color: '#f87171' }} />
            <span className="text-sm font-semibold" style={{ color: '#f87171', fontFamily: 'Syne, sans-serif' }}>Sign Out</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 mt-5">
          <div className="flex p-1 rounded-2xl mb-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {([
              { k:'watchlist', label:'Watchlist', icon: BookMarked },
              { k:'history',   label:'History',   icon: History    },
            ] as const).map(({ k, label, icon: Icon }) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                style={{
                  fontFamily: 'Syne, sans-serif',
                  background: tab===k ? 'rgba(124,92,252,0.18)' : 'transparent',
                  color: tab===k ? '#9d7ffd' : 'var(--text3)',
                  border: tab===k ? '1px solid rgba(124,92,252,0.28)' : '1px solid transparent',
                }}
              >
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>

          {/* Watchlist */}
          {tab==='watchlist' && (
            <div className="space-y-2">
              {watchlist.length===0 && <p className="text-center py-8 text-sm" style={{ color:'var(--text3)' }}>Watchlist is empty</p>}
              {watchlist.map((item:any) => {
                const c = item.content || item;
                return (
                  <Link key={item.content_id||c.id} href={`/detail/${item.content_id||c.id}`} className="card flex items-center gap-3 p-3">
                    <div className="w-10 h-14 rounded-xl overflow-hidden flex-shrink-0" style={{ background:'var(--glass2)' }}>
                      {c.poster && <img src={c.poster} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ fontFamily:'Syne,sans-serif' }}>{c.title}</p>
                      <p className="text-xs mt-0.5" style={{ color:'var(--text3)' }}>{c.type} · {c.release_year}</p>
                    </div>
                    <ChevronRight size={15} style={{ color:'var(--text3)', flexShrink:0 }} />
                  </Link>
                );
              })}
            </div>
          )}

          {/* History */}
          {tab==='history' && (
            <div className="space-y-2">
              {history.length===0 && <p className="text-center py-8 text-sm" style={{ color:'var(--text3)' }}>No history yet</p>}
              {history.map((item:any) => {
                const ep = item.episodes || {};
                const c  = ep.content    || {};
                return (
                  <Link key={item.episode_id} href={`/player/${item.episode_id}?contentId=${c.id}`} className="card flex items-center gap-3 p-3">
                    <div className="w-16 h-10 rounded-xl overflow-hidden flex-shrink-0" style={{ background:'var(--glass2)' }}>
                      {ep.thumbnail && <img src={ep.thumbnail} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ fontFamily:'Syne,sans-serif' }}>{c.title}</p>
                      <p className="text-xs truncate mt-0.5" style={{ color:'var(--text3)' }}>
                        Ep {ep.episode_number}{ep.title?` · ${ep.title}`:''}
                      </p>
                    </div>
                    {item.completed && <span className="badge badge-green text-[9px]">Done</span>}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
