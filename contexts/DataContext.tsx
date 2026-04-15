import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Goal, SavingEntry, NotificationSettings, Category } from '../types';
import { storage } from '../utils/storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface DataContextType {
  goals: Goal[];
  activeGoal: Goal | null;
  goal: Goal | null; // alias for activeGoal (backward compat)
  savings: SavingEntry[];
  categories: Category[];
  notifications: NotificationSettings;
  onboardingCompleted: boolean;
  isLoading: boolean;
  setGoal: (goal: Goal) => Promise<void>;
  addGoal: (goal: Goal) => Promise<void>;
  updateGoal: (goal: Goal) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  setActiveGoal: (id: string) => Promise<void>;
  addSaving: (entry: SavingEntry) => Promise<void>;
  updateSaving: (entry: SavingEntry) => Promise<void>;
  deleteSaving: (id: string) => Promise<void>;
  setNotifications: (settings: NotificationSettings) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextType>({} as DataContextType);

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Alimentação', icon: '🍔', color: '#EF4444', isDefault: true },
  { id: 'cat-2', name: 'Transporte', icon: '🚗', color: '#3B82F6', isDefault: true },
  { id: 'cat-3', name: 'Lazer', icon: '🎮', color: '#8B5CF6', isDefault: true },
  { id: 'cat-4', name: 'Compras', icon: '🛍️', color: '#F59E0B', isDefault: true },
  { id: 'cat-5', name: 'Saúde', icon: '💊', color: '#EC4899', isDefault: true },
  { id: 'cat-6', name: 'Educação', icon: '📚', color: '#06B6D4', isDefault: true },
  { id: 'cat-7', name: 'Moradia', icon: '🏠', color: '#14B8A6', isDefault: true },
  { id: 'cat-8', name: 'Outro', icon: '📌', color: '#6B7280', isDefault: true },
];

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [goals, setGoalsState] = useState<Goal[]>([]);
  const [activeGoalId, setActiveGoalIdState] = useState<string | null>(null);
  const [savings, setSavingsState] = useState<SavingEntry[]>([]);
  const [categories, setCategoriesState] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [notifications, setNotificationsState] = useState<NotificationSettings>({
    enabled: false, frequency: 'daily', hour: 20, minute: 0,
  });
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const activeGoal = goals.find(g => g.id === activeGoalId) || goals[0] || null;

  const loadFromSupabase = useCallback(async () => {
    if (!user) return null;
    try {
      // Carregar todas as metas
      const { data: goalsData } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

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

      const mappedGoals: Goal[] = (goalsData || []).map((g: any) => ({
        id: g.id,
        name: g.name,
        userName: g.user_name || '',
        targetAmount: Number(g.target_amount),
        targetDate: g.target_date,
        createdAt: g.created_at,
        activeModality: g.active_modality || 'monthly',
      }));

      const mappedSavings: SavingEntry[] = (savingsData || []).map((s: any) => {
        const cat = (catData || []).find((c: any) => c.id === s.category_id);
        return {
          id: s.id,
          amount: Number(s.amount),
          description: s.description || '',
          date: s.date,
          createdAt: s.created_at,
          goalId: s.goal_id || (mappedGoals[0]?.id ?? undefined),
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
        goals: mappedGoals,
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
          setGoalsState(supaData.goals);
          setSavingsState(supaData.savings);
          setCategoriesState(supaData.categories);
          // Carregar active goal ID
          const storedActiveId = await storage.getActiveGoalId();
          const validId = supaData.goals.find(g => g.id === storedActiveId)?.id || supaData.goals[0]?.id || null;
          setActiveGoalIdState(validId);
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
      const [gs, s, n, o, aid] = await Promise.all([
        storage.getGoals(),
        storage.getSavings(),
        storage.getNotifications(),
        storage.getOnboardingCompleted(),
        storage.getActiveGoalId(),
      ]);
      setGoalsState(gs);
      setSavingsState(s);
      setNotificationsState(n);
      setOnboardingCompleted(o);
      const validId = gs.find(g => g.id === aid)?.id || gs[0]?.id || null;
      setActiveGoalIdState(validId);
    } finally {
      setIsLoading(false);
    }
  }, [user, loadFromSupabase]);

  useEffect(() => { loadData(); }, [loadData]);

  // setGoal: upsert - if exists update, else add + set active
  const setGoal = async (g: Goal) => {
    const exists = goals.find(x => x.id === g.id);
    if (exists) {
      await updateGoal(g);
    } else {
      await addGoal(g);
    }
  };

  const addGoal = async (g: Goal) => {
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
    const updated = [g, ...goals];
    await storage.setGoals(updated);
    await storage.setActiveGoalId(g.id);
    setGoalsState(updated);
    setActiveGoalIdState(g.id);
  };

  const updateGoal = async (g: Goal) => {
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
    const updated = goals.map(x => x.id === g.id ? g : x);
    await storage.setGoals(updated);
    setGoalsState(updated);
  };

  const deleteGoal = async (id: string) => {
    if (isSupabaseConfigured() && user) {
      // Deletar economias do objetivo primeiro
      await supabase.from('savings').delete().eq('goal_id', id);
      await supabase.from('goals').delete().eq('id', id);
    }
    const updatedGoals = goals.filter(g => g.id !== id);
    const updatedSavings = savings.filter(s => s.goalId !== id);
    await storage.setGoals(updatedGoals);
    await storage.setSavings(updatedSavings);
    setGoalsState(updatedGoals);
    setSavingsState(updatedSavings);
    // Se deletou o ativo, muda para o primeiro disponível
    if (activeGoalId === id) {
      const newId = updatedGoals[0]?.id || null;
      if (newId) await storage.setActiveGoalId(newId);
      setActiveGoalIdState(newId);
    }
  };

  const setActiveGoalFn = async (id: string) => {
    await storage.setActiveGoalId(id);
    setActiveGoalIdState(id);
  };

  const addSaving = async (entry: SavingEntry) => {
    // Garantir que goalId está definido
    const entryWithGoal = { ...entry, goalId: entry.goalId || activeGoal?.id };
    if (isSupabaseConfigured() && user) {
      await supabase.from('savings').insert({
        id: entryWithGoal.id,
        user_id: user.id,
        goal_id: entryWithGoal.goalId || null,
        amount: entryWithGoal.amount,
        description: entryWithGoal.description,
        date: entryWithGoal.date,
        category_id: entryWithGoal.categoryId || null,
        created_at: entryWithGoal.createdAt,
      });
    }
    const updated = [entryWithGoal, ...savings];
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

  const updateSaving = async (entry: SavingEntry) => {
    if (isSupabaseConfigured() && user) {
      await supabase.from('savings').update({
        amount: entry.amount,
        description: entry.description,
        date: entry.date,
        category_id: entry.categoryId || null,
        goal_id: entry.goalId || null,
      }).eq('id', entry.id);
    }
    const updated = savings.map(s => s.id === entry.id ? entry : s);
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
    setGoalsState([]);
    setActiveGoalIdState(null);
    setSavingsState([]);
    setNotificationsState({ enabled: false, frequency: 'daily', hour: 20, minute: 0 });
    setOnboardingCompleted(false);
  };

  return (
    <DataContext.Provider value={{
      goals, activeGoal, goal: activeGoal,
      savings, categories, notifications, onboardingCompleted, isLoading,
      setGoal, addGoal, updateGoal, deleteGoal, setActiveGoal: setActiveGoalFn,
      addSaving, updateSaving, deleteSaving, setNotifications,
      completeOnboarding, resetAll, refresh: loadData,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
