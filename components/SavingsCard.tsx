import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/calculations';
import { SavingEntry } from '../types';

interface SavingsCardProps {
  entry: SavingEntry;
  onLongPress?: () => void;
}

export function SavingsCard({ entry, onLongPress }: SavingsCardProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          shadowColor: theme.dark ? 'transparent' : '#000',
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '20' }]}>
        <Ionicons name="cash-outline" size={22} color={theme.colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.description, { color: theme.colors.text }]} numberOfLines={1}>
          {entry.description || 'Economia registrada'}
        </Text>
        <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
          {formatDate(entry.date)}
        </Text>
      </View>
      <Text style={[styles.amount, { color: theme.colors.primary }]}>
        {formatCurrency(entry.amount)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: { flex: 1 },
  description: { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  date: { fontSize: 12 },
  amount: { fontSize: 15, fontWeight: '700' },
});
