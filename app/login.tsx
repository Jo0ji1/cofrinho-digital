import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { Colors } from '../constants/colors';

export default function LoginScreen() {
  const { theme } = useTheme();
  const { signIn, signInWithGoogle } = useAuth();
  const { show } = useToast();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      show({ type: 'warning', title: 'Atenção', message: 'Preencha email e senha.' });
      return;
    }
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      show({ type: 'error', title: 'Erro ao entrar', message: error });
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) {
      show({ type: 'error', title: 'Erro ao entrar', message: error });
    }
  }

  const s = styles(theme);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.header}>
            <View style={s.iconWrap}>
              <Ionicons name="wallet" size={48} color="#fff" />
            </View>
            <Text style={s.title}>Cofry</Text>
            <Text style={[s.subtitle, { color: theme.colors.textSecondary }]}>Entre na sua conta para continuar</Text>
          </View>

          <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[s.label, { color: theme.colors.textSecondary }]}>Email</Text>
            <TextInput
              style={[s.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              placeholder="seu@email.com"
              placeholderTextColor={theme.colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              accessibilityLabel="Campo de email"
            />

            <Text style={[s.label, { color: theme.colors.textSecondary }]}>Senha</Text>
            <View style={s.passwordRow}>
              <TextInput
                style={[s.input, s.passwordInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                placeholder="Sua senha"
                placeholderTextColor={theme.colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
                accessibilityLabel="Campo de senha"
              />
              <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => router.push('/forgot-password')}>
              <Text style={[s.forgotText, { color: Colors.primary }]}>Esqueci minha senha</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.btn, { backgroundColor: loading ? Colors.primaryDark : Colors.primary }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={20} color="#fff" />
                  <Text style={s.btnText}>Entrar</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={s.dividerRow}>
              <View style={[s.dividerLine, { backgroundColor: theme.colors.border }]} />
              <Text style={[s.dividerText, { color: theme.colors.textSecondary }]}>ou</Text>
              <View style={[s.dividerLine, { backgroundColor: theme.colors.border }]} />
            </View>

            <TouchableOpacity
              style={[s.googleBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              onPress={handleGoogleLogin}
              disabled={googleLoading}
              activeOpacity={0.85}
            >
              {googleLoading ? (
                <ActivityIndicator color={theme.colors.text} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#DB4437" />
                  <Text style={[s.googleBtnText, { color: theme.colors.text }]}>Entrar com Google</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={s.registerRow}>
              <Text style={[s.registerText, { color: theme.colors.textSecondary }]}>Não tem conta? </Text>
              <TouchableOpacity onPress={() => router.push('/register-account')}>
                <Text style={[s.registerLink, { color: Colors.primary }]}>Criar conta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 40, justifyContent: 'center', flexGrow: 1 },
  header: { alignItems: 'center', marginBottom: 28 },
  iconWrap: {
    width: 88, height: 88, borderRadius: 28, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.primary, marginBottom: 8 },
  subtitle: { fontSize: 15, textAlign: 'center' },
  card: { borderRadius: 20, padding: 22, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, width: '100%' },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 44 },
  eyeBtn: { position: 'absolute', right: 12, top: 12 },
  forgotText: { fontSize: 13, fontWeight: '600', marginTop: 8, textAlign: 'right' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, paddingVertical: 15, borderRadius: 14, width: '100%' },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 4 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12, fontSize: 13, fontWeight: '500' },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, width: '100%' },
  googleBtnText: { fontSize: 16, fontWeight: '600' },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  registerText: { fontSize: 14 },
  registerLink: { fontSize: 14, fontWeight: '700' },
});
