import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useData } from '../../contexts/DataContext';
import { maskCurrency, parseCurrency } from '../../utils/currency';
import { SavingEntry } from '../../types';
import { Colors } from '../../constants/colors';

export default function RegisterScreen() {
  const { theme } = useTheme();
  const { addSaving, goal } = useData();

  const [amountText, setAmountText] = useState('');
  const [description, setDescription] = useState('');
  const [dateText, setDateText] = useState(getTodayStr());
  const [submitting, setSubmitting] = useState(false);

  function getTodayStr() {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  function handleDateChange(text: string) {
    const digits = text.replace(/\D/g, '');
    let formatted = digits;
    if (digits.length > 2) formatted = digits.slice(0, 2) + '/' + digits.slice(2);
    if (digits.length > 4) formatted = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4, 8);
    setDateText(formatted);
  }

  function parseDate(dateStr: string): Date | null {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts.map(Number);
    if (!day || !month || !year) return null;
    const d = new Date(year, month - 1, day);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  async function handleSubmit() {
    const amount = parseCurrency(amountText);
    if (amount <= 0) {
      Alert.alert('Atenção', 'Informe um valor válido para o registro.');
      return;
    }
    const dateObj = parseDate(dateText);
    if (!dateObj) {
      Alert.alert('Atenção', 'Informe uma data válida no formato DD/MM/AAAA.');
      return;
    }

    Alert.alert(
      'Confirmar registro',
      `Registrar ${amountText} em "${description || 'Economia registrada'}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setSubmitting(true);
            try {
              const entry: SavingEntry = {
                id: Date.now().toString(),
                amount,
                description: description.trim(),
                date: dateObj.toISOString(),
                createdAt: new Date().toISOString(),
              };
              await addSaving(entry);
              setAmountText('');
              setDescription('');
              setDateText(getTodayStr());
              Alert.alert('✅ Sucesso', 'Economia registrada com sucesso!');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  }

  const s = styles(theme);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.header}>
            <Text style={[s.title, { color: theme.colors.text }]}>Registrar Economia</Text>
            {goal && (
              <Text style={[s.goalName, { color: theme.colors.textSecondary }]}>🎯 {goal.name}</Text>
            )}
          </View>

          <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={[s.amountIconBox, { backgroundColor: Colors.primary + '15' }]}>
              <Ionicons name="cash" size={32} color={Colors.primary} />
            </View>

            <Text style={[s.label, { color: theme.colors.textSecondary }]}>Valor economizado *</Text>
            <TextInput
              style={[s.input, s.bigInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              placeholder="R$ 0,00"
              placeholderTextColor={theme.colors.textSecondary}
              value={amountText}
              onChangeText={v => setAmountText(maskCurrency(v))}
              keyboardType="numeric"
            />

            <Text style={[s.label, { color: theme.colors.textSecondary }]}>Descrição (opcional)</Text>
            <TextInput
              style={[s.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              placeholder="Ex: Economizei no almoço"
              placeholderTextColor={theme.colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              maxLength={80}
            />

            <Text style={[s.label, { color: theme.colors.textSecondary }]}>Data (DD/MM/AAAA)</Text>
            <TextInput
              style={[s.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={theme.colors.textSecondary}
              value={dateText}
              onChangeText={handleDateChange}
              keyboardType="numeric"
              maxLength={10}
            />

            <TouchableOpacity
              style={[s.btn, { backgroundColor: submitting ? Colors.primaryDark : Colors.primary }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={s.btnText}>{submitting ? 'Registrando...' : 'Registrar Economia'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  goalName: { fontSize: 14 },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  amountIconBox: {
    width: 68,
    height: 68,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14, alignSelf: 'flex-start' },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    width: '100%',
  },
  bigInput: { fontSize: 22, fontWeight: '700', textAlign: 'center', paddingVertical: 16 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
    paddingVertical: 15,
    borderRadius: 14,
    width: '100%',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
