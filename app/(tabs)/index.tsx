import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useGoal } from '../../hooks/useGoal';
import { useData } from '../../contexts/DataContext';
import { ProgressBar } from '../../components/ProgressBar';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/calculations';
import { Colors } from '../../constants/colors';
import { Achievements } from '../../components/Achievements';

const SCREEN_WIDTH = Dimensions.get('window').width;

const MODALITY_LABELS: Record<string, string> = {
  daily: 'Diária',
  weekly: 'Semanal Progressivo',
  monthly: 'Mensal',
};

export default function HomeScreen() {
  const { theme, isDark } = useTheme();
  const data = useGoal();
  const { savings, categories } = useData();

  const chartData = useMemo(() => {
    if (!savings.length) return null;
    const sorted = [...savings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const last7 = sorted.slice(-7);
    let cum = 0;
    const labels: string[] = [];
    const values: number[] = [];
    last7.forEach(e => {
      cum += e.amount;
      const d = new Date(e.date);
      labels.push(`${d.getDate()}/${d.getMonth() + 1}`);
      values.push(parseFloat(cum.toFixed(2)));
    });
    if (values.length === 1) {
      labels.unshift('');
      values.unshift(0);
    }
    return { labels, datasets: [{ data: values }] };
  }, [savings]);

  const categoryStats = useMemo(() => {
    if (!savings.length) return [];
    const map: Record<string, { name: string; icon: string; color: string; total: number }> = {};
    savings.forEach(s => {
      const key = s.categoryName || 'Sem categoria';
      if (!map[key]) {
        map[key] = {
          name: key,
          icon: s.categoryIcon || '📌',
          color: s.categoryColor || '#B0B0B0',
          total: 0,
        };
      }
      map[key].total += s.amount;
    });
    const list = Object.values(map).sort((a, b) => b.total - a.total);
    const max = list[0]?.total || 1;
    return list.map(c => ({ ...c, pct: c.total / max }));
  }, [savings]);

  const s = styles(theme);

  if (!data.goal) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: theme.colors.background }]}>
        <View style={s.emptyContainer}>
          <Ionicons name="wallet-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={[s.emptyText, { color: theme.colors.textSecondary }]}>Nenhum objetivo definido.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { goal, totalSaved, daysRemaining, progress, remaining, suggestedAmount } = data;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.headerRow}>
          <View>
            <Text style={[s.greeting, { color: theme.colors.textSecondary }]}>Olá, {goal.userName}! 👋</Text>
            <Text style={[s.goalName, { color: theme.colors.text }]} numberOfLines={1}>{goal.name}</Text>
          </View>
          <View style={[s.walletIcon, { backgroundColor: Colors.primary + '20' }]}>
            <Ionicons name="wallet" size={26} color={Colors.primary} />
          </View>
        </View>

        {/* Progress Card */}
        <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[s.cardTitle, { color: theme.colors.textSecondary }]}>Progresso do objetivo</Text>
          <View style={s.amountRow}>
            <View>
              <Text style={[s.savedAmount, { color: Colors.primary }]}>{formatCurrency(totalSaved)}</Text>
              <Text style={[s.targetLabel, { color: theme.colors.textSecondary }]}>
                de {formatCurrency(goal.targetAmount)}
              </Text>
            </View>
            <View style={[s.pctBadge, { backgroundColor: Colors.primary + '20' }]}>
              <Text style={[s.pctText, { color: Colors.primary }]}>{Math.round(progress * 100)}%</Text>
            </View>
          </View>
          <ProgressBar progress={progress} showLabel={false} height={14} />
          <View style={s.statsRow}>
            <View style={s.stat}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={[s.statText, { color: theme.colors.textSecondary }]}>
                {daysRemaining > 0 ? `${daysRemaining} dias restantes` : 'Prazo encerrado'}
              </Text>
            </View>
            <View style={s.stat}>
              <Ionicons name="flag-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={[s.statText, { color: theme.colors.textSecondary }]}>{formatDate(goal.targetDate)}</Text>
            </View>
          </View>
        </View>

        {/* Remaining */}
        <View style={s.row}>
          <View style={[s.halfCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Ionicons name="trending-down-outline" size={20} color={Colors.error} />
            <Text style={[s.halfLabel, { color: theme.colors.textSecondary }]}>Falta</Text>
            <Text style={[s.halfValue, { color: theme.colors.text }]}>{formatCurrency(remaining)}</Text>
          </View>
          <View style={[s.halfCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Ionicons name="flash-outline" size={20} color={Colors.accent} />
            <Text style={[s.halfLabel, { color: theme.colors.textSecondary }]}>
              {MODALITY_LABELS[goal.activeModality]}
            </Text>
            <Text style={[s.halfValue, { color: theme.colors.text }]}>{formatCurrency(suggestedAmount)}</Text>
          </View>
        </View>

        {/* Achievements */}
        <Achievements goal={goal} savings={savings} totalSaved={totalSaved} theme={theme} />

        {/* Chart */}
        {chartData && chartData.datasets[0].data.length > 1 && (
          <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[s.cardTitle, { color: theme.colors.textSecondary }]}>Evolução das economias</Text>
            <LineChart
              data={chartData}
              width={SCREEN_WIDTH - 64}
              height={180}
              chartConfig={{
                backgroundColor: 'transparent',
                backgroundGradientFrom: theme.colors.card,
                backgroundGradientTo: theme.colors.card,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                labelColor: () => theme.colors.textSecondary,
                style: { borderRadius: 16 },
                propsForDots: { r: '4', strokeWidth: '2', stroke: Colors.primary },
              }}
              bezier
              style={{ borderRadius: 12, marginTop: 8 }}
              withInnerLines={false}
              withOuterLines={false}
            />
          </View>
        )}

        {chartData === null && (
          <View style={[s.card, s.emptyChart, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Ionicons name="bar-chart-outline" size={36} color={theme.colors.textSecondary} />
            <Text style={[s.emptyChartText, { color: theme.colors.textSecondary }]}>
              Registre suas economias para ver o gráfico de evolução.
            </Text>
          </View>
        )}

        {/* Category Breakdown */}
        {categoryStats.length > 0 && (
          <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[s.cardTitle, { color: theme.colors.textSecondary }]}>Economias por categoria</Text>
            {categoryStats.map((cat, i) => (
              <View key={cat.name} style={s.catRow}>
                <View style={s.catHeader}>
                  <Text style={s.catIcon}>{cat.icon}</Text>
                  <Text style={[s.catName, { color: theme.colors.text }]}>{cat.name}</Text>
                  <Text style={[s.catAmount, { color: theme.colors.textSecondary }]}>{formatCurrency(cat.total)}</Text>
                </View>
                <View style={[s.catBarBg, { backgroundColor: theme.colors.border }]}>
                  <View style={[s.catBarFill, { width: `${Math.round(cat.pct * 100)}%`, backgroundColor: cat.color }]} />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 32 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 14 },
  goalName: { fontSize: 20, fontWeight: '800', marginTop: 2, maxWidth: 240 },
  walletIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  card: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 13, fontWeight: '600', marginBottom: 12 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 },
  savedAmount: { fontSize: 28, fontWeight: '800' },
  targetLabel: { fontSize: 13, marginTop: 2 },
  pctBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  pctText: { fontSize: 16, fontWeight: '800' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  halfCard: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    alignItems: 'flex-start',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  halfLabel: { fontSize: 12, marginTop: 4 },
  halfValue: { fontSize: 16, fontWeight: '700' },
  emptyChart: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  emptyChartText: { fontSize: 13, textAlign: 'center', lineHeight: 20, maxWidth: 220 },
  catRow: { marginBottom: 12 },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  catIcon: { fontSize: 16 },
  catName: { fontSize: 13, fontWeight: '600', flex: 1 },
  catAmount: { fontSize: 13, fontWeight: '600' },
  catBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  catBarFill: { height: 8, borderRadius: 4 },
});
