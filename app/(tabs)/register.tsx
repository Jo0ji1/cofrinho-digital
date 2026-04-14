import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../components/Toast';
import { CategoryIcon } from '../../components/CategoryIcon';
import { maskCurrency, parseCurrency, formatCurrency } from '../../utils/currency';
import { SavingEntry, Category } from '../../types';
import { Colors } from '../../constants/colors';

export default function RegisterScreen() {
  const { theme } = useTheme();
  const { addSaving, activeGoal, goals, savings, categories } = useData();
  const { show } = useToast();

  const [amountText, setAmountText] = useState('');
  const [description, setDescription] = useState('');
  const [dateText, setDateText] = useState(getTodayStr());
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Last saving for quick-add
  const lastSaving = useMemo(() => {
    if (!savings.length || !activeGoal) return null;
    const goalSavings = savings.filter(s => !s.goalId || s.goalId === activeGoal.id);
    return goalSavings[0] || null;
  }, [savings, activeGoal]);

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

  function handleQuickAdd() {
    if (!lastSaving) return;
    setAmountText(maskCurrency(lastSaving.amount.toFixed(2).replace('.', ',')));
    setDescription(lastSaving.description || '');
    const cat = categories.find(c => c.id === lastSaving.categoryId) || null;
    setSelectedCategory(cat);
    show({ type: 'info', title: 'Preenchido!', message: 'Dados do último registro aplicados.' });
  }

  async function handleSubmit() {
    const amount = parseCurrency(amountText);
    if (amount <= 0) {
      show({ type: 'warning', title: 'Atenção', message: 'Informe um valor válido para o registro.' });
      return;
    }
    const dateObj = parseDate(dateText);
    if (!dateObj) {
      show({ type: 'warning', title: 'Atenção', message: 'Informe uma data válida no formato DD/MM/AAAA.' });
      return;
    }

    setSubmitting(true);
    try {
      const entry: SavingEntry = {
        id: Date.now().toString(),
        amount,
        description: description.trim(),
        date: dateObj.toISOString(),
        createdAt: new Date().toISOString(),
        goalId: activeGoal?.id,
        categoryId: selectedCategory?.id,
        categoryName: selectedCategory?.name,
        categoryIcon: selectedCategory?.icon,
        categoryColor: selectedCategory?.color,
      };
      await addSaving(entry);
      setAmountText('');
      setDescription('');
      setDateText(getTodayStr());
      setSelectedCategory(null);
      show({ type: 'success', title: 'Sucesso', message: 'Economia registrada com sucesso!' });
    } catch {
      show({ type: 'error', title: 'Erro', message: 'Não foi possível registrar a economia.' });
    } finally {
      setSubmitting(false);
    }
  }

  const s = styles(theme);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.header}>
            <Text style={[s.title, { color: theme.colors.text }]}>Registrar Economia</Text>
            {activeGoal && (
              <Text style={[s.goalName, { color: theme.colors.textSecondary }]}>🎯 {activeGoal.name}</Text>
            )}
            {goals.length > 1 && (
              <Text style={[s.goalHint, { color: theme.colors.textSecondary }]}>
                Troque de objetivo no Dashboard
              </Text>
            )}
          </View>

          {/* Quick Add */}
          {lastSaving && (
            <TouchableOpacity
              style={[s.quickAdd, { backgroundColor: Colors.primary + '10', borderColor: Colors.primary + '40' }]}
              onPress={handleQuickAdd}
              activeOpacity={0.7}
            >
              <Ionicons name="flash" size={18} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[s.quickAddTitle, { color: Colors.primary }]}>Repetir último registro</Text>
                <Text style={[s.quickAddDesc, { color: theme.colors.textSecondary }]}>
                  {formatCurrency(lastSaving.amount)} - {lastSaving.description || lastSaving.categoryName || 'Economia'}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
            </TouchableOpacity>
          )}

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

            <Text style={[s.label, { color: theme.colors.textSecondary }]}>Categoria</Text>
            <View style={s.categoryGrid}>
              {categories.map(cat => {
                const isSelected = selectedCategory?.id === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      s.categoryChip,
                      {
                        backgroundColor: isSelected ? cat.color + '30' : theme.colors.background,
                        borderColor: isSelected ? cat.color : theme.colors.border,
                      },
                    ]}
                    onPress={() => setSelectedCategory(isSelected ? null : cat)}
                    activeOpacity={0.7}
                  >
                    <CategoryIcon icon={cat.icon} size={16} color={isSelected ? cat.color : theme.colors.textSecondary} />
                    <Text style={[s.categoryText, { color: isSelected ? cat.color : theme.colors.textSecondary }]} numberOfLines={1}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

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
  goalHint: { fontSize: 11, marginTop: 2 },
  quickAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  quickAddTitle: { fontSize: 13, fontWeight: '700' },
  quickAddDesc: { fontSize: 12, marginTop: 2 },
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 4,
  },
  categoryIcon: { fontSize: 16 },
  categoryText: { fontSize: 12, fontWeight: '600' },
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
