import { Goal, SavingEntry, ModalityInfo } from '../types';

export function getDaysRemaining(targetDate: string): number {
  const target = new Date(targetDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diff = target.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function getTotalSaved(savings: SavingEntry[]): number {
  return savings.reduce((sum, entry) => sum + entry.amount, 0);
}

export function getProgress(saved: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(1, saved / target);
}

export function getModalityInfos(goal: Goal, savings: SavingEntry[]): ModalityInfo[] {
  const totalSaved = getTotalSaved(savings);
  const remaining = Math.max(0, goal.targetAmount - totalSaved);
  const daysRemaining = getDaysRemaining(goal.targetDate);
  const weeksRemaining = Math.max(1, Math.ceil(daysRemaining / 7));
  const monthsRemaining = Math.max(1, Math.ceil(daysRemaining / 30));

  const dailyAmount = daysRemaining > 0 ? remaining / daysRemaining : remaining;
  // Progressive series: week 1 pays 1x, week 2 pays 2x, … week N pays Nx.
  // Total = start * N*(N+1)/2 = remaining → start = remaining / (N*(N+1)/2)
  const actualWeeklyStart = remaining / (weeksRemaining * ((weeksRemaining + 1) / 2));
  const monthlyAmount = remaining / monthsRemaining;

  return [
    {
      type: 'daily',
      title: 'Economia Diária Fixa',
      description: 'Guarde um valor fixo todos os dias',
      icon: 'sunny-outline',
      suggestedAmount: dailyAmount,
      period: 'por dia',
    },
    {
      type: 'weekly',
      title: 'Desafio Semanal Progressivo',
      description: 'Começa menor e aumenta a cada semana',
      icon: 'trending-up-outline',
      suggestedAmount: actualWeeklyStart,
      period: 'na 1ª semana',
    },
    {
      type: 'monthly',
      title: 'Corte de Gastos Mensal',
      description: 'Economize cortando gastos mês a mês',
      icon: 'cut-outline',
      suggestedAmount: monthlyAmount,
      period: 'por mês',
    },
  ];
}

export function getActiveSuggestedAmount(goal: Goal, savings: SavingEntry[]): number {
  const infos = getModalityInfos(goal, savings);
  const active = infos.find(m => m.type === goal.activeModality);
  return active ? active.suggestedAmount : 0;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
