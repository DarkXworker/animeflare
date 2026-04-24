'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import Card from '@/components/Card';
import { contentApi, userApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Play, Plus, Check, Star, Calendar, ChevronRight, Loader2 } from 'lucide-react';

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { user } = useAuth();
  const [data,setData]           = useState<any>(null);
  const [loading,setLoading]     = useState(true);
  const [inWl,setInWl]           = useState(false);
  const [wlBusy,setWlBusy]       = useState(false);
  const [showAllEps,setShowAllEps] = useState(false);

  useEffect(() => {
    contentApi.detail(id)
      .then(r => { setData(r); setInWl(r.inWatchlist || false); })
      .catch(() => router.push('/'))
      .finally(() => setLoading(false));
  }, [id]);

  const toggleWl = async () => {
    if (!user) return router.push('/auth');
    setWlBusy(true);
    try {
      if (inWl) { await userApi.removeWatchlist(id); setInWl(false); }
      else       { await userApi.addWatchlist(id);    setInWl(true);  }
    } catch {}
    finally { setWlBusy(false); }
  };

  const play = (epId: string) => {
    if (!user) return router.push(`/auth?redirect=/player/${epId}?contentId=${id}`);
    router.push(`/player/${epId}?contentId=${id}`);
  };

  if (loading) return (
    <div className="page">
      <Header />
      <main>
        <div className="skel w-full" style={{ height: '220px' }} />
        <div className="px-4 mt-4 space-y-3">
          <div className="skel h-7 w-2/3 rounded-xl" />
          <div className="skel h-4 w-1/3 rounded-lg" />
          <div className="skel h-20 w-full rounded-2xl" />
        </div>
      </main>
    </div>
  );
  if (!data) return null;

  const episodes = data.episodes || [];
  const visibleEps = showAllEps ? episodes : episodes.slice(0, 12);
  const firstEp = episodes[0];
  const lastWatched = data.watchProgress?.reduce((acc: any, p: any) =>
    (!acc || p.progress_sec > acc.progress_sec) ? p : acc, null);

  return (
    <div className="page">
      <Header />
      <main>
        {/* Banner */}
        <div className="relative w-full" style={{ height: '220px' }}>
          <img src={data.banner || data.poster} alt={data.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(8,8,15,0.25) 0%, #08080f 100%)' }} />
        </div>

        <div className="px-4 -mt-20 relative">
          {/* Poster + meta */}
          <div className="flex gap-4 mb-5">
            <div className="w-24 rounded-2xl overflow-hidden flex-shrink-0 shadow-2xl" style={{ height: '140px', border: '2px solid rgba(255,255,255,0.08)' }}>
              <img src={data.poster} alt={data.title} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 pt-10 min-w-0">
              <h1 className="font-black leading-tight mb-1" style={{ fontSize:'clamp(1.1rem,4vw,1.4rem)', fontFamily:'Syne,sans-serif' }}>
                {data.title}
              </h1>
              {data.title_jp && <p className="text-xs mb-2" style={{ color:'var(--text3)' }}>{data.title_jp}</p>}
              <div className="flex flex-wrap gap-1.5">
                {data.rating && <span className="badge badge-pink"><Star size={9} fill="currentColor" />{data.rating}</span>}
                {data.release_year && <span className="badge badge-cyan"><Calendar size={9} />{data.release_year}</span>}
                {data.status && <span className={`badge ${data.status==='ongoing'?'badge-green':'badge-purple'}`}>{data.status}</span>}
                {data.sub_or_dub && <span className="badge badge-gray">{data.sub_or_dub.toUpperCase()}</span>}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mb-4">
            {(firstEp || data.type==='movie') && (
              <button className="btn flex-1 justify-center" onClick={() => {
                const ep = lastWatched ? episodes.find((e:any)=>e.id===lastWatched.episode_id)||firstEp : firstEp;
                if (ep) play(ep.id);
              }}>
                <Play size={15} fill="white" />
                {lastWatched ? 'Continue' : 'Watch Now'}
              </button>
            )}
            <button
              className="btn-ghost px-4"
              onClick={toggleWl}
              disabled={wlBusy}
              style={{ color: inWl ? '#9d7ffd' : undefined }}
            >
              {wlBusy ? <Loader2 size={15} className="animate-spin" /> : inWl ? <Check size={15} /> : <Plus size={15} />}
            </button>
          </div>

          {/* Genres */}
          {data.genres?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {data.genres.map((g:string) => <span key={g} className="badge badge-purple">{g}</span>)}
            </div>
          )}

          {/* Description */}
          {data.description && (
            <p className="text-sm leading-relaxed mb-6" style={{ color:'var(--text2)', lineHeight:1.7 }}>
              {data.description}
            </p>
          )}

          {/* Episodes */}
          {data.type==='anime' && episodes.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="section-label">Episodes</h2>
                <span className="text-xs" style={{ color:'var(--text3)' }}>{episodes.length} eps</span>
              </div>
              <div className="space-y-2">
                {visibleEps.map((ep:any) => {
                  const prog = data.watchProgress?.find((p:any) => p.episode_id === ep.id);
                  const pct  = prog && ep.duration_sec ? Math.min(100,(prog.progress_sec/ep.duration_sec)*100) : 0;
                  return (
                    <button key={ep.id} onClick={() => play(ep.id)}
                      className="w-full card flex items-center gap-3 p-3 text-left">
                      {ep.thumbnail ? (
                        <div className="w-20 h-12 rounded-xl overflow-hidden flex-shrink-0 relative">
                          <img src={ep.thumbnail} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center" style={{ background:'rgba(0,0,0,0.35)' }}>
                            <Play size={13} fill="white" color="white" />
                          </div>
                          {pct > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background:'rgba(0,0,0,0.5)' }}>
                              <div className="h-full" style={{ width:`${pct}%`, background:'linear-gradient(135deg,#7c5cfc,#f040a0)' }} />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-20 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-black"
                          style={{ background:'rgba(124,92,252,0.12)', color:'#9d7ffd', fontFamily:'Syne,sans-serif' }}>
                          {ep.episode_number}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ fontFamily:'Syne,sans-serif' }}>
                          {ep.title || `Episode ${ep.episode_number}`}
                        </p>
                        {ep.duration_sec && (
                          <p className="text-xs mt-0.5" style={{ color:'var(--text3)' }}>
                            {Math.floor(ep.duration_sec/60)} min{prog?.completed?' · ✓':''}
                          </p>
                        )}
                      </div>
                      <ChevronRight size={15} style={{ color:'var(--text3)', flexShrink:0 }} />
                    </button>
                  );
                })}
              </div>
              {episodes.length > 12 && (
                <button className="btn-ghost w-full mt-3 justify-center text-sm" onClick={() => setShowAllEps(s=>!s)}>
                  {showAllEps ? 'Show Less' : `Show All ${episodes.length} Episodes`}
                </button>
              )}
            </div>
          )}

          {/* Similar */}
          {data.similar?.length > 0 && (
            <div className="mb-4">
              <h2 className="section-label mb-3">More Like This</h2>
              <div className="scroll-x">
                {data.similar.map((s:any) => (
                  <Card key={s.id} id={s.id} title={s.title} poster={s.poster} rating={s.rating} release_year={s.release_year} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
