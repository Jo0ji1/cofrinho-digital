import { useMemo } from 'react';
import { useData } from '../contexts/DataContext';

export type FilterPeriod = 'all' | 'week' | 'month';

export function useSavings(filter: FilterPeriod = 'all') {
  const { savings } = useData();

  const filtered = useMemo(() => {
    const now = new Date();
    return savings.filter(entry => {
      if (filter === 'all') return true;
      const entryDate = new Date(entry.date);
      if (filter === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return entryDate >= weekAgo;
      }
      if (filter === 'month') {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return entryDate >= monthAgo;
      }
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [savings, filter]);

  const total = useMemo(() => filtered.reduce((sum, e) => sum + e.amount, 0), [filtered]);

  return { savings: filtered, total };
}
