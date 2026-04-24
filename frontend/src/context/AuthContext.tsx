'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase/client';

interface Profile {
  id: string;
  username: string;
  avatar?: string;
  role: string;
  plan: string;
  plan_expiry?: string;
  is_banned: boolean;
}

interface AuthContextType {
  user: any;
  profile: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const sb = getSupabase();
    const { data } = await sb.from('profiles').select('*').eq('id', userId).single();
    setProfile(data);
  }, []);

  useEffect(() => {
    const sb = getSupabase();

    // Get initial session
    sb.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user ?? null);
      if (user) await fetchProfile(user.id);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = sb.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) await fetchProfile(u.id);
      else setProfile(null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const login = async (email: string, password: string) => {
    const sb = getSupabase();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  };

  const register = async (username: string, email: string, password: string) => {
    const sb = getSupabase();
    const { error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) throw new Error(error.message);
  };

  const logout = async () => {
    const sb = getSupabase();
    await sb.auth.signOut();
    setUser(null);
    setProfile(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
