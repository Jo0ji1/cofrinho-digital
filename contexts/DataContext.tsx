import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Goal, SavingEntry, NotificationSettings } from '../types';
import { storage } from '../utils/storage';

interface DataContextType {
  goal: Goal | null;
  savings: SavingEntry[];
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

export function DataProvider({ children }: { children: ReactNode }) {
  const [goal, setGoalState] = useState<Goal | null>(null);
  const [savings, setSavingsState] = useState<SavingEntry[]>([]);
  const [notifications, setNotificationsState] = useState<NotificationSettings>({
    enabled: false, frequency: 'daily', hour: 20, minute: 0,
  });
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
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
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const setGoal = async (g: Goal) => {
    await storage.setGoal(g);
    setGoalState(g);
  };

  const addSaving = async (entry: SavingEntry) => {
    const updated = [entry, ...savings];
    await storage.setSavings(updated);
    setSavingsState(updated);
  };

  const deleteSaving = async (id: string) => {
    const updated = savings.filter(s => s.id !== id);
    await storage.setSavings(updated);
    setSavingsState(updated);
  };

  const setNotifications = async (s: NotificationSettings) => {
    await storage.setNotifications(s);
    setNotificationsState(s);
  };

  const completeOnboarding = async () => {
    await storage.setOnboardingCompleted(true);
    setOnboardingCompleted(true);
  };

  const resetAll = async () => {
    await storage.clearAll();
    setGoalState(null);
    setSavingsState([]);
    setNotificationsState({ enabled: false, frequency: 'daily', hour: 20, minute: 0 });
    setOnboardingCompleted(false);
  };

  return (
    <DataContext.Provider value={{
      goal, savings, notifications, onboardingCompleted, isLoading,
      setGoal, addSaving, deleteSaving, setNotifications,
      completeOnboarding, resetAll, refresh: loadData,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
