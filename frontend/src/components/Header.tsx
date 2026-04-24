'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, X, Shield } from 'lucide-react';
import { contentApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function Header() {
  const { profile } = useAuth();
  const path = usePathname();
  const [open, setOpen]       = useState(false);
  const [q, setQ]             = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [busy, setBusy]       = useState(false);
  const inputRef              = useRef<HTMLInputElement>(null);
  const timerRef              = useRef<NodeJS.Timeout>();

  if (path.startsWith('/player')) return null;

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setBusy(true);
      try {
        const data = await contentApi.list({ type: 'anime', q, limit: 8 });
        const movies = await contentApi.list({ type: 'movie', q, limit: 4 });
        setResults([...(data.items || []), ...(movies.items || [])]);
      } catch { setResults([]); }
      finally { setBusy(false); }
    }, 350);
    return () => clearTimeout(timerRef.current);
  }, [q]);

  const close = () => { setOpen(false); setQ(''); setResults([]); };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40"
      style={{
        background: 'rgba(8,8,15,0.82)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.055)',
        height: 'var(--header-h)',
      }}
    >
      <div className="flex items-center justify-between px-4 h-full max-w-2xl mx-auto">
        {/* Logo */}
        {!open && (
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm text-white"
              style={{ background: 'linear-gradient(135deg, #7c5cfc, #f040a0)', fontFamily: 'Syne, sans-serif' }}
            >
              Ax
            </div>
            <span className="font-black text-[15px] tracking-tight grad-text" style={{ fontFamily: 'Syne, sans-serif' }}>
              AnimeX
            </span>
          </Link>
        )}

        {/* Search input */}
        {open && (
          <div className="flex-1 relative mr-2">
            <input
              ref={inputRef}
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search anime, movies..."
              className="input pr-9 text-sm"
              style={{ height: '38px', padding: '0 36px 0 14px' }}
            />
            {q && (
              <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }}>
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => open ? close() : setOpen(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{ background: open ? 'rgba(124,92,252,0.18)' : 'rgba(255,255,255,0.06)' }}
          >
            {open
              ? <X size={17} style={{ color: '#9d7ffd' }} />
              : <Search size={17} style={{ color: 'var(--text2)' }} />
            }
          </button>
          {profile?.role === 'admin' && !open && (
            <Link href="/admin" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,92,252,0.12)' }}>
              <Shield size={16} style={{ color: '#9d7ffd' }} />
            </Link>
          )}
        </div>
      </div>

      {/* Search dropdown */}
      {open && q && (
        <div
          className="absolute left-0 right-0 max-h-[65vh] overflow-y-auto"
          style={{ background: 'rgba(8,8,15,0.98)', borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)' }}
        >
          {busy && (
            <p className="px-4 py-5 text-sm text-center" style={{ color: 'var(--text3)' }}>Searching…</p>
          )}
          {!busy && results.length === 0 && (
            <p className="px-4 py-5 text-sm text-center" style={{ color: 'var(--text3)' }}>No results for "{q}"</p>
          )}
          {results.map(item => (
            <Link key={item.id} href={`/detail/${item.id}`} onClick={close}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5">
              <div className="w-10 h-[56px] rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'var(--glass2)' }}>
                {item.poster && <img src={item.poster} alt={item.title} className="w-full h-full object-cover" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ fontFamily: 'Syne, sans-serif' }}>{item.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                  {item.type === 'anime' ? '🎌' : '🎬'} {item.type} · {item.release_year || '—'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
