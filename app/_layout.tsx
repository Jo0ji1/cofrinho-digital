import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { DataProvider, useData } from '../contexts/DataContext';
import { ToastProvider } from '../components/Toast';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function RootNavigator() {
  const { onboardingCompleted, isLoading: dataLoading } = useData();
  const { user, isLoading: authLoading, isConfigured } = useAuth();
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const segments = useSegments();

  const isLoading = dataLoading || authLoading;

  useEffect(() => {
    if (isLoading) return;

    const inAuth = segments[0] === 'login' || segments[0] === 'register-account' || segments[0] === 'forgot-password';
    const inOnboarding = segments[0] === 'onboarding';
    const inModalities = segments[0] === 'modalities';

    // Se Supabase configurado e não logado, vai para login
    if (isConfigured && !user && !inAuth) {
      router.replace('/login');
      return;
    }

    // Se logado (ou sem Supabase) e não completou onboarding
    if ((!isConfigured || user) && !onboardingCompleted && !inOnboarding && !inModalities && !inAuth) {
      router.replace('/onboarding');
      return;
    }

    // Se logado e completou onboarding mas está em auth ou onboarding
    if ((!isConfigured || user) && onboardingCompleted && (inOnboarding || inAuth)) {
      router.replace('/(tabs)');
    }
  }, [user, onboardingCompleted, isLoading, segments, isConfigured]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register-account" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="modalities" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <DataProvider>
            <ToastProvider>
              <RootNavigator />
            </ToastProvider>
          </DataProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
