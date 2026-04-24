'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import Hero from '@/components/Hero';
import Row from '@/components/Row';
import { contentApi } from '@/lib/api';

export default function HomePage() {
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contentApi.home().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <Header />
      <main>
        {loading ? (
          <>
            <div className="skel w-full" style={{ height: 'min(78vw, 430px)' }} />
            <div className="mt-6 space-y-7 px-4">
              {[...Array(3)].map((_, i) => (
                <div key={i}>
                  <div className="skel h-5 w-36 mb-4 rounded-lg" />
                  <div className="flex gap-3">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="flex-shrink-0 w-[138px]">
                        <div className="skel w-full h-[196px] rounded-2xl mb-2" />
                        <div className="skel h-3 w-4/5 mb-1" />
                        <div className="skel h-2 w-1/2" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : data ? (
          <>
            <Hero items={data.featured || []} />
            <div className="mt-6">
              <Row title="🔥 Trending Now"     items={data.trending || []}     viewAllHref="/anime" />
              <Row title="🎌 Latest Anime"     items={data.recentAnime || []}  viewAllHref="/anime" />
              <Row title="🎬 Latest Movies"    items={data.recentMovies || []} viewAllHref="/movies" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <p style={{ color: 'var(--text3)' }}>Could not load content</p>
            <button className="btn text-sm" onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
