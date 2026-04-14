import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

type ToastType = 'error' | 'success' | 'warning' | 'info';

interface ToastData {
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  show: (data: ToastData) => void;
}

const ToastContext = createContext<ToastContextType>({ show: () => {} });

const ICONS: Record<ToastType, string> = {
  error: 'close-circle',
  success: 'checkmark-circle',
  warning: 'warning',
  info: 'information-circle',
};

const BG_COLORS: Record<ToastType, string> = {
  error: '#FEF2F2',
  success: '#F0FDF4',
  warning: '#FFFBEB',
  info: '#EFF6FF',
};

const BORDER_COLORS: Record<ToastType, string> = {
  error: '#FECACA',
  success: '#BBF7D0',
  warning: '#FDE68A',
  info: '#BFDBFE',
};

const ICON_COLORS: Record<ToastType, string> = {
  error: Colors.error,
  success: Colors.success,
  warning: Colors.warning,
  info: Colors.info,
};

const AUTO_DISMISS_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-40)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -40, duration: 250, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [opacity, translateY]);

  const show = useCallback((data: ToastData) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(data);
    opacity.setValue(0);
    translateY.setValue(-40);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
    timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);
  }, [opacity, translateY, dismiss]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            s.container,
            {
              backgroundColor: BG_COLORS[toast.type],
              borderColor: BORDER_COLORS[toast.type],
              opacity,
              transform: [{ translateY }],
            },
          ]}
          pointerEvents="box-none"
        >
          <TouchableOpacity style={s.inner} activeOpacity={0.8} onPress={dismiss}>
            <Ionicons name={ICONS[toast.type] as any} size={22} color={ICON_COLORS[toast.type]} />
            <View style={s.textWrap}>
              <Text style={[s.title, { color: ICON_COLORS[toast.type] }]}>{toast.title}</Text>
              {toast.message ? (
                <Text style={s.message}>{toast.message}</Text>
              ) : null}
            </View>
            <Ionicons name="close" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 60,
    left: 16,
    right: 16,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 99999,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  textWrap: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700' },
  message: { fontSize: 13, color: '#4B5563', marginTop: 2, lineHeight: 18 },
});
