import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Modal, Pressable, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../components/Toast';
import { ConfirmModal } from '../../components/ConfirmModal';
import { CategoryIcon } from '../../components/CategoryIcon';
import { useSavings, FilterPeriod } from '../../hooks/useSavings';
import { formatCurrency, maskCurrency, parseCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/calculations';
import { Colors } from '../../constants/colors';
import { SavingEntry, Category } from '../../types';

const FILTERS: { label: string; value: FilterPeriod }[] = [
  { label: 'Tudo', value: 'all' },
  { label: 'Semana', value: 'week' },
  { label: 'Mês', value: 'month' },
];

export default function HistoryScreen() {
  const { theme } = useTheme();
  const { deleteSaving, updateSaving, categories, refresh } = useData();
  const { show } = useToast();
  const [filter, setFilter] = useState<FilterPeriod>('all');
  const { savings, total } = useSavings(filter);

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SavingEntry | null>(null);
  const [editTarget, setEditTarget] = useState<SavingEntry | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState<Category | null>(null);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return savings;
    const q = searchQuery.toLowerCase();
    return savings.filter(s =>
      (s.description || '').toLowerCase().includes(q) ||
      (s.categoryName || '').toLowerCase().includes(q) ||
      formatCurrency(s.amount).includes(q)
    );
  }, [savings, searchQuery]);

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  function openEdit(entry: SavingEntry) {
    setEditTarget(entry);
    setEditAmount(formatCurrency(entry.amount));
    setEditDesc(entry.description || '');
    const cat = categories.find(c => c.id === entry.categoryId) || null;
    setEditCategory(cat);
  }

  async function handleSaveEdit() {
    if (!editTarget) return;
    const amount = parseCurrency(editAmount);
    if (amount <= 0) {
      show({ type: 'warning', title: 'Atenção', message: 'Informe um valor válido.' });
      return;
    }
    try {
      await updateSaving({
        ...editTarget,
        amount,
        description: editDesc.trim(),
        categoryId: editCategory?.id,
        categoryName: editCategory?.name,
        categoryIcon: editCategory?.icon,
        categoryColor: editCategory?.color,
      });
      setEditTarget(null);
      show({ type: 'success', title: 'Atualizado', message: 'Economia atualizada com sucesso!' });
    } catch {
      show({ type: 'error', title: 'Erro', message: 'Não foi possível atualizar.' });
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteSaving(deleteTarget.id);
      show({ type: 'success', title: 'Excluído', message: 'Registro removido com sucesso.' });
    } catch {
      show({ type: 'error', title: 'Erro', message: 'Não foi possível excluir.' });
    }
    setDeleteTarget(null);
  }

  const s = styles(theme);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.colors.background }]}>
      <View style={s.container}>
        <Text style={[s.title, { color: theme.colors.text }]}>Histórico</Text>

        {/* Search */}
        <View style={[s.searchBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary} />
          <TextInput
            style={[s.searchInput, { color: theme.colors.text }]}
            placeholder="Buscar por descrição, categoria..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        <View style={s.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.value}
              style={[
                s.filterBtn,
                {
                  backgroundColor: filter === f.value ? Colors.primary : theme.colors.card,
                  borderColor: filter === f.value ? Colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setFilter(f.value)}
              activeOpacity={0.8}
            >
              <Text style={[s.filterText, { color: filter === f.value ? '#fff' : theme.colors.textSecondary }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={{ flex: 1 }} />
          <Text style={[s.countText, { color: theme.colors.textSecondary }]}>{filtered.length} registros</Text>
        </View>

        {/* Total */}
        <View style={[s.totalCard, { backgroundColor: Colors.primary + '15', borderColor: Colors.primary + '30' }]}>
          <Text style={[s.totalLabel, { color: theme.colors.textSecondary }]}>Total economizado</Text>
          <Text style={[s.totalValue, { color: Colors.primary }]}>{formatCurrency(total)}</Text>
        </View>

        {/* List */}
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="receipt-outline" size={52} color={theme.colors.textSecondary} />
            <Text style={[s.emptyText, { color: theme.colors.textSecondary }]}>
              {searchQuery ? 'Nenhum resultado encontrado.' : 'Nenhum registro encontrado.'}
            </Text>
            {!searchQuery && (
              <Text style={[s.emptySubText, { color: theme.colors.textSecondary }]}>
                Vá para "Registrar" para adicionar sua primeira economia!
              </Text>
            )}
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
            renderItem={({ item }) => (
              <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={s.cardTop}>
                  <View style={[s.iconBox, { backgroundColor: (item.categoryColor || Colors.primary) + '20' }]}>
                    {item.categoryIcon ? (
                      <CategoryIcon icon={item.categoryIcon} size={22} color={item.categoryColor || Colors.primary} />
                    ) : (
                      <Ionicons name="cash-outline" size={22} color={Colors.primary} />
                    )}
                  </View>
                  <View style={s.cardInfo}>
                    <Text style={[s.cardDesc, { color: theme.colors.text }]} numberOfLines={1}>
                      {item.description || 'Economia registrada'}
                    </Text>
                    <View style={s.cardMeta}>
                      <Text style={[s.cardDate, { color: theme.colors.textSecondary }]}>{formatDate(item.date)}</Text>
                      {item.categoryName && (
                        <View style={[s.badge, { backgroundColor: (item.categoryColor || '#888') + '20' }]}>
                          <Text style={[s.badgeText, { color: item.categoryColor || '#888' }]}>{item.categoryName}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={[s.cardAmount, { color: Colors.primary }]}>{formatCurrency(item.amount)}</Text>
                </View>
                <View style={s.cardActions}>
                  <TouchableOpacity style={[s.actionBtn, { borderColor: Colors.primary + '40' }]} onPress={() => openEdit(item)}>
                    <Ionicons name="pencil-outline" size={14} color={Colors.primary} />
                    <Text style={[s.actionText, { color: Colors.primary }]}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actionBtn, { borderColor: Colors.error + '40' }]} onPress={() => setDeleteTarget(item)}>
                    <Ionicons name="trash-outline" size={14} color={Colors.error} />
                    <Text style={[s.actionText, { color: Colors.error }]}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>

      {/* Delete Confirm */}
      <ConfirmModal
        visible={!!deleteTarget}
        title="Excluir registro"
        message={deleteTarget ? `Excluir "${deleteTarget.description || 'Economia registrada'}" de ${formatCurrency(deleteTarget.amount)}?` : ''}
        confirmText="Excluir"
        destructive
        icon="trash-outline"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Edit Modal */}
      <Modal visible={!!editTarget} transparent animationType="fade" onRequestClose={() => setEditTarget(null)}>
        <Pressable style={s.modalOverlay} onPress={() => setEditTarget(null)}>
          <Pressable style={[s.modalContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[s.modalTitle, { color: theme.colors.text }]}>Editar Economia</Text>

            <Text style={[s.label, { color: theme.colors.textSecondary }]}>Valor</Text>
            <TextInput
              style={[s.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              value={editAmount}
              onChangeText={v => setEditAmount(maskCurrency(v))}
              keyboardType="numeric"
              placeholder="R$ 0,00"
              placeholderTextColor={theme.colors.textSecondary}
            />

            <Text style={[s.label, { color: theme.colors.textSecondary }]}>Descrição</Text>
            <TextInput
              style={[s.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              value={editDesc}
              onChangeText={setEditDesc}
              placeholder="Descrição"
              placeholderTextColor={theme.colors.textSecondary}
              maxLength={80}
            />

            <Text style={[s.label, { color: theme.colors.textSecondary }]}>Categoria</Text>
            <View style={s.catGrid}>
              {categories.map(cat => {
                const sel = editCategory?.id === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[s.catChip, { backgroundColor: sel ? cat.color + '30' : theme.colors.background, borderColor: sel ? cat.color : theme.colors.border }]}
                    onPress={() => setEditCategory(sel ? null : cat)}
                  >
                    <CategoryIcon icon={cat.icon} size={14} color={sel ? cat.color : theme.colors.textSecondary} />
                    <Text style={[s.catChipText, { color: sel ? cat.color : theme.colors.textSecondary }]} numberOfLines={1}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={s.modalBtns}>
              <TouchableOpacity style={[s.modalCancelBtn, { borderColor: theme.colors.border }]} onPress={() => setEditTarget(null)}>
                <Text style={[s.modalCancelText, { color: theme.colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalSaveBtn, { backgroundColor: Colors.primary }]} onPress={handleSaveEdit}>
                <Text style={s.modalSaveText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 16 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 2 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  filterBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  filterText: { fontSize: 13, fontWeight: '600' },
  countText: { fontSize: 12 },
  totalCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: { fontSize: 14 },
  totalValue: { fontSize: 20, fontWeight: '800' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingBottom: 60 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptySubText: { fontSize: 13, textAlign: 'center', lineHeight: 20, maxWidth: 240 },
  // Card styles
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: { flex: 1 },
  cardDesc: { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardDate: { fontSize: 12 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  cardAmount: { fontSize: 15, fontWeight: '700' },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 7,
  },
  actionText: { fontSize: 12, fontWeight: '600' },
  // Modal styles
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
    padding: 24,
    borderWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
  },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 4,
  },
  catChipText: { fontSize: 11, fontWeight: '600' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, fontWeight: '600' },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSaveText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
