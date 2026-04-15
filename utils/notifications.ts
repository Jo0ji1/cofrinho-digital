import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NotificationSettings } from '../types';
import { storage } from './storage';

// Configurar comportamento de notificações em foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const TIPS = [
  '💡 Guarde o troco de cada compra — pequenos valores somam!',
  '💡 Antes de comprar algo, espere 24h. Se ainda quiser, compre.',
  '💡 Cozinhar em casa pode economizar até 60% comparado a comer fora.',
  '💡 Cancele assinaturas que você não usa há mais de 1 mês.',
  '💡 Defina um "dia sem gastar" por semana. Seu cofrinho agradece!',
  '💡 Leve marmita para o trabalho — economia + saúde.',
  '💡 Compare preços antes de comprar. Use apps de comparação.',
  '💡 Evite compras por impulso: faça lista antes de ir ao mercado.',
  '💡 Guarde 10% de tudo que receber — pague-se primeiro.',
  '💡 Use transporte público ou carona quando possível.',
  '💡 Compre no atacado itens que você usa muito.',
  '💡 Negocie descontos — o não você já tem!',
  '💡 Troque marcas caras por similares mais baratas.',
  '💡 Faça café em casa em vez de comprar na rua.',
  '💡 Revise seus gastos toda semana — consciência é o 1º passo.',
];

function getRandomTip(): string {
  return TIPS[Math.floor(Math.random() * TIPS.length)];
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleNotification(settings: NotificationSettings): Promise<void> {
  if (Platform.OS === 'web') return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!settings.enabled) return;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  if (settings.frequency === 'daily') {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💰 Hora de economizar!',
        body: getRandomTip(),
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: settings.hour,
        minute: settings.minute,
      },
    });
  } else {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📊 Resumo semanal',
        body: 'Como foi sua semana de economias? Abra o app e confira seu progresso!',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 2,
        hour: settings.hour,
        minute: settings.minute,
      },
    });
  }
}

export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS !== 'web') {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
  try {
    await storage.setItem('lastReminderShown', '');
  } catch {}
}

/**
 * Fallback: in-app reminder for when push notification permission is denied.
 */
export async function shouldShowReminder(settings: NotificationSettings): Promise<boolean> {
  if (!settings.enabled) return false;

  // Se push notifications estão ativas no nativo, pula reminder in-app
  if (Platform.OS !== 'web') {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return false;
  }

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

    if (settings.frequency === 'weekly' && hoursDiff >= 144) {
      await storage.setItem('lastReminderShown', now.toISOString());
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
