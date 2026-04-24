'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Player from '@/components/Player';
import { contentApi } from '@/lib/api';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function PlayerPage() {
  const { id: episodeId }  = useParams<{ id: string }>();
  const sp                 = useSearchParams();
  const contentId          = sp.get('contentId');
  const router             = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [content, setContent] = useState<any>(null);
  const [episode, setEpisode] = useState<any>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/auth?redirect=/player/${episodeId}${contentId ? `?contentId=${contentId}` : ''}`);
    }
  }, [user, authLoading]);

  // Load episode info
  useEffect(() => {
    if (!contentId || !user) return;
    contentApi.detail(contentId).then(d => {
      setContent(d);
      setEpisode(d.episodes?.find((e: any) => e.id === episodeId) || null);
    }).catch(() => {});
  }, [contentId, episodeId, user]);

  if (authLoading) return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#9d7ffd', borderTopColor: 'transparent' }} />
    </div>
  );
  if (!user) return null;

  const progress = content?.watchProgress?.find((p: any) => p.episode_id === episodeId);

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: '#000', zIndex: 100 }}>
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}
      >
        <button
          onClick={() => contentId ? router.push(`/detail/${contentId}`) : router.back()}
          className="w-9 h-9 rounded-xl glass flex items-center justify-center flex-shrink-0"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate" style={{ fontFamily: 'Syne, sans-serif' }}>
            {content?.title || '…'}
          </p>
          {episode && (
            <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {episode.title || `Episode ${episode.episode_number}`}
            </p>
          )}
        </div>
      </div>

      {/* Player */}
      <div className="flex-1 flex items-center bg-black">
        <div className="w-full max-w-5xl mx-auto">
          <Player
            episodeId={episodeId}
            title={content?.title}
            epLabel={episode?.title || (episode ? `Episode ${episode.episode_number}` : undefined)}
            startAt={progress?.progress_sec || 0}
            onBack={() => contentId ? router.push(`/detail/${contentId}`) : router.back()}
          />
        </div>
      </div>

      {/* Episode strip */}
      {content?.episodes?.length > 1 && (
        <div
          className="flex-shrink-0 overflow-hidden"
          style={{ background: 'rgba(0,0,0,0.85)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex gap-2 px-4 py-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {content.episodes.map((ep: any) => {
              const active = ep.id === episodeId;
              return (
                <Link
                  key={ep.id}
                  href={`/player/${ep.id}?contentId=${contentId}`}
                  className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{
                    minWidth: '52px', textAlign: 'center',
                    fontFamily: 'Syne, sans-serif',
                    background: active ? 'rgba(124,92,252,0.22)' : 'rgba(255,255,255,0.06)',
                    border: active ? '1px solid rgba(124,92,252,0.45)' : '1px solid transparent',
                    color: active ? '#9d7ffd' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {ep.episode_number}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
