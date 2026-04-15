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

export default function RegisterAccountScreen() {
  const { theme } = useTheme();
  const { signUp, signInWithGoogle } = useAuth();
  const { show } = useToast();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSignUp() {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) {
      show({ type: 'error', title: 'Erro ao entrar', message: error });
    }
  }

  async function handleRegister() {
    if (!name.trim()) {
      show({ type: 'warning', title: 'Atenção', message: 'Informe seu nome.' });
      return;
    }
    if (!email.trim()) {
      show({ type: 'warning', title: 'Atenção', message: 'Informe seu email.' });
      return;
    }
    if (password.length < 6) {
      show({ type: 'warning', title: 'Atenção', message: 'A senha deve ter pelo menos 6 caracteres.' });
      return;
    }
    if (password !== confirmPassword) {
      show({ type: 'warning', title: 'Atenção', message: 'As senhas não coincidem.' });
      return;
    }

    setLoading(true);
    const { error } = await signUp(email.trim(), password, name.trim());
    setLoading(false);

    if (error) {
      show({ type: 'error', title: 'Erro ao criar conta', message: error });
    } else {
      show({ type: 'success', title: 'Conta criada!', message: 'Verifique seu email para confirmar o cadastro, depois faça login.' });
      setTimeout(() => router.back(), 2000);
    }
  }

  const s = styles(theme);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.header}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[s.title, { color: theme.colors.text }]}>Criar Conta</Text>
            <Text style={[s.subtitle, { color: theme.colors.textSecondary }]}>
              Preencha seus dados para começar a usar o Cofrinho Digital
            </Text>
          </View>

          <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[s.label, { color: theme.colors.textSecondary }]}>Nome</Text>
            <TextInput
              style={[s.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              placeholder="Seu nome"
              placeholderTextColor={theme.colors.textSecondary}
              value={name}
              onChangeText={setName}
              maxLength={40}
              accessibilityLabel="Campo de nome"
            />

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
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={theme.colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[s.label, { color: theme.colors.textSecondary }]}>Confirmar senha</Text>
            <TextInput
              style={[s.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              placeholder="Repita a senha"
              placeholderTextColor={theme.colors.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
            />

            <TouchableOpacity
              style={[s.btn, { backgroundColor: loading ? Colors.primaryDark : Colors.primary }]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={20} color="#fff" />
                  <Text style={s.btnText}>Criar Conta</Text>
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
              onPress={handleGoogleSignUp}
              disabled={googleLoading}
              activeOpacity={0.85}
            >
              {googleLoading ? (
                <ActivityIndicator color={theme.colors.text} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#DB4437" />
                  <Text style={[s.googleBtnText, { color: theme.colors.text }]}>Cadastrar com Google</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={s.loginRow}>
              <Text style={[s.loginText, { color: theme.colors.textSecondary }]}>Já tem conta? </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={[s.loginLink, { color: Colors.primary }]}>Fazer login</Text>
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
  scroll: { padding: 24, paddingBottom: 40 },
  header: { marginBottom: 20, marginTop: 8 },
  backBtn: { marginBottom: 16, width: 36 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  card: { borderRadius: 20, padding: 22, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, width: '100%' },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 44 },
  eyeBtn: { position: 'absolute', right: 12, top: 12 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, paddingVertical: 15, borderRadius: 14, width: '100%' },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 4 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12, fontSize: 13, fontWeight: '500' },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, width: '100%' },
  googleBtnText: { fontSize: 16, fontWeight: '600' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  loginText: { fontSize: 14 },
  loginLink: { fontSize: 14, fontWeight: '700' },
});
