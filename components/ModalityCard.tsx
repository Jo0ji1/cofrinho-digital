import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { formatCurrency } from '../utils/currency';
import { ModalityInfo } from '../types';
import { Colors } from '../constants/colors';

interface ModalityCardProps {
  modality: ModalityInfo;
  selected: boolean;
  onSelect: () => void;
}

export function ModalityCard({ modality, selected, onSelect }: ModalityCardProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: selected ? Colors.primary + '15' : theme.colors.card,
          borderColor: selected ? Colors.primary : theme.colors.border,
        },
      ]}
      onPress={onSelect}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: selected ? Colors.primary : theme.colors.border }]}>
          <Ionicons name={modality.icon as any} size={20} color={selected ? '#fff' : theme.colors.textSecondary} />
        </View>
        <View style={styles.titleBox}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{modality.title}</Text>
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{modality.description}</Text>
        </View>
        {selected && <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />}
      </View>
      <View style={[styles.amountRow, { borderTopColor: theme.colors.border }]}>
        <Text style={[styles.amountLabel, { color: theme.colors.textSecondary }]}>Sugerido:</Text>
        <Text style={[styles.amount, { color: Colors.primary }]}>
          {formatCurrency(modality.suggestedAmount)} <Text style={styles.period}>{modality.period}</Text>
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  titleBox: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  description: { fontSize: 12 },
  amountRow: { borderTopWidth: 1, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountLabel: { fontSize: 13 },
  amount: { fontSize: 15, fontWeight: '700' },
  period: { fontSize: 12, fontWeight: '400' },
});
