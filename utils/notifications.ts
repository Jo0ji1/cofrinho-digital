import { NotificationSettings } from '../types';
import { storage } from './storage';

// Push notifications are not available in Expo Go (removed since SDK 53).
// This implements in-app reminder logic instead.

export async function requestNotificationPermissions(): Promise<boolean> {
  // In-app reminders don't need OS permissions — always granted
  return true;
}

export async function scheduleNotification(_settings: NotificationSettings): Promise<void> {
  // Settings are saved in DataContext; reminder check happens in-app
}

export async function cancelAllNotifications(): Promise<void> {
  // Clear last reminder timestamp
  try {
    await storage.setItem('lastReminderShown', '');
  } catch {}
}

/**
 * Check if we should show an in-app reminder based on notification settings.
 * Returns true if a reminder should be shown.
 */
export async function shouldShowReminder(settings: NotificationSettings): Promise<boolean> {
  if (!settings.enabled) return false;

  try {
    const lastShown = await storage.getItem('lastReminderShown');
    const now = new Date();

    if (!lastShown) {
      await storage.setItem('lastReminderShown', now.toISOString());
      return true;
    }

    const lastDate = new Date(lastShown);
    const hoursDiff = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);

    if (settings.frequency === 'daily' && hoursDiff >= 20) {
      await storage.setItem('lastReminderShown', now.toISOString());
      return true;
    }

    if (settings.frequency === 'weekly' && hoursDiff >= 144) { // ~6 days
      await storage.setItem('lastReminderShown', now.toISOString());
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
