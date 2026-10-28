'use client';
// PlayerProvider — loads the anonymous session + profile once, keeps them fresh.
// usePlayer() -> {
//   status: 'loading' | 'ready' | 'error',
//   profile: Profile | null, authState: AuthState | null, error: unknown,
//   refreshProfile(): Promise<Profile | null>   // call after finishing a puzzle, editing the profile, etc.
// }
// Re-loads automatically when the signed-in user changes (magic-link return, sign-out).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getAuthState, getProfile } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import type { AuthState, Profile } from '@/lib/types';
import { usePrefs } from './PrefsProvider';

export interface PlayerValue {
  status: 'loading' | 'ready' | 'error';
  profile: Profile | null;
  authState: AuthState | null;
  error: unknown;
  refreshProfile: () => Promise<Profile | null>;
}

const PlayerContext = createContext<PlayerValue | null>(null);

export function usePlayer(): PlayerValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return ctx;
}

const authKey = (a: { userId: string; isAnonymous: boolean; email: string | null } | null) =>
  a ? `${a.userId}|${a.isAnonymous}|${a.email ?? ''}` : 'none';

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { adoptServerDigitStyle } = usePrefs();
  const [state, setState] = useState<Omit<PlayerValue, 'refreshProfile'>>({
    status: 'loading',
    profile: null,
    authState: null,
    error: null,
  });
  const currentKey = useRef('none');
  const mounted = useRef(true);

  const refreshProfile = useCallback(async (): Promise<Profile | null> => {
    try {
      const authState = await getAuthState();
      const profile = await getProfile();
      currentKey.current = authKey(authState);
      adoptServerDigitStyle(profile.digit_style);
      if (mounted.current) setState({ status: 'ready', profile, authState, error: null });
      return profile;
    } catch (error) {
      if (mounted.current) setState((s) => ({ ...s, status: s.profile ? 'ready' : 'error', error }));
      return null;
    }
  }, [adoptServerDigitStyle]);

  useEffect(() => {
    mounted.current = true;
    void refreshProfile();
    return () => {
      mounted.current = false;
    };
  }, [refreshProfile]);

  // Refresh when the signed-in user changes (e.g. returning from a magic link, signing out elsewhere).
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
        const u = session?.user;
        const key = u ? authKey({ userId: u.id, isAnonymous: u.is_anonymous ?? false, email: u.email ?? null }) : 'none';
        if (key !== currentKey.current) setTimeout(() => void refreshProfile(), 0);
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch {
      /* Supabase env missing: the load above reports the error state */
    }
    return () => unsubscribe?.();
  }, [refreshProfile]);

  const value = useMemo<PlayerValue>(() => ({ ...state, refreshProfile }), [state, refreshProfile]);
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
