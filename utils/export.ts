import { Platform } from 'react-native';
import type { SavingEntry, Goal } from '../types';

/**
 * Convert savings of a goal to CSV and trigger download (web) or return string.
 */
export function savingsToCSV(savings: SavingEntry[], goal: Goal): string {
  const header = ['Data', 'Valor (R$)', 'Descrição', 'Categoria', 'Autor'];
  const rows = savings.map(s => [
    new Date(s.date).toLocaleDateString('pt-BR'),
    s.amount.toFixed(2).replace('.', ','),
    (s.description || '').replace(/"/g, '""'),
    s.categoryName || '',
    s.authorName || 'Você',
  ]);
  const total = savings.reduce((sum, s) => sum + s.amount, 0);
  const footer = ['', 'TOTAL', total.toFixed(2).replace('.', ','), '', ''];
  const all = [
    [`Objetivo: ${goal.name}`],
    [`Meta: R$ ${goal.targetAmount.toFixed(2).replace('.', ',')}`],
    [`Exportado em: ${new Date().toLocaleString('pt-BR')}`],
    [],
    header,
    ...rows,
    [],
    footer,
  ];
  return all.map(row => row.map(cell => `"${cell}"`).join(';')).join('\n');
}

export function downloadCSV(csv: string, filename: string) {
  if (Platform.OS !== 'web') {
    // On mobile we'd use expo-sharing; keep simple for now
    return false;
  }
  try {
    // Prepend BOM so Excel opens with UTF-8
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}
