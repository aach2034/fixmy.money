'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '../lib/supabase/client';

const AuthContext = createContext<any>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Email/Password Sign Up
  const signUp = async (email: string, password: string, metadata: any = {}) => {
    try {
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (typeof window !== 'undefined' ? window.location.origin : '');

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: metadata?.fullName || '',
            company_name: metadata?.companyName || '',
            plan: metadata?.plan || '',
            avatar_url: metadata?.avatarUrl || ''
          },
          emailRedirectTo: `${siteUrl}/auth/callback?type=signup&plan=${metadata?.plan || 'growth'}`
        }
      });
      if (error) {
        console.error('[AuthContext] signUp error:', error.message, error);
        throw new Error(error.message || 'Unable to create account. Please contact support.');
      }
      return data;
    } catch (err: any) {
      // Log full error for debugging, throw user-friendly message
      console.error('[AuthContext] signUp exception:', err);
      if (err?.message && !err.message.includes('Unable to create account')) {
        throw err;
      }
      throw new Error(err?.message || 'Unable to create account. Please contact support.');
    }
  };

  // Email/Password Sign In
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) {
        console.error('[AuthContext] signIn error:', error.message, error);
        throw new Error(error.message || 'Invalid email or password. Please try again.');
      }
      return data;
    } catch (err: any) {
      console.error('[AuthContext] signIn exception:', err);
      throw err;
    }
  };

  // Sign Out
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[AuthContext] signOut error:', error.message);
        throw error;
      }
    } catch (err: any) {
      console.error('[AuthContext] signOut exception:', err);
      throw err;
    }
  };

  // Get Current User
  const getCurrentUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('[AuthContext] getCurrentUser error:', error.message);
        throw error;
      }
      return user;
    } catch (err: any) {
      console.error('[AuthContext] getCurrentUser exception:', err);
      throw err;
    }
  };

  // Check if Email is Verified — defensive: handles null, undefined, and missing field
  const isEmailVerified = () => {
    try {
      if (!user) return false;
      const confirmedAt = user?.email_confirmed_at;
      // Treat null, undefined, and empty string as unverified
      return confirmedAt !== null && confirmedAt !== undefined && confirmedAt !== '';
    } catch (err) {
      console.error('[AuthContext] isEmailVerified error:', err);
      return false;
    }
  };

  // Get User Profile from Database
  const getUserProfile = async () => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) {
        console.error('[AuthContext] getUserProfile error:', error.message);
        throw error;
      }
      return data;
    } catch (err: any) {
      console.error('[AuthContext] getUserProfile exception:', err);
      throw err;
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    isEmailVerified,
    getUserProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
