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

export default function ForgotPasswordScreen() {
  const { theme } = useTheme();
  const { resetPassword } = useAuth();
  const { show } = useToast();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset() {
    if (!email.trim()) {
      show({ type: 'warning', title: 'Atenção', message: 'Informe seu email.' });
      return;
    }
    setLoading(true);
    const { error } = await resetPassword(email.trim());
    setLoading(false);
    if (error) {
      show({ type: 'error', title: 'Erro', message: error });
    } else {
      setSent(true);
    }
  }

  const s = styles(theme);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={s.header}>
            <Ionicons name="lock-open-outline" size={56} color={Colors.primary} />
            <Text style={[s.title, { color: theme.colors.text }]}>Recuperar Senha</Text>
          </View>

          {sent ? (
            <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.primary} style={{ alignSelf: 'center' }} />
              <Text style={[s.sentTitle, { color: theme.colors.text }]}>Email enviado!</Text>
              <Text style={[s.sentText, { color: theme.colors.textSecondary }]}>
                Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
              </Text>
              <TouchableOpacity style={[s.btn, { backgroundColor: Colors.primary }]} onPress={() => router.back()}>
                <Text style={s.btnText}>Voltar ao login</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[s.desc, { color: theme.colors.textSecondary }]}>
                Informe o email da sua conta e enviaremos instruções para redefinir sua senha.
              </Text>
              <Text style={[s.label, { color: theme.colors.textSecondary }]}>Email</Text>
              <TextInput
                style={[s.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                placeholder="seu@email.com"
                placeholderTextColor={theme.colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[s.btn, { backgroundColor: loading ? Colors.primaryDark : Colors.primary }]}
                onPress={handleReset}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Enviar email</Text>}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 40 },
  backBtn: { marginBottom: 16, width: 36 },
  header: { alignItems: 'center', marginBottom: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '800' },
  card: { borderRadius: 20, padding: 22, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  desc: { fontSize: 14, lineHeight: 22, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, width: '100%' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, paddingVertical: 15, borderRadius: 14, width: '100%' },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  sentTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginTop: 12 },
  sentText: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginTop: 8 },
});
