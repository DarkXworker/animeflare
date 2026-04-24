'use client';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import Card from './Card';

export default function Row({
  title, items, viewAllHref, cardSize = 'md',
}: {
  title: string; items: any[]; viewAllHref?: string; cardSize?: 'sm' | 'md' | 'lg';
}) {
  if (!items?.length) return null;
  return (
    <section className="mb-7">
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="section-label">{title}</h2>
        {viewAllHref && (
          <Link href={viewAllHref} className="flex items-center gap-0.5 text-xs font-semibold" style={{ color: 'var(--purple2)', fontFamily: 'Syne, sans-serif' }}>
            See all <ChevronRight size={13} />
          </Link>
        )}
      </div>
      <div className="scroll-x px-4">
        {items.map(item => (
          <Card key={item.id} id={item.id} title={item.title} poster={item.poster}
            rating={item.rating} release_year={item.release_year}
            total_episodes={item.total_episodes} status={item.status} size={cardSize} />
        ))}
      </div>
    </section>
  );
}
