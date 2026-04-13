import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useData } from '../../contexts/DataContext';
import { useSavings, FilterPeriod } from '../../hooks/useSavings';
import { SavingsCard } from '../../components/SavingsCard';
import { formatCurrency } from '../../utils/currency';
import { Colors } from '../../constants/colors';
import { SavingEntry } from '../../types';

const FILTERS: { label: string; value: FilterPeriod }[] = [
  { label: 'Tudo', value: 'all' },
  { label: 'Semana', value: 'week' },
  { label: 'Mês', value: 'month' },
];

export default function HistoryScreen() {
  const { theme } = useTheme();
  const { deleteSaving } = useData();
  const [filter, setFilter] = useState<FilterPeriod>('all');
  const { savings, total } = useSavings(filter);

  function handleDelete(entry: SavingEntry) {
    Alert.alert(
      'Excluir registro',
      `Excluir "${entry.description || 'Economia registrada'}" de ${formatCurrency(entry.amount)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => deleteSaving(entry.id) },
      ],
    );
  }

  const s = styles(theme);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.colors.background }]}>
      <View style={s.container}>
        <Text style={[s.title, { color: theme.colors.text }]}>Histórico</Text>

        {/* Filters */}
        <View style={s.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.value}
              style={[
                s.filterBtn,
                {
                  backgroundColor: filter === f.value ? Colors.primary : theme.colors.card,
                  borderColor: filter === f.value ? Colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setFilter(f.value)}
              activeOpacity={0.8}
            >
              <Text style={[s.filterText, { color: filter === f.value ? '#fff' : theme.colors.textSecondary }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Total */}
        <View style={[s.totalCard, { backgroundColor: Colors.primary + '15', borderColor: Colors.primary + '30' }]}>
          <Text style={[s.totalLabel, { color: theme.colors.textSecondary }]}>Total economizado</Text>
          <Text style={[s.totalValue, { color: Colors.primary }]}>{formatCurrency(total)}</Text>
        </View>

        {/* List */}
        {savings.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="receipt-outline" size={52} color={theme.colors.textSecondary} />
            <Text style={[s.emptyText, { color: theme.colors.textSecondary }]}>Nenhum registro encontrado.</Text>
            <Text style={[s.emptySubText, { color: theme.colors.textSecondary }]}>
              Vá para "Registrar" para adicionar sua primeira economia!
            </Text>
          </View>
        ) : (
          <FlatList
            data={savings}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <SavingsCard
                entry={item}
                onLongPress={() => handleDelete(item)}
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 16 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filterBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  filterText: { fontSize: 13, fontWeight: '600' },
  totalCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: { fontSize: 14 },
  totalValue: { fontSize: 20, fontWeight: '800' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingBottom: 60 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptySubText: { fontSize: 13, textAlign: 'center', lineHeight: 20, maxWidth: 240 },
});
