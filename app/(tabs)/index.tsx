import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, useWindowDimensions, RefreshControl,
  TouchableOpacity, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useGoal } from '../../hooks/useGoal';
import { useData } from '../../contexts/DataContext';
import { ProgressBar } from '../../components/ProgressBar';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/calculations';
import { Colors } from '../../constants/colors';
import { Achievements } from '../../components/Achievements';
import { CategoryIcon } from '../../components/CategoryIcon';
import { ConfettiCelebration } from '../../components/ConfettiCelebration';
import { HeatmapCalendar } from '../../components/HeatmapCalendar';
import { TIPS } from '../../utils/notifications';
import { storage } from '../../utils/storage';

const MODALITY_LABELS: Record<string, string> = {
  daily: 'Diária',
  weekly: 'Semanal Progressivo',
  monthly: 'Mensal',
};

export default function HomeScreen() {
  const { theme, isDark } = useTheme();
  const data = useGoal();
  const { goals, activeGoal, setActiveGoal, savings, categories, refresh } = useData();
  const { width: screenWidth } = useWindowDimensions();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const chartWidth = Math.min(screenWidth, 480) - 64;
  const goalSavings = data.goalSavings || [];

  // Daily tip based on day of year
  const dailyTip = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return TIPS[dayOfYear % TIPS.length];
  }, []);

  // Weekly challenge: proportional to goal - save suggested weekly amount
  const weeklyChallenge = useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24) + startOfYear.getDay()) / 7);

    // Target = suggested daily * 7 (proportional to goal) or weekly modality amount
    const dailySuggested = data.suggestedAmount || 0;
    const modality = data.goal?.activeModality || 'daily';
    let target: number;
    if (modality === 'weekly') {
      target = dailySuggested; // already weekly amount
    } else if (modality === 'monthly') {
      target = dailySuggested / 4; // monthly / 4 weeks
    } else {
      target = dailySuggested * 7; // daily * 7
    }
    target = Math.max(target, 1); // minimum R$ 1

    // Calculate savings this week
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const weekSavings = goalSavings.filter(s => new Date(s.date) >= monday);
    const weekTotal = weekSavings.reduce((sum, e) => sum + e.amount, 0);

    return { weekNum, target, saved: weekTotal, pct: Math.min(1, weekTotal / target) };
  }, [goalSavings, data.suggestedAmount, data.goal?.activeModality]);

  // Chart data - group by unique dates to avoid duplicate labels
  const chartData = useMemo(() => {
    if (!goalSavings.length) return null;
    const sorted = [...goalSavings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    // Group by date to avoid duplicate labels
    const dayMap: Record<string, number> = {};
    sorted.forEach(e => {
      const key = e.date.split('T')[0];
      dayMap[key] = (dayMap[key] || 0) + e.amount;
    });
    const days = Object.entries(dayMap).sort(([a], [b]) => a.localeCompare(b)).slice(-7);
    let cum = 0;
    const labels: string[] = [];
    const values: number[] = [];
    days.forEach(([dateKey, amount]) => {
      cum += amount;
      const d = new Date(dateKey + 'T12:00:00');
      labels.push(`${d.getDate()}/${d.getMonth() + 1}`);
      values.push(parseFloat(cum.toFixed(2)));
    });
    if (values.length === 1) {
      labels.unshift('');
      values.unshift(0);
    }
    return { labels, datasets: [{ data: values }], days };
  }, [goalSavings]);

  // Selected point details for interactive chart
  const selectedPointDetails = useMemo(() => {
    if (selectedPointIndex === null || !chartData) return null;
    const offset = chartData.labels[0] === '' ? -1 : 0;
    const realIndex = selectedPointIndex + offset;
    if (realIndex < 0 || realIndex >= chartData.days.length) return null;
    const [dateKey] = chartData.days[realIndex];
    const dayEntries = goalSavings.filter(s => s.date.split('T')[0] === dateKey);
    const dayTotal = dayEntries.reduce((sum, e) => sum + e.amount, 0);
    return { date: dateKey + 'T12:00:00', entries: dayEntries, total: dayTotal };
  }, [selectedPointIndex, chartData, goalSavings]);

  // Category stats - filtered by goal
  const categoryStats = useMemo(() => {
    if (!goalSavings.length) return [];
    const map: Record<string, { name: string; icon: string; color: string; total: number }> = {};
    goalSavings.forEach(s => {
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
  }, [goalSavings]);

  // Monthly summary - filtered by goal
  const monthSummary = useMemo(() => {
    const now = new Date();
    const thisMonth = goalSavings.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const lastMonth = goalSavings.filter(s => {
      const d = new Date(s.date);
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    });
    const thisTotal = thisMonth.reduce((sum, e) => sum + e.amount, 0);
    const lastTotal = lastMonth.reduce((sum, e) => sum + e.amount, 0);
    const diff = lastTotal > 0 ? ((thisTotal - lastTotal) / lastTotal) * 100 : 0;
    return { thisTotal, lastTotal, count: thisMonth.length, diff };
  }, [goalSavings]);

  // Streak calculation
  const streak = useMemo(() => {
    if (!goalSavings.length) return 0;
    const uniqueDays = [...new Set(goalSavings.map(s => s.date.split('T')[0]))].sort().reverse();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    // Streak must start from today or yesterday
    if (uniqueDays[0] !== todayStr && uniqueDays[0] !== yesterdayStr) return 0;
    let count = 1;
    for (let i = 1; i < uniqueDays.length; i++) {
      const prev = new Date(uniqueDays[i - 1]);
      const cur = new Date(uniqueDays[i]);
      const diff = (prev.getTime() - cur.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) count++;
      else break;
    }
    return count;
  }, [goalSavings]);

  // Milestone celebration detection
  const MILESTONES = [0.25, 0.5, 0.75, 1];
  useEffect(() => {
    if (!data.progress || !data.goal) return;
    const prog = data.progress;

    (async () => {
      const key = 'lastMilestone_' + data.goal.id;
      const last = await storage.getItem(key);
      const lastPct = last ? Number.parseFloat(last) : 0;
      const current = MILESTONES.findLast(m => prog >= m) || 0;

      if (current > lastPct && current > 0) {
        setShowConfetti(true);
        await storage.setItem(key, current.toString());
      }
    })();
  }, [data.progress, data.goal?.id]);

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  function handleGoalSwitch(id: string) {
    setActiveGoal(id);
    setShowGoalPicker(false);
    setSelectedPointIndex(null);
  }

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
  const isCompleted = progress >= 1;
  const milestoneLabel = (() => {
    if (progress >= 1) return '100%';
    if (progress >= 0.75) return '75%';
    if (progress >= 0.5) return '50%';
    if (progress >= 0.25) return '25%';
    return null;
  })();

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.colors.background }]}>
      {/* Confetti overlay */}
      <ConfettiCelebration visible={showConfetti} onDone={() => setShowConfetti(false)} />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
      >
        {/* Header with Goal Selector */}
        <View style={s.headerRow}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => goals.length > 1 && setShowGoalPicker(true)}
            activeOpacity={goals.length > 1 ? 0.7 : 1}
          >
            <Text style={[s.greeting, { color: theme.colors.textSecondary }]}>Olá, {goal!.userName}! 👋</Text>
            <View style={s.goalNameRow}>
              <Text style={[s.goalName, { color: theme.colors.text }]} numberOfLines={1}>{goal!.name}</Text>
              {goals.length > 1 && (
                <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} style={{ marginLeft: 4 }} />
              )}
            </View>
            {goals.length > 1 && (
              <Text style={[s.goalCount, { color: theme.colors.textSecondary }]}>
                {goals.length} objetivos
              </Text>
            )}
          </TouchableOpacity>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[s.walletIcon, { backgroundColor: '#8B5CF6' + '20' }]}
                onPress={() => router.push('/shared-goal')}
                activeOpacity={0.7}
              >
                <Ionicons name="people" size={22} color="#8B5CF6" />
              </TouchableOpacity>
              <View style={[s.walletIcon, { backgroundColor: Colors.primary + '20' }]}>
                <Ionicons name="wallet" size={26} color={Colors.primary} />
              </View>
            </View>
            {streak > 0 && (
              <View style={[s.streakBadge, { backgroundColor: '#FF6B35' + '20' }]}>
                <Text style={s.streakText}>🔥 {streak}d</Text>
              </View>
            )}
          </View>
        </View>

        {/* Goal Completion */}
        {isCompleted && (
          <TouchableOpacity
            style={[s.card, s.completedCard]}
            onPress={() => setShowConfetti(true)}
            activeOpacity={0.85}
          >
            <Text style={s.completedEmoji}>🎉</Text>
            <Text style={s.completedTitle}>Objetivo alcançado!</Text>
            <Text style={s.completedText}>
              Parabéns! Você atingiu a meta de {formatCurrency(goal!.targetAmount)} para "{goal!.name}"!
            </Text>
            <Text style={[s.completedHint]}>Toque para celebrar novamente 🎊</Text>
          </TouchableOpacity>
        )}

        {/* Milestone celebration */}
        {!isCompleted && milestoneLabel && (
          <TouchableOpacity
            style={[s.card, s.milestoneCard]}
            onPress={() => setShowConfetti(true)}
            activeOpacity={0.85}
          >
            <Text style={s.milestoneEmoji}>🏆</Text>
            <Text style={s.milestoneTitle}>Marco de {milestoneLabel} atingido!</Text>
            <Text style={s.milestoneText}>
              Continue assim! Você já economizou {formatCurrency(totalSaved!)} do seu objetivo.
            </Text>
          </TouchableOpacity>
        )}

        {/* Progress Card */}
        <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[s.cardTitle, { color: theme.colors.textSecondary }]}>Progresso do objetivo</Text>
          <View style={s.amountRow}>
            <View>
              <Text style={[s.savedAmount, { color: Colors.primary }]}>{formatCurrency(totalSaved!)}</Text>
              <Text style={[s.targetLabel, { color: theme.colors.textSecondary }]}>
                de {formatCurrency(goal!.targetAmount)}
              </Text>
            </View>
            <View style={[s.pctBadge, { backgroundColor: Colors.primary + '20' }]}>
              <Text style={[s.pctText, { color: Colors.primary }]}>{Math.round(progress! * 100)}%</Text>
            </View>
          </View>
          <ProgressBar progress={progress!} showLabel={false} height={14} />
          <View style={s.statsRow}>
            <View style={s.stat}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={[s.statText, { color: theme.colors.textSecondary }]}>
                {daysRemaining! > 0 ? `${daysRemaining} dias restantes` : 'Prazo encerrado'}
              </Text>
            </View>
            <View style={s.stat}>
              <Ionicons name="flag-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={[s.statText, { color: theme.colors.textSecondary }]}>{formatDate(goal!.targetDate)}</Text>
            </View>
          </View>
        </View>

        {/* Remaining */}
        <View style={s.row}>
          <View style={[s.halfCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Ionicons name="trending-down-outline" size={20} color={Colors.error} />
            <Text style={[s.halfLabel, { color: theme.colors.textSecondary }]}>Falta</Text>
            <Text style={[s.halfValue, { color: theme.colors.text }]}>{formatCurrency(remaining!)}</Text>
          </View>
          <View style={[s.halfCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Ionicons name="flash-outline" size={20} color={Colors.accent} />
            <Text style={[s.halfLabel, { color: theme.colors.textSecondary }]}>
              {MODALITY_LABELS[goal!.activeModality]}
            </Text>
            <Text style={[s.halfValue, { color: theme.colors.text }]}>{formatCurrency(suggestedAmount!)}</Text>
          </View>
        </View>

        {/* Streak Card */}
        {streak > 0 && (
          <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={s.streakRow}>
              <View style={[s.streakIconBox, { backgroundColor: '#FF6B35' + '15' }]}>
                <Text style={{ fontSize: 24 }}>🔥</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.streakTitle, { color: theme.colors.text }]}>
                  {streak} dia{streak > 1 ? 's' : ''} de sequência!
                </Text>
                <Text style={[s.streakDesc, { color: theme.colors.textSecondary }]}>
                  {streak >= 7 ? 'Incrível! Continue assim! 💪' :
                   streak >= 3 ? 'Ótimo ritmo! Não pare agora!' :
                   'Bom começo! Mantenha o ritmo!'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Monthly Summary */}
        {(monthSummary.count > 0 || monthSummary.lastTotal > 0) && (
          <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[s.cardTitle, { color: theme.colors.textSecondary }]}>Resumo do mês</Text>
            <View style={s.monthRow}>
              <View style={s.monthItem}>
                <Ionicons name="calendar" size={18} color={Colors.primary} />
                <Text style={[s.monthValue, { color: theme.colors.text }]}>{formatCurrency(monthSummary.thisTotal)}</Text>
                <Text style={[s.monthLabel, { color: theme.colors.textSecondary }]}>Este mês</Text>
              </View>
              <View style={[s.monthDivider, { backgroundColor: theme.colors.border }]} />
              <View style={s.monthItem}>
                <Ionicons name="time" size={18} color={theme.colors.textSecondary} />
                <Text style={[s.monthValue, { color: theme.colors.text }]}>{formatCurrency(monthSummary.lastTotal)}</Text>
                <Text style={[s.monthLabel, { color: theme.colors.textSecondary }]}>Mês anterior</Text>
              </View>
              <View style={[s.monthDivider, { backgroundColor: theme.colors.border }]} />
              <View style={s.monthItem}>
                <Ionicons name="stats-chart" size={18} color={monthSummary.diff >= 0 ? Colors.primary : Colors.error} />
                <Text style={[s.monthValue, { color: monthSummary.diff >= 0 ? Colors.primary : Colors.error }]}>
                  {monthSummary.diff >= 0 ? '+' : ''}{monthSummary.diff.toFixed(0)}%
                </Text>
                <Text style={[s.monthLabel, { color: theme.colors.textSecondary }]}>Variação</Text>
              </View>
            </View>
            <Text style={[s.monthCount, { color: theme.colors.textSecondary }]}>
              {monthSummary.count} registro{monthSummary.count !== 1 ? 's' : ''} este mês
            </Text>
          </View>
        )}

        {/* Achievements */}
        <Achievements goal={goal!} savings={goalSavings} totalSaved={totalSaved!} theme={theme} />

        {/* Daily Tip */}
        <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={s.tipHeader}>
            <View style={[s.tipIconBox, { backgroundColor: '#F59E0B' + '20' }]}>
              <Text style={{ fontSize: 20 }}>💡</Text>
            </View>
            <Text style={[s.tipTitle, { color: theme.colors.text }]}>Dica do dia</Text>
          </View>
          <Text style={[s.tipText, { color: theme.colors.textSecondary }]}>
            {dailyTip.replace('💡 ', '')}
          </Text>
        </View>

        {/* Weekly Challenge */}
        <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={s.challengeHeader}>
            <View style={[s.challengeIconBox, { backgroundColor: '#8B5CF6' + '15' }]}>
              <Text style={{ fontSize: 20 }}>⚡</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.challengeTitle, { color: theme.colors.text }]}>Desafio Semana {weeklyChallenge.weekNum}</Text>
              <Text style={[s.challengeDesc, { color: theme.colors.textSecondary }]}>
                Economize {formatCurrency(weeklyChallenge.target)} esta semana
              </Text>
            </View>
            {weeklyChallenge.pct >= 1 && (
              <View style={[s.challengeDone, { backgroundColor: '#10B981' + '20' }]}>
                <Text style={{ fontSize: 14 }}>✅</Text>
              </View>
            )}
          </View>
          <View style={[s.challengeBarBg, { backgroundColor: theme.colors.border }]}>
            <View style={[s.challengeBarFill, { width: `${Math.round(weeklyChallenge.pct * 100)}%` }]} />
          </View>
          <Text style={[s.challengeProgress, { color: theme.colors.textSecondary }]}>
            {formatCurrency(weeklyChallenge.saved)} / {formatCurrency(weeklyChallenge.target)}
            {weeklyChallenge.pct >= 1 ? ' — Concluído! 🎉' : ` — ${Math.round(weeklyChallenge.pct * 100)}%`}
          </Text>
        </View>

        {/* Savings Heatmap */}
        <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[s.cardTitle, { color: theme.colors.textSecondary }]}>Frequência de economia</Text>
          <HeatmapCalendar savings={goalSavings} isDark={isDark} theme={theme} />
        </View>

        {/* Interactive Chart */}
        {chartData && chartData.datasets[0].data.length > 1 && (
          <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[s.cardTitle, { color: theme.colors.textSecondary }]}>Evolução das economias</Text>
            <Text style={[s.chartHint, { color: theme.colors.textSecondary }]}>Toque em um ponto para ver detalhes</Text>
            <LineChart
              data={chartData}
              width={chartWidth}
              height={180}
              chartConfig={{
                backgroundColor: 'transparent',
                backgroundGradientFrom: theme.colors.card,
                backgroundGradientTo: theme.colors.card,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                labelColor: () => theme.colors.textSecondary,
                style: { borderRadius: 16 },
                propsForDots: { r: '5', strokeWidth: '2', stroke: Colors.primary },
              }}
              bezier
              style={{ borderRadius: 12, marginTop: 8 }}
              withInnerLines={false}
              withOuterLines={false}
              onDataPointClick={({ index }) => {
                setSelectedPointIndex(selectedPointIndex === index ? null : index);
              }}
            />

            {/* Chart Point Details */}
            {selectedPointDetails && (
              <View style={[s.pointDetail, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                <View style={s.pointDetailHeader}>
                  <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
                  <Text style={[s.pointDetailDate, { color: theme.colors.text }]}>
                    {formatDate(selectedPointDetails.date)}
                  </Text>
                  <Text style={[s.pointDetailTotal, { color: Colors.primary }]}>
                    {formatCurrency(selectedPointDetails.total)}
                  </Text>
                </View>
                {selectedPointDetails.entries.map((entry, i) => (
                  <View key={entry.id} style={s.pointDetailEntry}>
                    {entry.categoryIcon && (
                      <CategoryIcon icon={entry.categoryIcon} size={14} color={entry.categoryColor || Colors.primary} />
                    )}
                    <Text style={[s.pointDetailDesc, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {entry.description || entry.categoryName || 'Economia'}
                    </Text>
                    <Text style={[s.pointDetailAmount, { color: theme.colors.text }]}>
                      {formatCurrency(entry.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
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
            <Text style={[s.cardTitle, { color: theme.colors.textSecondary }]}>Economias por origem</Text>
            {categoryStats.map((cat, i) => (
              <View key={cat.name} style={s.catRow}>
                <View style={s.catHeader}>
                  <CategoryIcon icon={cat.icon} size={16} color={cat.color} />
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

      {/* Goal Picker Modal */}
      <Modal visible={showGoalPicker} transparent animationType="fade" onRequestClose={() => setShowGoalPicker(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setShowGoalPicker(false)}>
          <Pressable style={[s.modalContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[s.modalTitle, { color: theme.colors.text }]}>Seus Objetivos</Text>
            {goals.map(g => {
              const isActive = g.id === activeGoal?.id;
              const gSavings = savings.filter(sv => !sv.goalId || sv.goalId === g.id);
              const gTotal = gSavings.reduce((sum, sv) => sum + sv.amount, 0);
              const gPct = g.targetAmount > 0 ? Math.min(1, gTotal / g.targetAmount) : 0;
              return (
                <TouchableOpacity
                  key={g.id}
                  style={[
                    s.goalOption,
                    {
                      backgroundColor: isActive ? Colors.primary + '15' : theme.colors.background,
                      borderColor: isActive ? Colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => handleGoalSwitch(g.id)}
                  activeOpacity={0.7}
                >
                  <View style={s.goalOptionTop}>
                    <View style={[s.goalDot, { backgroundColor: isActive ? Colors.primary : theme.colors.border }]} />
                    <Text style={[s.goalOptionName, { color: theme.colors.text }]} numberOfLines={1}>{g.name}</Text>
                    {isActive && <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />}
                  </View>
                  <View style={s.goalOptionBottom}>
                    <Text style={[s.goalOptionAmount, { color: theme.colors.textSecondary }]}>
                      {formatCurrency(gTotal)} / {formatCurrency(g.targetAmount)}
                    </Text>
                    <Text style={[s.goalOptionPct, { color: Colors.primary }]}>
                      {Math.round(gPct * 100)}%
                    </Text>
                  </View>
                  <View style={[s.goalProgressBg, { backgroundColor: theme.colors.border }]}>
                    <View style={[s.goalProgressFill, { width: `${Math.round(gPct * 100)}%`, backgroundColor: Colors.primary }]} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 32 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 14 },
  goalNameRow: { flexDirection: 'row', alignItems: 'center' },
  goalName: { fontSize: 20, fontWeight: '800', marginTop: 2, maxWidth: 220 },
  goalCount: { fontSize: 11, marginTop: 2 },
  walletIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  streakBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  streakText: { fontSize: 12, fontWeight: '700', color: '#FF6B35' },
  // Completed
  completedCard: { backgroundColor: '#10B981' + '15', borderColor: '#10B981' + '40', alignItems: 'center', paddingVertical: 20 },
  completedEmoji: { fontSize: 40, marginBottom: 8 },
  completedTitle: { fontSize: 18, fontWeight: '800', color: '#10B981', marginBottom: 4 },
  completedText: { fontSize: 13, color: '#10B981', textAlign: 'center', lineHeight: 20 },
  completedHint: { fontSize: 11, color: '#10B981', marginTop: 8, opacity: 0.7 },
  // Milestone
  milestoneCard: { backgroundColor: '#F59E0B' + '10', borderColor: '#F59E0B' + '40', alignItems: 'center', paddingVertical: 16 },
  milestoneEmoji: { fontSize: 32, marginBottom: 6 },
  milestoneTitle: { fontSize: 16, fontWeight: '700', color: '#F59E0B', marginBottom: 2 },
  milestoneText: { fontSize: 12, color: '#F59E0B', textAlign: 'center', lineHeight: 18 },
  // Daily Tip
  tipCard: { paddingVertical: 14 },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  tipIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  tipTitle: { fontSize: 14, fontWeight: '700' },
  tipText: { fontSize: 13, lineHeight: 20 },
  // Weekly Challenge
  challengeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  challengeIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  challengeTitle: { fontSize: 14, fontWeight: '700' },
  challengeDesc: { fontSize: 12, marginTop: 1 },
  challengeDone: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  challengeBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  challengeBarFill: { height: 8, borderRadius: 4, backgroundColor: '#8B5CF6' },
  challengeProgress: { fontSize: 12, marginTop: 6 },
  // Card
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
  // Streak
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  streakIconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  streakTitle: { fontSize: 16, fontWeight: '700' },
  streakDesc: { fontSize: 13, marginTop: 2 },
  // Chart
  chartHint: { fontSize: 11, marginBottom: 4 },
  pointDetail: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  pointDetailHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  pointDetailDate: { fontSize: 13, fontWeight: '600', flex: 1 },
  pointDetailTotal: { fontSize: 14, fontWeight: '800' },
  pointDetailEntry: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  pointDetailDesc: { fontSize: 12, flex: 1 },
  pointDetailAmount: { fontSize: 13, fontWeight: '600' },
  // Empty chart
  emptyChart: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  emptyChartText: { fontSize: 13, textAlign: 'center', lineHeight: 20, maxWidth: 220 },
  // Categories
  catRow: { marginBottom: 12 },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  catIcon: { fontSize: 16 },
  catName: { fontSize: 13, fontWeight: '600', flex: 1 },
  catAmount: { fontSize: 13, fontWeight: '600' },
  catBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  catBarFill: { height: 8, borderRadius: 4 },
  // Monthly summary
  monthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  monthItem: { flex: 1, alignItems: 'center', gap: 4 },
  monthDivider: { width: 1, height: 40 },
  monthValue: { fontSize: 14, fontWeight: '700' },
  monthLabel: { fontSize: 10 },
  monthCount: { fontSize: 12, textAlign: 'center' },
  // Goal picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    maxHeight: '70%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  goalOption: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  goalOptionTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  goalDot: { width: 10, height: 10, borderRadius: 5 },
  goalOptionName: { fontSize: 15, fontWeight: '600', flex: 1 },
  goalOptionBottom: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  goalOptionAmount: { fontSize: 12 },
  goalOptionPct: { fontSize: 12, fontWeight: '700' },
  goalProgressBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  goalProgressFill: { height: 4, borderRadius: 2 },
});
