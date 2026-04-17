import { Alert, Platform } from 'react-native';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

/**
 * Cross-platform alert that works on both native and web.
 * On web, uses window.confirm/alert since RN's Alert.alert is a no-op there.
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  // Web implementation
  const full = message ? `${title}\n\n${message}` : title;
  const hasCancel = buttons && buttons.some(b => b.style === 'cancel');

  if (hasCancel && buttons && buttons.length >= 2) {
    // Two-button dialog → confirm
    const confirmed = window.confirm(full);
    if (confirmed) {
      const primary = buttons.find(b => b.style !== 'cancel');
      primary?.onPress?.();
    } else {
      const cancel = buttons.find(b => b.style === 'cancel');
      cancel?.onPress?.();
    }
    return;
  }

  // Single button dialog → alert
  window.alert(full);
  if (buttons && buttons.length > 0) {
    buttons[0].onPress?.();
  }
}
