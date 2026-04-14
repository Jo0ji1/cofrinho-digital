import AsyncStorage from '@react-native-async-storage/async-storage';
import { Goal, SavingEntry, NotificationSettings } from '../types';

const KEYS = {
  GOAL: '@cofrinho:goal',
  SAVINGS: '@cofrinho:savings',
  NOTIFICATIONS: '@cofrinho:notifications',
  ONBOARDING: '@cofrinho:onboarding',
  THEME: '@cofrinho:theme',
};

export const storage = {
  async getGoal(): Promise<Goal | null> {
    const data = await AsyncStorage.getItem(KEYS.GOAL);
    return data ? JSON.parse(data) : null;
  },
  async setGoal(goal: Goal): Promise<void> {
    await AsyncStorage.setItem(KEYS.GOAL, JSON.stringify(goal));
  },
  async getSavings(): Promise<SavingEntry[]> {
    const data = await AsyncStorage.getItem(KEYS.SAVINGS);
    return data ? JSON.parse(data) : [];
  },
  async setSavings(savings: SavingEntry[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.SAVINGS, JSON.stringify(savings));
  },
  async getNotifications(): Promise<NotificationSettings> {
    const data = await AsyncStorage.getItem(KEYS.NOTIFICATIONS);
    return data ? JSON.parse(data) : { enabled: false, frequency: 'daily', hour: 20, minute: 0 };
  },
  async setNotifications(settings: NotificationSettings): Promise<void> {
    await AsyncStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(settings));
  },
  async getOnboardingCompleted(): Promise<boolean> {
    const data = await AsyncStorage.getItem(KEYS.ONBOARDING);
    return data === 'true';
  },
  async setOnboardingCompleted(completed: boolean): Promise<void> {
    await AsyncStorage.setItem(KEYS.ONBOARDING, completed ? 'true' : 'false');
  },
  async getTheme(): Promise<'light' | 'dark' | 'system'> {
    const data = await AsyncStorage.getItem(KEYS.THEME);
    return (data as 'light' | 'dark' | 'system') || 'system';
  },
  async setTheme(theme: 'light' | 'dark' | 'system'): Promise<void> {
    await AsyncStorage.setItem(KEYS.THEME, theme);
  },
  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  },
  async getItem(key: string): Promise<string | null> {
    return AsyncStorage.getItem(`@cofrinho:${key}`);
  },
  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(`@cofrinho:${key}`, value);
  },
};
