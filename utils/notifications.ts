import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { NotificationSettings } from '../types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) return false;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }
  return true;
}

export async function scheduleNotification(settings: NotificationSettings): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!settings.enabled) return;

  const trigger: Notifications.NotificationTriggerInput = settings.frequency === 'daily'
    ? {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: settings.hour,
        minute: settings.minute,
      }
    : {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 2, // expo-notifications: 1=Sunday, 2=Monday, …, 7=Saturday
        hour: settings.hour,
        minute: settings.minute,
      };

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '💰 Cofrinho Digital',
      body: 'Não esqueça de registrar sua economia de hoje!',
    },
    trigger,
  });
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
