import { useData } from '../contexts/DataContext';
import { getDaysRemaining, getTotalSaved, getProgress, getModalityInfos, getActiveSuggestedAmount } from '../utils/calculations';

export function useGoal() {
  const { goal, savings } = useData();

  if (!goal) return { goal: null };

  const totalSaved = getTotalSaved(savings);
  const daysRemaining = getDaysRemaining(goal.targetDate);
  const progress = getProgress(totalSaved, goal.targetAmount);
  const remaining = Math.max(0, goal.targetAmount - totalSaved);
  const modalities = getModalityInfos(goal, savings);
  const suggestedAmount = getActiveSuggestedAmount(goal, savings);

  return {
    goal,
    totalSaved,
    daysRemaining,
    progress,
    remaining,
    modalities,
    suggestedAmount,
  };
}
