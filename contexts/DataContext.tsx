import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Goal, SavingEntry, NotificationSettings, Category } from '../types';
import { storage } from '../utils/storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface DataContextType {
  goal: Goal | null;
  savings: SavingEntry[];
  categories: Category[];
  notifications: NotificationSettings;
  onboardingCompleted: boolean;
  isLoading: boolean;
  setGoal: (goal: Goal) => Promise<void>;
  addSaving: (entry: SavingEntry) => Promise<void>;
  deleteSaving: (id: string) => Promise<void>;
  setNotifications: (settings: NotificationSettings) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextType>({} as DataContextType);

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Alimentação', icon: '🍔', color: '#FF6B6B', isDefault: true },
  { id: 'cat-2', name: 'Transporte', icon: '🚗', color: '#4ECDC4', isDefault: true },
  { id: 'cat-3', name: 'Lazer', icon: '🎮', color: '#45B7D1', isDefault: true },
  { id: 'cat-4', name: 'Compras', icon: '🛍️', color: '#96CEB4', isDefault: true },
  { id: 'cat-5', name: 'Saúde', icon: '💊', color: '#FFEAA7', isDefault: true },
  { id: 'cat-6', name: 'Educação', icon: '📚', color: '#DDA0DD', isDefault: true },
  { id: 'cat-7', name: 'Moradia', icon: '🏠', color: '#98D8C8', isDefault: true },
  { id: 'cat-8', name: 'Outro', icon: '📌', color: '#B0B0B0', isDefault: true },
];

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [goal, setGoalState] = useState<Goal | null>(null);
  const [savings, setSavingsState] = useState<SavingEntry[]>([]);
  const [categories, setCategoriesState] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [notifications, setNotificationsState] = useState<NotificationSettings>({
    enabled: false, frequency: 'daily', hour: 20, minute: 0,
  });
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadFromSupabase = useCallback(async () => {
    if (!user) return null;
    try {
      // Carregar meta
      const { data: goalData } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Carregar economias
      const { data: savingsData } = await supabase
        .from('savings')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      // Carregar categorias
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .or('is_default.eq.true,user_id.eq.' + user.id)
        .order('name');

      const mappedGoal: Goal | null = goalData ? {
        id: goalData.id,
        name: goalData.name,
        userName: goalData.user_name || '',
        targetAmount: Number(goalData.target_amount),
        targetDate: goalData.target_date,
        createdAt: goalData.created_at,
        activeModality: goalData.active_modality || 'monthly',
      } : null;

      const mappedSavings: SavingEntry[] = (savingsData || []).map((s: any) => {
        const cat = (catData || []).find((c: any) => c.id === s.category_id);
        return {
          id: s.id,
          amount: Number(s.amount),
          description: s.description || '',
          date: s.date,
          createdAt: s.created_at,
          categoryId: s.category_id,
          categoryName: cat?.name,
          categoryIcon: cat?.icon,
          categoryColor: cat?.color,
        };
      });

      const mappedCategories: Category[] = (catData || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        isDefault: c.is_default,
      }));

      return {
        goal: mappedGoal,
        savings: mappedSavings,
        categories: mappedCategories.length > 0 ? mappedCategories : DEFAULT_CATEGORIES,
      };
    } catch {
      return null;
    }
  }, [user]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Tentar Supabase primeiro se configurado e logado
      if (isSupabaseConfigured() && user) {
        const supaData = await loadFromSupabase();
        if (supaData) {
          setGoalState(supaData.goal);
          setSavingsState(supaData.savings);
          setCategoriesState(supaData.categories);
          // Verificar onboarding do perfil
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', user.id)
            .single();
          setOnboardingCompleted(profile?.onboarding_completed ?? false);
          setIsLoading(false);
          return;
        }
      }

      // Fallback: AsyncStorage local
      const [g, s, n, o] = await Promise.all([
        storage.getGoal(),
        storage.getSavings(),
        storage.getNotifications(),
        storage.getOnboardingCompleted(),
      ]);
      setGoalState(g);
      setSavingsState(s);
      setNotificationsState(n);
      setOnboardingCompleted(o);
    } finally {
      setIsLoading(false);
    }
  }, [user, loadFromSupabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const setGoal = async (g: Goal) => {
    if (isSupabaseConfigured() && user) {
      await supabase.from('goals').upsert({
        id: g.id,
        user_id: user.id,
        name: g.name,
        user_name: g.userName,
        target_amount: g.targetAmount,
        target_date: g.targetDate,
        active_modality: g.activeModality,
      });
    }
    await storage.setGoal(g);
    setGoalState(g);
  };

  const addSaving = async (entry: SavingEntry) => {
    if (isSupabaseConfigured() && user) {
      await supabase.from('savings').insert({
        id: entry.id,
        user_id: user.id,
        amount: entry.amount,
        description: entry.description,
        date: entry.date,
        category_id: entry.categoryId || null,
        created_at: entry.createdAt,
      });
    }
    const updated = [entry, ...savings];
    await storage.setSavings(updated);
    setSavingsState(updated);
  };

  const deleteSaving = async (id: string) => {
    if (isSupabaseConfigured() && user) {
      await supabase.from('savings').delete().eq('id', id);
    }
    const updated = savings.filter(s => s.id !== id);
    await storage.setSavings(updated);
    setSavingsState(updated);
  };

  const setNotifications = async (s: NotificationSettings) => {
    await storage.setNotifications(s);
    setNotificationsState(s);
  };

  const completeOnboarding = async () => {
    if (isSupabaseConfigured() && user) {
      await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id);
    }
    await storage.setOnboardingCompleted(true);
    setOnboardingCompleted(true);
  };

  const resetAll = async () => {
    if (isSupabaseConfigured() && user) {
      await supabase.from('savings').delete().eq('user_id', user.id);
      await supabase.from('goals').delete().eq('user_id', user.id);
      await supabase.from('profiles').update({ onboarding_completed: false }).eq('id', user.id);
    }
    await storage.clearAll();
    setGoalState(null);
    setSavingsState([]);
    setNotificationsState({ enabled: false, frequency: 'daily', hour: 20, minute: 0 });
    setOnboardingCompleted(false);
  };

  return (
    <DataContext.Provider value={{
      goal, savings, categories, notifications, onboardingCompleted, isLoading,
      setGoal, addSaving, deleteSaving, setNotifications,
      completeOnboarding, resetAll, refresh: loadData,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
