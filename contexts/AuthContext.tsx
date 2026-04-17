import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { translateError } from '../utils/errorTranslator';
import {
  GoogleSignin,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Configurar Google Sign-In (webClientId vem do Google Cloud Console)
if (Platform.OS !== 'web') {
  GoogleSignin.configure({
    webClientId: '960015347115-cm26i14uhuabdpsadhmtnil7ja1tba0l.apps.googleusercontent.com',
    offlineAccess: true,
  });
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
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

    // Redirect URL para confirmação de email (web usa origin + basePath)
    let emailRedirectTo: string | undefined;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      emailRedirectTo = window.location.origin + '/cofrinho-digital/';
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        ...(emailRedirectTo ? { emailRedirectTo } : {}),
      },
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
    if (Platform.OS !== 'web') {
      try { await GoogleSignin.signOut(); } catch {}
    }
    await supabase.auth.signOut();
  };

  const signInWithGoogle = async (): Promise<{ error?: string }> => {
    try {
      if (Platform.OS === 'web') {
        // Monta redirectTo com origin + basePath (GitHub Pages serve em /cofrinho-digital/)
        const redirectUrl = window.location.origin + '/cofrinho-digital';
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: redirectUrl },
        });
        if (error) return { error: translateError(error.message) };
        return {};
      }
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        return { error: 'Login com Google cancelado.' };
      }

      const idToken = response.data.idToken;
      if (!idToken) {
        return { error: 'Não foi possível obter o token do Google.' };
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) return { error: translateError(error.message) };
      return {};
    } catch (err: any) {
      return { error: err?.message || 'Erro ao fazer login com Google.' };
    }
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
      signUp, signIn, signInWithGoogle, signOut, resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
