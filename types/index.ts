export interface Goal {
  id: string;
  name: string;
  userName: string;
  targetAmount: number;
  targetDate: string; // ISO date string
  createdAt: string;
  activeModality: 'daily' | 'weekly' | 'monthly';
}

export interface SavingEntry {
  id: string;
  amount: number;
  description: string;
  date: string; // ISO date string
  createdAt: string;
}

export type ModalityType = 'daily' | 'weekly' | 'monthly';

export interface ModalityInfo {
  type: ModalityType;
  title: string;
  description: string;
  icon: string;
  suggestedAmount: number;
  period: string;
}

export interface NotificationSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  hour: number;
  minute: number;
}

export interface AppData {
  goal: Goal | null;
  savings: SavingEntry[];
  notifications: NotificationSettings;
  onboardingCompleted: boolean;
}
