export interface Goal {
  id: string;
  name: string;
  userName: string;
  targetAmount: number;
  targetDate: string; // ISO date string
  createdAt: string;
  activeModality: 'daily' | 'weekly' | 'monthly';
  description?: string;
  emoji?: string;
  color?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
}

export interface SavingEntry {
  id: string;
  amount: number;
  description: string;
  date: string; // ISO date string
  createdAt: string;
  goalId?: string;
  userId?: string;
  authorName?: string;
  categoryId?: string;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
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
  goals: Goal[];
  savings: SavingEntry[];
  notifications: NotificationSettings;
  onboardingCompleted: boolean;
}

// Shared Goals
export type GoalRole = 'owner' | 'editor' | 'participant' | 'viewer';

export interface GoalMember {
  id: string;
  goalId: string;
  userId: string;
  userName?: string;
  role: GoalRole;
  joinedAt: string;
}

export interface GoalInvite {
  id: string;
  goalId: string;
  inviteCode: string;
  createdBy: string;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  createdAt: string;
}

export type ActivityAction =
  | 'joined'
  | 'left'
  | 'promoted'
  | 'demoted'
  | 'removed'
  | 'approved'
  | 'added_saving'
  | 'edited_saving'
  | 'deleted_saving'
  | 'created_invite'
  | 'edited_goal'
  | 'completed_goal';

export interface GoalActivity {
  id: string;
  goalId: string;
  userId: string;
  userName?: string;
  targetUserName?: string;
  action: ActivityAction;
  metadata?: Record<string, any>;
  createdAt: string;
}
