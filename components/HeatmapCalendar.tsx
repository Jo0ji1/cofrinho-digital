import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SavingEntry } from '../types';

const WEEKS = 13;
const DAYS = 7;
const CELL_SIZE = 14;
const GAP = 3;
const INTENSITY_DARK = ['#2A2A2E', '#064E3B', '#059669', '#10B981', '#34D399'];
const INTENSITY_LIGHT = ['#F3F4F6', '#D1FAE5', '#6EE7B7', '#34D399', '#059669'];
const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface Props {
  readonly savings: SavingEntry[];
  readonly isDark: boolean;
  readonly theme: any;
}

export function HeatmapCalendar({ savings, isDark, theme }: Props) {
  const grid = useMemo(() => {
    const dateMap: Record<string, number> = {};
    savings.forEach(s => {
      const key = s.date.split('T')[0];
      dateMap[key] = (dateMap[key] || 0) + s.amount;
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();

    const start = new Date(today);
    start.setDate(start.getDate() - (WEEKS * 7) - dayOfWeek + 1);

    const cells: { date: string; amount: number; col: number; row: number }[] = [];
    const d = new Date(start);

    for (let col = 0; col < WEEKS; col++) {
      for (let row = 0; row < DAYS; row++) {
        const key = d.toISOString().split('T')[0];
        cells.push({ date: key, amount: dateMap[key] || 0, col, row });
        d.setDate(d.getDate() + 1);
      }
    }

    const amounts = cells.map(c => c.amount).filter(a => a > 0);
    const maxAmount = Math.max(...amounts, 1);

    return cells.map(c => {
      let level = 0;
      if (c.amount > 0) {
        if (c.amount <= maxAmount * 0.25) level = 1;
        else if (c.amount <= maxAmount * 0.5) level = 2;
        else if (c.amount <= maxAmount * 0.75) level = 3;
        else level = 4;
      }
      return { ...c, level };
    });
  }, [savings]);

  const colors = isDark ? INTENSITY_DARK : INTENSITY_LIGHT;
  const totalWidth = WEEKS * (CELL_SIZE + GAP);

  const monthLabels = useMemo(() => {
    const labels: { text: string; col: number }[] = [];
    let lastMonth = -1;

    for (let col = 0; col < WEEKS; col++) {
      const cell = grid.find(c => c.col === col && c.row === 0);
      if (cell) {
        const month = new Date(cell.date).getMonth();
        if (month !== lastMonth) {
          labels.push({ text: MONTH_NAMES[month], col });
          lastMonth = month;
        }
      }
    }
    return labels;
  }, [grid]);

  const activeDays = grid.filter(c => c.amount > 0).length;

  return (
    <View>
      <View style={[ss.statsRow]}>
        <Text style={[ss.statItem, { color: theme.colors.text }]}>
          <Text style={{ fontWeight: '800' }}>{activeDays}</Text> dias ativos
        </Text>
        <Text style={[ss.statItem, { color: Colors.primary }]}>
          Últimos 3 meses
        </Text>
      </View>

      <View style={ss.gridContainer}>
        <View style={[ss.monthRow, { width: totalWidth }]}>
          {monthLabels.map((l) => (
            <Text
              key={`${l.text}-${l.col}`}
              style={[ss.monthLabel, { left: l.col * (CELL_SIZE + GAP), color: theme.colors.textSecondary }]}
            >
              {l.text}
            </Text>
          ))}
        </View>

        <View style={[ss.grid, { width: totalWidth, height: DAYS * (CELL_SIZE + GAP) }]}>
          {grid.map((cell) => (
            <View
              key={cell.date}
              style={[
                ss.cell,
                {
                  left: cell.col * (CELL_SIZE + GAP),
                  top: cell.row * (CELL_SIZE + GAP),
                  backgroundColor: colors[cell.level],
                },
              ]}
            />
          ))}
        </View>

        <View style={ss.legend}>
          <Text style={[ss.legendText, { color: theme.colors.textSecondary }]}>Menos</Text>
          {colors.map((c) => (
            <View key={c} style={[ss.legendCell, { backgroundColor: c }]} />
          ))}
          <Text style={[ss.legendText, { color: theme.colors.textSecondary }]}>Mais</Text>
        </View>
      </View>
    </View>
  );
}

import { Colors } from '../constants/colors';

const ss = StyleSheet.create({
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statItem: { fontSize: 13 },
  gridContainer: { alignItems: 'center' },
  monthRow: { height: 16, position: 'relative', marginBottom: 4 },
  monthLabel: { position: 'absolute', fontSize: 10 },
  grid: { position: 'relative' },
  cell: {
    position: 'absolute',
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 3,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 8,
    justifyContent: 'flex-end',
  },
  legendText: { fontSize: 10, marginHorizontal: 2 },
  legendCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 3,
  },
});
