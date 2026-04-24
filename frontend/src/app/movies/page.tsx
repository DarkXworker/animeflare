'use client';
import { useEffect, useState, useCallback } from 'react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import Card from '@/components/Card';
import { contentApi } from '@/lib/api';

const SORTS = [{ v:'recent',label:'Latest'},{ v:'rating',label:'Top Rated'},{ v:'az',label:'A–Z'}];

export default function MoviesPage() {
  const [items,setItems]     = useState<any[]>([]);
  const [loading,setLoading] = useState(true);
  const [page,setPage]       = useState(1);
  const [total,setTotal]     = useState(0);
  const [sort,setSort]       = useState('recent');

  const load = useCallback(async (reset=false) => {
    setLoading(true);
    const p = reset ? 1 : page;
    try {
      const res = await contentApi.list({ type:'movie', sort, page:p, limit:24 });
      setItems(prev => reset ? res.items : [...prev,...res.items]);
      setTotal(res.total);
      if (reset) setPage(2); else setPage(p+1);
    } catch {}
    finally { setLoading(false); }
  }, [sort, page]);

  useEffect(() => { load(true); }, [sort]);

  return (
    <div className="page">
      <Header />
      <main>
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <h1 className="text-xl font-black grad-text" style={{ fontFamily:'Syne,sans-serif' }}>Movies</h1>
          <div className="flex gap-2">
            {SORTS.map(s => (
              <button key={s.v} onClick={() => setSort(s.v)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: sort===s.v ? 'rgba(124,92,252,0.22)' : 'rgba(255,255,255,0.05)',
                  border: sort===s.v ? '1px solid rgba(124,92,252,0.45)' : '1px solid transparent',
                  color: sort===s.v ? '#9d7ffd' : 'var(--text2)',
                  fontFamily:'Syne,sans-serif',
                }}
              >{s.label}</button>
            ))}
          </div>
        </div>

        <p className="px-4 mb-3 text-xs" style={{ color:'var(--text3)' }}>{total} movies</p>

        <div className="grid px-4 gap-3" style={{ gridTemplateColumns:'repeat(auto-fill, minmax(138px, 1fr))' }}>
          {items.map(item => (
            <Card key={item.id} id={item.id} title={item.title} poster={item.poster}
              rating={item.rating} release_year={item.release_year} size="lg" />
          ))}
        </div>

        {loading && (
          <div className="grid px-4 gap-3 mt-3" style={{ gridTemplateColumns:'repeat(auto-fill, minmax(138px, 1fr))' }}>
            {[...Array(8)].map((_,i) => <div key={i}><div className="skel w-full h-52 rounded-2xl mb-2" /><div className="skel h-3 w-3/4" /></div>)}
          </div>
        )}

        {!loading && items.length < total && (
          <div className="px-4 mt-5">
            <button className="btn-ghost w-full justify-center" onClick={() => load(false)}>Load More</button>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
