'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function AuthPage() {
  const [mode, setMode]     = useState<'login'|'register'>('login');
  const [username,setUser]  = useState('');
  const [email,setEmail]    = useState('');
  const [pw,setPw]          = useState('');
  const [showPw,setShowPw]  = useState(false);
  const [busy,setBusy]      = useState(false);
  const [err,setErr]        = useState('');
  const { login, register } = useAuth();
  const router              = useRouter();
  const sp                  = useSearchParams();
  const redirect            = sp.get('redirect') || '/';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      if (mode==='login') await login(email, pw);
      else                await register(username, email, pw);
      router.replace(redirect);
    } catch (error: any) {
      setErr(error?.message || 'Something went wrong');
    } finally { setBusy(false); }
  };

  return (
    <div
      className="min-h-dvh flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at 50% -20%, rgba(124,92,252,0.18) 0%, #08080f 65%)' }}
    >
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl text-white mx-auto mb-3 shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #7c5cfc, #f040a0)', fontFamily: 'Syne, sans-serif' }}
          >
            Ax
          </div>
          <h1 className="text-2xl font-black grad-text" style={{ fontFamily: 'Syne, sans-serif' }}>AnimeX</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text3)' }}>
            {mode==='login' ? 'Welcome back' : 'Create your account'}
          </p>
        </div>

        {/* Card */}
        <div className="glass2 p-6 rounded-3xl">
          {/* Mode tabs */}
          <div className="flex p-1 rounded-2xl mb-6" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {(['login','register'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setErr(''); }}
                className="flex-1 py-2 rounded-xl text-sm font-bold transition-all duration-300"
                style={{
                  fontFamily: 'Syne, sans-serif',
                  background: mode===m ? 'rgba(124,92,252,0.18)' : 'transparent',
                  color: mode===m ? '#9d7ffd' : 'var(--text3)',
                  border: mode===m ? '1px solid rgba(124,92,252,0.3)' : '1px solid transparent',
                }}
              >
                {m==='login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode==='register' && (
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color:'var(--text2)', fontFamily:'Syne,sans-serif' }}>Username</label>
                <input value={username} onChange={e=>setUser(e.target.value)} placeholder="cooluser123"
                  required minLength={3} className="input" />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color:'var(--text2)', fontFamily:'Syne,sans-serif' }}>Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="you@example.com" required className="input" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color:'var(--text2)', fontFamily:'Syne,sans-serif' }}>Password</label>
              <div className="relative">
                <input type={showPw?'text':'password'} value={pw} onChange={e=>setPw(e.target.value)}
                  placeholder="••••••••" required minLength={6} className="input pr-10" />
                <button type="button" onClick={()=>setShowPw(s=>!s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color:'var(--text3)' }}>
                  {showPw?<EyeOff size={16}/>:<Eye size={16}/>}
                </button>
              </div>
            </div>

            {err && (
              <div className="px-4 py-3 rounded-xl text-sm" style={{
                background:'rgba(239,68,68,0.08)', color:'#f87171',
                border:'1px solid rgba(239,68,68,0.18)'
              }}>
                {err}
              </div>
            )}

            <button type="submit" disabled={busy} className="btn w-full justify-center py-3 mt-1" style={{ opacity:busy?0.7:1 }}>
              {busy ? <><Loader2 size={15} className="animate-spin" /> Loading…</> : mode==='login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-4" style={{ color:'var(--text3)' }}>
          By signing up you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
