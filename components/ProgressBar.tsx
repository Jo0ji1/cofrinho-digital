import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Colors } from '../constants/colors';

interface ProgressBarProps {
  progress: number; // 0 to 1
  height?: number;
  showLabel?: boolean;
  label?: string;
}

export function ProgressBar({ progress, height = 12, showLabel = true, label }: ProgressBarProps) {
  const { theme } = useTheme();
  const pct = Math.round(progress * 100);

  return (
    <View style={styles.container}>
      {showLabel && (
        <View style={styles.labelRow}>
          {label ? <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text> : <View />}
          <Text style={[styles.pct, { color: theme.colors.primary }]}>{pct}%</Text>
        </View>
      )}
      <View style={[styles.track, { height, backgroundColor: theme.colors.border }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${pct}%`,
              height,
              backgroundColor: pct >= 100 ? Colors.accent : Colors.primary,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 13 },
  pct: { fontSize: 13, fontWeight: '700' },
  track: { borderRadius: 99, overflow: 'hidden', backgroundColor: '#E5E7EB' },
  fill: { borderRadius: 99 },
});
