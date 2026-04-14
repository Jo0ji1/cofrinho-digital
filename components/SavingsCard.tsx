import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { CategoryIcon } from './CategoryIcon';
import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/calculations';
import { SavingEntry } from '../types';

interface SavingsCardProps {
  entry: SavingEntry;
  onLongPress?: () => void;
}

export function SavingsCard({ entry, onLongPress }: SavingsCardProps) {
  const { theme } = useTheme();
  const hasCategory = !!entry.categoryIcon;

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
      <View style={[styles.iconBox, { backgroundColor: (entry.categoryColor || theme.colors.primary) + '20' }]}>
        {hasCategory ? (
          <CategoryIcon icon={entry.categoryIcon!} size={22} color={entry.categoryColor || theme.colors.primary} />
        ) : (
          <Ionicons name="cash-outline" size={22} color={theme.colors.primary} />
        )}
      </View>
      <View style={styles.info}>
        <Text style={[styles.description, { color: theme.colors.text }]} numberOfLines={1}>
          {entry.description || 'Economia registrada'}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
            {formatDate(entry.date)}
          </Text>
          {entry.categoryName && (
            <View style={[styles.categoryBadge, { backgroundColor: (entry.categoryColor || '#888') + '20' }]}>
              <Text style={[styles.categoryBadgeText, { color: entry.categoryColor || '#888' }]}>
                {entry.categoryName}
              </Text>
            </View>
          )}
        </View>
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
  categoryEmoji: { fontSize: 20 },
  info: { flex: 1 },
  description: { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  date: { fontSize: 12 },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryBadgeText: { fontSize: 10, fontWeight: '600' },
  amount: { fontSize: 15, fontWeight: '700' },
});
