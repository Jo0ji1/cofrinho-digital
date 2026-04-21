import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Goal, SavingEntry, NotificationSettings, Category, GoalMember, GoalInvite, GoalRole, GoalActivity, ActivityAction } from '../types';
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
  // Shared goals
  getGoalMembers: (goalId: string) => Promise<GoalMember[]>;
  createGoalInvite: (goalId: string, expiresInDays?: number) => Promise<GoalInvite | null>;
  regenerateInvite: (goalId: string, expiresInDays?: number) => Promise<GoalInvite | null>;
  joinGoalByInvite: (inviteCode: string) => Promise<{ success: boolean; goalName?: string; error?: string }>;
  removeGoalMember: (goalId: string, userId: string) => Promise<void>;
  updateMemberRole: (goalId: string, userId: string, role: 'editor' | 'participant' | 'viewer') => Promise<boolean>;
  getGoalInvites: (goalId: string) => Promise<GoalInvite[]>;
  // Activity feed
  getGoalActivities: (goalId: string, limit?: number) => Promise<GoalActivity[]>;
  logActivity: (goalId: string, action: ActivityAction, metadata?: Record<string, any>) => Promise<void>;
  // Roles for the current user, keyed by goalId
  myRoleByGoal: Record<string, GoalRole>;
  memberCountByGoal: Record<string, number>;
}

const DataContext = createContext<DataContextType>({} as DataContextType);

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Pix recebido', icon: '💸', color: '#10B981', isDefault: true },
  { id: 'cat-2', name: 'Sobra do salário', icon: '💰', color: '#3B82F6', isDefault: true },
  { id: 'cat-3', name: 'Dinheiro em espécie', icon: '💵', color: '#059669', isDefault: true },
  { id: 'cat-4', name: 'Desconto obtido', icon: '🏷️', color: '#F59E0B', isDefault: true },
  { id: 'cat-5', name: 'Economizei em compra', icon: '🛒', color: '#8B5CF6', isDefault: true },
  { id: 'cat-6', name: 'Renda extra', icon: '📈', color: '#EC4899', isDefault: true },
  { id: 'cat-7', name: 'Cortei um gasto', icon: '✂️', color: '#EF4444', isDefault: true },
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
  const [myRoleByGoal, setMyRoleByGoal] = useState<Record<string, GoalRole>>({});
  const [memberCountByGoal, setMemberCountByGoal] = useState<Record<string, number>>({});

  const activeGoal = goals.find(g => g.id === activeGoalId) || goals[0] || null;

  const loadFromSupabase = useCallback(async () => {
    if (!user) return null;
    try {
      // 1) Descobrir IDs de goals onde o usuário é membro (compartilhados)
      const { data: membershipData } = await supabase
        .from('goal_members')
        .select('goal_id')
        .eq('user_id', user.id);
      const memberGoalIds = (membershipData || []).map((m: any) => m.goal_id as string);

      // 2) Carregar goals próprios + goals compartilhados
      // Como RLS já permite ver os dois, fazemos uma única query com .or()
      let goalsQuery = supabase.from('goals').select('*');
      if (memberGoalIds.length > 0) {
        goalsQuery = goalsQuery.or(`user_id.eq.${user.id},id.in.(${memberGoalIds.join(',')})`);
      } else {
        goalsQuery = goalsQuery.eq('user_id', user.id);
      }
      const { data: goalsData } = await goalsQuery.order('created_at', { ascending: false });

      const allGoalIds = (goalsData || []).map((g: any) => g.id as string);

      // Carregar contagem de membros e role do usuário por goal
      let rolesMap: Record<string, GoalRole> = {};
      let countsMap: Record<string, number> = {};
      if (allGoalIds.length > 0) {
        const { data: allMembers } = await supabase
          .from('goal_members')
          .select('goal_id, user_id, role')
          .in('goal_id', allGoalIds);
        (allMembers || []).forEach((m: any) => {
          countsMap[m.goal_id] = (countsMap[m.goal_id] || 0) + 1;
          if (m.user_id === user.id) rolesMap[m.goal_id] = m.role;
        });
      }
      // Se ainda não tem role registrado mas o usuário é dono do goal (legacy), assumir owner
      (goalsData || []).forEach((g: any) => {
        if (!rolesMap[g.id] && g.user_id === user.id) rolesMap[g.id] = 'owner';
      });

      // 3) Carregar savings próprios + savings dos goals compartilhados
      let savingsQuery = supabase.from('savings').select('*');
      if (allGoalIds.length > 0) {
        savingsQuery = savingsQuery.or(`user_id.eq.${user.id},goal_id.in.(${allGoalIds.join(',')})`);
      } else {
        savingsQuery = savingsQuery.eq('user_id', user.id);
      }
      const { data: savingsData } = await savingsQuery.order('date', { ascending: false });

      // 4) Carregar categorias
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .or('is_default.eq.true,user_id.eq.' + user.id)
        .order('name');

      // 5) Carregar nomes dos autores das economias (para goals compartilhados)
      const authorIds = Array.from(
        new Set((savingsData || []).map((s: any) => s.user_id).filter((id: any) => id && id !== user.id))
      );
      let authorsMap: Record<string, string> = {};
      if (authorIds.length > 0) {
        const { data: authorsData } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', authorIds);
        authorsMap = Object.fromEntries(
          (authorsData || []).map((p: any) => [p.id, p.name || 'Usuário'])
        );
      }

      const mappedGoals: Goal[] = (goalsData || []).map((g: any) => ({
        id: g.id,
        name: g.name,
        userName: g.user_name || '',
        targetAmount: Number(g.target_amount),
        targetDate: g.target_date,
        createdAt: g.created_at,
        activeModality: g.active_modality || 'monthly',
        description: g.description || undefined,
        emoji: g.emoji || undefined,
        color: g.color || undefined,
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
          userId: s.user_id,
          authorName: s.user_id === user.id ? 'Você' : (authorsMap[s.user_id] || undefined),
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
        rolesMap,
        countsMap,
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
          setMyRoleByGoal(supaData.rolesMap || {});
          setMemberCountByGoal(supaData.countsMap || {});
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

  // Realtime: reload data when savings/members/goals/activities change
  // on any goal the user is part of
  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const trigger = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        loadFromSupabase().then((data) => {
          if (!data) return;
          setGoalsState(data.goals);
          setSavingsState(data.savings);
          setCategoriesState(data.categories);
          setMyRoleByGoal(data.rolesMap || {});
          setMemberCountByGoal(data.countsMap || {});
        });
      }, 500);
    };
    const ch = supabase
      .channel('vaqui-sync-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'savings' }, trigger)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goal_members' }, trigger)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, trigger)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goal_activities' }, trigger)
      .subscribe();
    return () => {
      if (debounce) clearTimeout(debounce);
      supabase.removeChannel(ch);
    };
  }, [user, loadFromSupabase]);

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
        description: g.description || null,
        emoji: g.emoji || null,
        color: g.color || null,
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
        description: g.description || null,
        emoji: g.emoji || null,
        color: g.color || null,
      });
      // Log activity if shared
      if ((memberCountByGoal[g.id] || 0) > 1) {
        await logActivity(g.id, 'edited_goal', { name: g.name });
      }
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
    // Security: block viewers from adding savings on shared goals
    const goalId = entryWithGoal.goalId;
    if (goalId && myRoleByGoal[goalId] === 'viewer') {
      throw new Error('Você ainda não tem permissão para adicionar economias neste objetivo. Aguarde o dono aprovar seu acesso.');
    }
    if (isSupabaseConfigured() && user) {
      const { error } = await supabase.from('savings').insert({
        id: entryWithGoal.id,
        user_id: user.id,
        goal_id: entryWithGoal.goalId || null,
        amount: entryWithGoal.amount,
        description: entryWithGoal.description,
        date: entryWithGoal.date,
        category_id: entryWithGoal.categoryId || null,
        created_at: entryWithGoal.createdAt,
      });
      if (error) {
        throw new Error(error.message || 'Erro ao salvar economia');
      }
      // Log activity on shared goals
      if (goalId && (memberCountByGoal[goalId] || 0) > 1) {
        await logActivity(goalId, 'added_saving', {
          amount: entryWithGoal.amount,
          description: entryWithGoal.description,
          categoryId: entryWithGoal.categoryId,
        });
      }
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

  // ============ Shared Goals ============

  const getGoalMembers = async (goalId: string): Promise<GoalMember[]> => {
    if (!isSupabaseConfigured() || !user) return [];
    try {
      const { data: membersData } = await supabase
        .from('goal_members')
        .select('*')
        .eq('goal_id', goalId)
        .order('joined_at');

      const userIds = (membersData || []).map((m: any) => m.user_id);
      let profilesMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds);
        profilesMap = Object.fromEntries(
          (profilesData || []).map((p: any) => [p.id, p.name || 'Usuário'])
        );
      }

      return (membersData || []).map((m: any) => ({
        id: m.id,
        goalId: m.goal_id,
        userId: m.user_id,
        userName: profilesMap[m.user_id] || (m.user_id === user.id ? 'Você' : 'Usuário'),
        role: m.role,
        joinedAt: m.joined_at,
      }));
    } catch {
      return [];
    }
  };

  const updateMemberRole = async (goalId: string, userId: string, role: 'editor' | 'participant' | 'viewer'): Promise<boolean> => {
    if (!isSupabaseConfigured() || !user) return false;
    // Find previous role for activity log
    const { data: prev } = await supabase
      .from('goal_members')
      .select('role')
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .single();
    const prevRole = prev?.role;

    const { error } = await supabase
      .from('goal_members')
      .update({ role })
      .eq('goal_id', goalId)
      .eq('user_id', userId);
    if (error) return false;

    // Log activity
    const rank = { viewer: 0, participant: 1, editor: 2, owner: 3 } as const;
    const action: ActivityAction =
      prevRole === 'viewer' && role !== 'viewer' ? 'approved'
      : (rank as any)[role] > (rank as any)[prevRole || 'viewer'] ? 'promoted'
      : 'demoted';
    await logActivity(goalId, action, { targetUserId: userId, fromRole: prevRole, toRole: role });

    // Update local state if it's the current user
    if (userId === user.id) {
      setMyRoleByGoal(prev => ({ ...prev, [goalId]: role }));
    }
    return true;
  };

  const logActivity = async (goalId: string, action: ActivityAction, metadata: Record<string, any> = {}): Promise<void> => {
    if (!isSupabaseConfigured() || !user) return;
    try {
      await supabase.from('goal_activities').insert({
        goal_id: goalId,
        user_id: user.id,
        action,
        metadata,
      });
    } catch {
      // Silent fail - activity log is non-critical
    }
  };

  const getGoalActivities = async (goalId: string, limit = 20): Promise<GoalActivity[]> => {
    if (!isSupabaseConfigured() || !user) return [];
    try {
      const { data } = await supabase
        .from('goal_activities')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false })
        .limit(limit);

      const userIds = Array.from(new Set((data || []).map((a: any) => a.user_id)));
      let namesMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds);
        namesMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p.name || 'Usuário']));
      }

      return (data || []).map((a: any) => ({
        id: a.id,
        goalId: a.goal_id,
        userId: a.user_id,
        userName: a.user_id === user.id ? 'Você' : (namesMap[a.user_id] || 'Usuário'),
        action: a.action,
        metadata: a.metadata || {},
        createdAt: a.created_at,
      }));
    } catch {
      return [];
    }
  };

  const createGoalInvite = async (goalId: string, expiresInDays = 7): Promise<GoalInvite | null> => {
    if (!isSupabaseConfigured() || !user) return null;
    try {
      // Generate a 6-char invite code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      // Ensure creator is owner/member first
      const { data: existingMember } = await supabase
        .from('goal_members')
        .select('id')
        .eq('goal_id', goalId)
        .eq('user_id', user.id)
        .single();

      if (!existingMember) {
        // Auto-add creator as owner if they own the goal
        await supabase.from('goal_members').insert({
          goal_id: goalId,
          user_id: user.id,
          role: 'owner',
        });
      }

      const { data, error } = await supabase.from('goal_invites').insert({
        goal_id: goalId,
        invite_code: code,
        created_by: user.id,
        max_uses: 10,
        expires_at: expiresAt.toISOString(),
      }).select().single();

      if (error || !data) return null;
      return {
        id: data.id,
        goalId: data.goal_id,
        inviteCode: data.invite_code,
        createdBy: data.created_by,
        maxUses: data.max_uses,
        usedCount: data.used_count,
        expiresAt: data.expires_at,
        createdAt: data.created_at,
      };
    } catch {
      return null;
    }
  };

  const regenerateInvite = async (goalId: string, expiresInDays = 7): Promise<GoalInvite | null> => {
    if (!isSupabaseConfigured() || !user) return null;
    try {
      const { data, error } = await supabase.rpc('regenerate_goal_invite', {
        p_goal_id: goalId,
        p_expires_in_days: expiresInDays,
      });
      if (error) throw error;
      const result = data as any;
      if (!result?.success) return null;
      // Re-fetch the new invite row
      const { data: inv } = await supabase
        .from('goal_invites')
        .select('*')
        .eq('id', result.invite_id)
        .single();
      if (!inv) return null;
      return {
        id: inv.id,
        goalId: inv.goal_id,
        inviteCode: inv.invite_code,
        createdBy: inv.created_by,
        maxUses: inv.max_uses,
        usedCount: inv.used_count,
        expiresAt: inv.expires_at,
        createdAt: inv.created_at,
      };
    } catch {
      return null;
    }
  };

  const joinGoalByInvite = async (inviteCode: string): Promise<{ success: boolean; goalName?: string; error?: string }> => {
    if (!isSupabaseConfigured() || !user) return { success: false, error: 'Não autenticado' };
    try {
      const { data, error } = await supabase.rpc('join_goal_by_invite', {
        p_invite_code: inviteCode.toUpperCase().trim(),
      });
      if (error) return { success: false, error: error.message };
      const result = data as any;
      if (result?.success) {
        await loadData(); // Refresh to load new shared goal
        return { success: true, goalName: result.goal_name };
      }
      return { success: false, error: result?.error || 'Erro ao entrar no objetivo' };
    } catch {
      return { success: false, error: 'Erro de conexão' };
    }
  };

  const removeGoalMember = async (goalId: string, userId: string): Promise<void> => {
    if (!isSupabaseConfigured() || !user) return;
    await supabase.from('goal_members').delete().eq('goal_id', goalId).eq('user_id', userId);
  };

  const getGoalInvites = async (goalId: string): Promise<GoalInvite[]> => {
    if (!isSupabaseConfigured() || !user) return [];
    try {
      const { data } = await supabase
        .from('goal_invites')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false });
      return (data || []).map((inv: any) => ({
        id: inv.id,
        goalId: inv.goal_id,
        inviteCode: inv.invite_code,
        createdBy: inv.created_by,
        maxUses: inv.max_uses,
        usedCount: inv.used_count,
        expiresAt: inv.expires_at,
        createdAt: inv.created_at,
      }));
    } catch {
      return [];
    }
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
      getGoalMembers, createGoalInvite, regenerateInvite, joinGoalByInvite, removeGoalMember, updateMemberRole, getGoalInvites,
      getGoalActivities, logActivity,
      myRoleByGoal, memberCountByGoal,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
