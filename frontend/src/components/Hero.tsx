'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Play, Plus, Star } from 'lucide-react';

export default function Hero({ items }: { items: any[] }) {
  const [cur, setCur]   = useState(0);
  const [prev, setPrev] = useState(-1);
  const [anim, setAnim] = useState(false);

  const go = useCallback((idx: number) => {
    if (anim || idx === cur) return;
    setAnim(true);
    setPrev(cur);
    setCur(idx);
    setTimeout(() => { setAnim(false); setPrev(-1); }, 600);
  }, [anim, cur]);

  const next = useCallback(() => go((cur + 1) % items.length), [go, cur, items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(next, 5500);
    return () => clearInterval(t);
  }, [next, items.length]);

  if (!items.length) return null;
  const item = items[cur];

  return (
    <div className="relative overflow-hidden" style={{ height: 'min(78vw, 430px)' }}>
      {/* Slides */}
      {items.map((it, i) => (
        <div
          key={it.id}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === cur ? 1 : 0, zIndex: i === cur ? 2 : 1 }}
        >
          <img src={it.banner || it.poster || ''} alt={it.title} className="w-full h-full object-cover" />
        </div>
      ))}

      {/* Gradient overlays */}
      <div className="absolute inset-0 z-10" style={{ background: 'linear-gradient(to top, #08080f 0%, rgba(8,8,15,0.55) 55%, rgba(8,8,15,0.12) 100%)' }} />
      <div className="absolute inset-0 z-10" style={{ background: 'linear-gradient(90deg, rgba(8,8,15,0.65) 0%, transparent 55%)' }} />

      {/* Content */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-6 transition-all duration-500"
        style={{ opacity: anim ? 0 : 1, transform: anim ? 'translateY(6px)' : 'translateY(0)' }}
      >
        {/* Badges */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {item.type === 'anime' && <span className="badge badge-purple">Anime</span>}
          {item.sub_or_dub && <span className="badge badge-cyan">{item.sub_or_dub.toUpperCase()}</span>}
          {item.rating && (
            <span className="badge badge-pink">
              <Star size={8} fill="currentColor" /> {item.rating}
            </span>
          )}
          {item.release_year && <span className="badge badge-gray">{item.release_year}</span>}
        </div>

        {/* Title */}
        <h1
          className="font-black leading-tight mb-1 drop-shadow-lg"
          style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(1.3rem, 5vw, 1.9rem)', maxWidth: '82%' }}
        >
          {item.title}
        </h1>
        {item.title_jp && (
          <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.42)', fontFamily: 'DM Sans, sans-serif' }}>
            {item.title_jp}
          </p>
        )}
        {item.description && (
          <p
            className="text-xs leading-relaxed mb-4"
            style={{
              color: 'rgba(255,255,255,0.6)', maxWidth: '84%',
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}
          >
            {item.description}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Link href={`/detail/${item.id}`} className="btn text-sm py-2.5 px-5">
            <Play size={14} fill="white" /> Watch Now
          </Link>
          <Link href={`/detail/${item.id}`} className="btn-ghost text-sm py-2.5 px-4">
            <Plus size={14} /> Add
          </Link>
        </div>
      </div>

      {/* Dots */}
      {items.length > 1 && (
        <div className="absolute bottom-4 right-4 z-20 flex gap-1.5">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              className="rounded-full transition-all duration-400"
              style={{
                width: i === cur ? '18px' : '5px',
                height: '5px',
                background: i === cur ? 'linear-gradient(135deg,#7c5cfc,#f040a0)' : 'rgba(255,255,255,0.25)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
