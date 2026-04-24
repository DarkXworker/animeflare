'use client';
import Link from 'next/link';
import { Play, Star } from 'lucide-react';

interface CardProps {
  id: string;
  title: string;
  poster?: string;
  rating?: number;
  release_year?: number;
  total_episodes?: number;
  status?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { w: 'w-28',  h: 'h-40'  },
  md: { w: 'w-[138px]', h: 'h-[196px]' },
  lg: { w: 'w-full', h: 'h-52' },
};

export default function Card({ id, title, poster, rating, release_year, total_episodes, status, size = 'md' }: CardProps) {
  const { w, h } = sizes[size];

  return (
    <Link href={`/detail/${id}`} className={`${size !== 'lg' ? w : ''} flex-shrink-0 group`}>
      <div
        className={`${h} relative rounded-2xl overflow-hidden mb-2 transition-all duration-400`}
        style={{
          background: 'var(--glass2)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Image */}
        {poster ? (
          <img
            src={poster}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.07]"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-4xl"
            style={{ background: 'linear-gradient(135deg, rgba(124,92,252,0.15), rgba(240,64,160,0.1))' }}
          >
            🎌
          </div>
        )}

        {/* Hover overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
          style={{ background: 'rgba(0,0,0,0.45)' }}
        >
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center shadow-xl"
            style={{ background: 'linear-gradient(135deg, #7c5cfc, #f040a0)' }}
          >
            <Play size={17} fill="white" color="white" />
          </div>
        </div>

        {/* Rating */}
        {rating && (
          <div
            className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-lg"
            style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)', fontSize: '0.65rem', fontWeight: 700, color: '#fbbf24' }}
          >
            <Star size={8} fill="currentColor" />{rating}
          </div>
        )}

        {/* Airing badge */}
        {status === 'ongoing' && (
          <div
            className="absolute top-2 left-2 px-1.5 py-0.5 rounded-lg"
            style={{
              background: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.35)',
              backdropFilter: 'blur(8px)', fontSize: '0.58rem', fontWeight: 800,
              color: '#4ade80', letterSpacing: '0.06em', textTransform: 'uppercase',
            }}
          >
            Live
          </div>
        )}
      </div>

      {/* Title */}
      <p
        className="text-xs font-semibold leading-tight px-0.5"
        style={{
          fontFamily: 'DM Sans, sans-serif', color: 'var(--text2)',
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}
      >
        {title}
      </p>
      <p className="text-[10px] mt-0.5 px-0.5" style={{ color: 'var(--text3)' }}>
        {release_year}{total_episodes ? ` · ${total_episodes} eps` : ''}
      </p>
    </Link>
  );
}
