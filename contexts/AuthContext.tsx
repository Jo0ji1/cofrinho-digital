import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { translateError } from '../utils/errorTranslator';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string): Promise<{ error?: string }> => {
    if (!EMAIL_RE.test(email)) return { error: 'Formato de email inválido.' };
    if (password.length < 6) return { error: 'A senha deve ter pelo menos 6 caracteres.' };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) return { error: translateError(error.message) };
    return {};
  };

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    if (!EMAIL_RE.test(email)) return { error: 'Formato de email inválido.' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: translateError(error.message) };
    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string): Promise<{ error?: string }> => {
    if (!EMAIL_RE.test(email)) return { error: 'Formato de email inválido.' };
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return { error: translateError(error.message) };
    return {};
  };

  return (
    <AuthContext.Provider value={{
      user, session, isLoading, isConfigured: configured,
      signUp, signIn, signOut, resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
