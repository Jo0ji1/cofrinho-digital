import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../components/Toast';
import { maskCurrency, parseCurrency } from '../utils/currency';
import { Goal } from '../types';
import { Colors } from '../constants/colors';

const MIN_VALID_YEAR = 2000;

export default function OnboardingScreen() {
  const { theme } = useTheme();
  const { setGoal } = useData();
  const { show } = useToast();
  const router = useRouter();

  const [userName, setUserName] = useState('');
  const [goalName, setGoalName] = useState('');
  const [targetAmountText, setTargetAmountText] = useState('');
  const [targetDate, setTargetDate] = useState('');

  function handleAmountChange(text: string) {
    setTargetAmountText(maskCurrency(text));
  }

  function handleDateChange(text: string) {
    // Auto-format DD/MM/YYYY
    const digits = text.replace(/\D/g, '');
    let formatted = digits;
    if (digits.length > 2) formatted = digits.slice(0, 2) + '/' + digits.slice(2);
    if (digits.length > 4) formatted = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4, 8);
    setTargetDate(formatted);
  }

  function parseDate(dateStr: string): Date | null {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts.map(Number);
    if (!day || !month || !year || year < MIN_VALID_YEAR) return null;
    const d = new Date(year, month - 1, day);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  async function handleSubmit() {
    if (!goalName.trim()) {
      show({ type: 'warning', title: 'Atenção', message: 'Por favor, informe o nome do seu objetivo.' });
      return;
    }
    const amount = parseCurrency(targetAmountText);
    if (amount <= 0) {
      show({ type: 'warning', title: 'Atenção', message: 'Por favor, informe um valor válido para o objetivo.' });
      return;
    }
    const dateObj = parseDate(targetDate);
    if (!dateObj) {
      show({ type: 'warning', title: 'Atenção', message: 'Por favor, informe uma data válida no formato DD/MM/AAAA.' });
      return;
    }
    if (dateObj <= new Date()) {
      show({ type: 'warning', title: 'Atenção', message: 'A data do objetivo deve ser futura.' });
      return;
    }

    const goal: Goal = {
      id: Date.now().toString(),
      name: goalName.trim(),
      userName: userName.trim() || 'Você',
      targetAmount: amount,
      targetDate: dateObj.toISOString(),
      createdAt: new Date().toISOString(),
      activeModality: 'daily',
    };

    await setGoal(goal);
    router.push('/modalities');
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
            <Text style={s.subtitle}>Defina seu objetivo de economia e comece a poupar hoje mesmo!</Text>
          </View>

          <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[s.sectionTitle, { color: theme.colors.text }]}>Vamos começar!</Text>

            <Text style={[s.label, { color: theme.colors.textSecondary }]}>Seu nome (opcional)</Text>
            <TextInput
              style={[s.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              placeholder="Ex: João Silva"
              placeholderTextColor={theme.colors.textSecondary}
              value={userName}
              onChangeText={setUserName}
              maxLength={40}
            />

            <Text style={[s.label, { color: theme.colors.textSecondary }]}>Qual é o seu objetivo?</Text>
            <TextInput
              style={[s.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              placeholder="Ex: Viagem para o Japão"
              placeholderTextColor={theme.colors.textSecondary}
              value={goalName}
              onChangeText={setGoalName}
              maxLength={60}
            />

            <Text style={[s.label, { color: theme.colors.textSecondary }]}>Quanto você quer juntar?</Text>
            <TextInput
              style={[s.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              placeholder="R$ 0,00"
              placeholderTextColor={theme.colors.textSecondary}
              value={targetAmountText}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
            />

            <Text style={[s.label, { color: theme.colors.textSecondary }]}>Até quando? (DD/MM/AAAA)</Text>
            <TextInput
              style={[s.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              placeholder="Ex: 31/12/2025"
              placeholderTextColor={theme.colors.textSecondary}
              value={targetDate}
              onChangeText={handleDateChange}
              keyboardType="numeric"
              maxLength={10}
            />

            <TouchableOpacity style={[s.btn, { backgroundColor: Colors.primary }]} onPress={handleSubmit} activeOpacity={0.85}>
              <Text style={s.btnText}>Continuar</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 28, marginTop: 16 },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.primary, marginBottom: 8 },
  subtitle: { fontSize: 15, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  card: {
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 26,
    paddingVertical: 15,
    borderRadius: 14,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
