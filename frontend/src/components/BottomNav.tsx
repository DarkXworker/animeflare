'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Tv2, Film, User } from 'lucide-react';

const NAV = [
  { href: '/',        icon: Home, label: 'Home'   },
  { href: '/anime',   icon: Tv2,  label: 'Anime'  },
  { href: '/movies',  icon: Film, label: 'Movies' },
  { href: '/profile', icon: User, label: 'Profile'},
];

export default function BottomNav() {
  const path = usePathname();
  if (path.startsWith('/player') || path.startsWith('/admin')) return null;

  return (
    <nav
      className="bottom-nav fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(8,8,15,0.88)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        height: 'calc(68px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto px-2" style={{ height: '68px' }}>
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = href === '/' ? path === '/' : path.startsWith(href);
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-1 min-w-[58px] py-2 group">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center relative transition-all duration-300"
                style={{
                  background: active ? 'rgba(124,92,252,0.18)' : 'transparent',
                  boxShadow: active ? '0 0 18px rgba(124,92,252,0.25)' : 'none',
                }}
              >
                {active && (
                  <span className="absolute inset-0 rounded-2xl" style={{ border: '1px solid rgba(124,92,252,0.35)' }} />
                )}
                <Icon
                  size={21}
                  strokeWidth={active ? 2.5 : 1.7}
                  style={{ color: active ? '#9d7ffd' : '#4a4a68', transition: 'color 0.3s' }}
                />
              </div>
              <span
                className="text-[10px] font-medium tracking-wide transition-colors duration-300"
                style={{ fontFamily: 'Syne, sans-serif', color: active ? '#9d7ffd' : '#4a4a68' }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
