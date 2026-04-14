import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Goal, SavingEntry } from '../types';

interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
}

interface AchievementsProps {
  goal: Goal;
  savings: SavingEntry[];
  totalSaved: number;
  theme: any;
}

export function Achievements({ goal, savings, totalSaved, theme }: Readonly<AchievementsProps>) {
  const achievements = useMemo<Achievement[]>(() => {
    const pct = goal.targetAmount > 0 ? totalSaved / goal.targetAmount : 0;

    // Streak: consecutive days with savings
    const uniqueDays = new Set(savings.map(s => s.date.split('T')[0]));
    const sortedDays = [...uniqueDays].sort((a, b) => a.localeCompare(b));
    let maxStreak = 0;
    let streak = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const prev = new Date(sortedDays[i - 1]);
      const cur = new Date(sortedDays[i]);
      const diff = (cur.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        streak++;
        maxStreak = Math.max(maxStreak, streak);
      } else {
        streak = 1;
      }
    }
    if (sortedDays.length === 1) maxStreak = 1;

    const categoryCount = new Set(savings.filter(s => s.categoryName).map(s => s.categoryName)).size;

    return [
      {
        id: 'first',
        icon: '🌟',
        title: 'Primeiro Passo',
        description: 'Registrou a primeira economia',
        unlocked: savings.length >= 1,
      },
      {
        id: 'ten',
        icon: '🔥',
        title: 'Constante',
        description: 'Registrou 10 economias',
        unlocked: savings.length >= 10,
      },
      {
        id: 'streak3',
        icon: '📅',
        title: 'Sequência de 3',
        description: '3 dias seguidos economizando',
        unlocked: maxStreak >= 3,
      },
      {
        id: 'streak7',
        icon: '🏆',
        title: 'Semana Perfeita',
        description: '7 dias seguidos economizando',
        unlocked: maxStreak >= 7,
      },
      {
        id: 'pct25',
        icon: '🎯',
        title: '25% Alcançado',
        description: 'Atingiu 25% do objetivo',
        unlocked: pct >= 0.25,
      },
      {
        id: 'pct50',
        icon: '💪',
        title: 'Metade do Caminho',
        description: 'Atingiu 50% do objetivo',
        unlocked: pct >= 0.5,
      },
      {
        id: 'pct75',
        icon: '🚀',
        title: 'Quase Lá',
        description: 'Atingiu 75% do objetivo',
        unlocked: pct >= 0.75,
      },
      {
        id: 'pct100',
        icon: '👑',
        title: 'Meta Conquistada!',
        description: 'Atingiu 100% do objetivo',
        unlocked: pct >= 1,
      },
      {
        id: 'categories3',
        icon: '🎨',
        title: 'Diversificado',
        description: 'Usou 3 categorias diferentes',
        unlocked: categoryCount >= 3,
      },
    ];
  }, [goal, savings, totalSaved]);

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <View style={s.container}>
      <View style={s.headerRow}>
        <Text style={[s.title, { color: theme.colors.textSecondary }]}>
          Conquistas ({unlockedCount}/{achievements.length})
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.badgesRow}>
        {achievements.map(a => (
          <View
            key={a.id}
            style={[
              s.badge,
              {
                backgroundColor: a.unlocked ? theme.colors.card : theme.colors.background,
                borderColor: a.unlocked ? theme.colors.border : theme.colors.border + '60',
                opacity: a.unlocked ? 1 : 0.45,
              },
            ]}
          >
            <Text style={s.badgeIcon}>{a.icon}</Text>
            <Text style={[s.badgeTitle, { color: theme.colors.text }]} numberOfLines={1}>{a.title}</Text>
            <Text style={[s.badgeDesc, { color: theme.colors.textSecondary }]} numberOfLines={2}>{a.description}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginBottom: 14 },
  headerRow: { marginBottom: 10 },
  title: { fontSize: 13, fontWeight: '600' },
  badgesRow: { gap: 10, paddingRight: 4 },
  badge: {
    width: 110,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  badgeIcon: { fontSize: 28 },
  badgeTitle: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  badgeDesc: { fontSize: 10, textAlign: 'center', lineHeight: 14 },
});
