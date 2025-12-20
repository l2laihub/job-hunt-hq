/**
 * Supabase Auth Context
 * Provides authentication state and methods throughout the app
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './client';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | null;
}

interface AuthContextValue extends AuthState {
  signUp: (email: string, password: string, metadata?: { full_name?: string }) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  isConfigured: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  const isConfigured = isSupabaseConfigured();

  // Initialize auth state
  useEffect(() => {
    if (!isConfigured) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
        error: error ?? null,
      });
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((prev) => ({
        ...prev,
        user: session?.user ?? null,
        session,
        loading: false,
      }));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured]);

  const signUp = useCallback(
    async (email: string, password: string, metadata?: { full_name?: string }) => {
      if (!isConfigured) {
        return { error: { message: 'Supabase not configured' } as AuthError };
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      if (error) {
        setState((prev) => ({ ...prev, error }));
      }

      return { error };
    },
    [isConfigured]
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!isConfigured) {
        return { error: { message: 'Supabase not configured' } as AuthError };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setState((prev) => ({ ...prev, error }));
      }

      return { error };
    },
    [isConfigured]
  );

  const signInWithGoogle = useCallback(async () => {
    if (!isConfigured) {
      return { error: { message: 'Supabase not configured' } as AuthError };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setState((prev) => ({ ...prev, error }));
    }

    return { error };
  }, [isConfigured]);

  const signOut = useCallback(async () => {
    if (!isConfigured) {
      return { error: { message: 'Supabase not configured' } as AuthError };
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      setState((prev) => ({ ...prev, error }));
    }

    return { error };
  }, [isConfigured]);

  const resetPassword = useCallback(
    async (email: string) => {
      if (!isConfigured) {
        return { error: { message: 'Supabase not configured' } as AuthError };
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        setState((prev) => ({ ...prev, error }));
      }

      return { error };
    },
    [isConfigured]
  );

  const updatePassword = useCallback(
    async (newPassword: string) => {
      if (!isConfigured) {
        return { error: { message: 'Supabase not configured' } as AuthError };
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setState((prev) => ({ ...prev, error }));
      }

      return { error };
    },
    [isConfigured]
  );

  const value: AuthContextValue = {
    ...state,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    isConfigured,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook to require authentication
export function useRequireAuth(redirectTo = '/login') {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      // In a real app, you'd use a router here
      window.location.href = redirectTo;
    }
  }, [user, loading, redirectTo]);

  return { user, loading };
}
