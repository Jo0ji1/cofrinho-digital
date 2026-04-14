import { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { getDaysRemaining, getTotalSaved, getProgress, getModalityInfos, getActiveSuggestedAmount } from '../utils/calculations';

export function useGoal() {
  const { activeGoal, savings } = useData();

  const goalSavings = useMemo(() => {
    if (!activeGoal) return [];
    return savings.filter(s => !s.goalId || s.goalId === activeGoal.id);
  }, [savings, activeGoal]);

  if (!activeGoal) return { goal: null, goalSavings: [] };

  const totalSaved = getTotalSaved(goalSavings);
  const daysRemaining = getDaysRemaining(activeGoal.targetDate);
  const progress = getProgress(totalSaved, activeGoal.targetAmount);
  const remaining = Math.max(0, activeGoal.targetAmount - totalSaved);
  const modalities = getModalityInfos(activeGoal, goalSavings);
  const suggestedAmount = getActiveSuggestedAmount(activeGoal, goalSavings);

  return {
    goal: activeGoal,
    goalSavings,
    totalSaved,
    daysRemaining,
    progress,
    remaining,
    modalities,
    suggestedAmount,
  };
}
