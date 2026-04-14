import { NotificationSettings } from '../types';

// Notifications are not available in Expo Go (removed since SDK 53).
// These are stubs that will gracefully no-op.
// To enable real notifications, use a development build.

export async function requestNotificationPermissions(): Promise<boolean> {
  console.warn('Push notifications are not available in Expo Go. Use a development build.');
  return false;
}

export async function scheduleNotification(_settings: NotificationSettings): Promise<void> {
  // no-op in Expo Go
}

export async function cancelAllNotifications(): Promise<void> {
  // no-op in Expo Go
}
