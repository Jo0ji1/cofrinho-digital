import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, TextInput, Platform,
  Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { File as ExpoFile, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../components/Toast';
import { ConfirmModal } from '../../components/ConfirmModal';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ModalityCard } from '../../components/ModalityCard';
import { getModalityInfos } from '../../utils/calculations';
import { formatCurrency, maskCurrency, parseCurrency } from '../../utils/currency';
import { savingsToCSV, downloadCSV } from '../../utils/export';
import { requestNotificationPermissions, scheduleNotification, cancelAllNotifications } from '../../utils/notifications';
import { ModalityType, Goal } from '../../types';
import { Colors } from '../../constants/colors';

export default function SettingsScreen() {
  const { theme, themeMode, setThemeMode } = useTheme();
  const { goals, activeGoal, setActiveGoal, updateGoal, addGoal, deleteGoal, savings, notifications, setNotifications, resetAll, myRoleByGoal, memberCountByGoal, removeGoalMember, refresh } = useData();
  const { user, signOut, isConfigured } = useAuth();
  const { show } = useToast();
  const router = useRouter();

  const [showModalities, setShowModalities] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalName, setGoalName] = useState(activeGoal?.name || '');
  const [goalAmount, setGoalAmount] = useState(activeGoal ? formatCurrency(activeGoal.targetAmount) : '');
  const [goalEmoji, setGoalEmoji] = useState(activeGoal?.emoji || '🐷');
  const [goalColor, setGoalColor] = useState(activeGoal?.color || '#10B981');
  const [goalDescription, setGoalDescription] = useState(activeGoal?.description || '');
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalAmount, setNewGoalAmount] = useState('');
  const [newGoalDate, setNewGoalDate] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean; title: string; message: string;
    confirmText: string; destructive: boolean;
    icon?: any; onConfirm: () => void;
  }>({ visible: false, title: '', message: '', confirmText: '', destructive: false, onConfirm: () => {} });

  function showConfirm(opts: Omit<typeof confirmModal, 'visible'>) {
    setConfirmModal({ ...opts, visible: true });
  }
  function hideConfirm() {
    setConfirmModal(prev => ({ ...prev, visible: false }));
  }

  const modalities = activeGoal ? getModalityInfos(activeGoal, []) : [];

  async function handleNotificationToggle(value: boolean) {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        show({ type: 'warning', title: 'Permissão negada', message: 'Habilite as notificações nas configurações do dispositivo.' });
        return;
      }
    }
    const updated = { ...notifications, enabled: value };
    await setNotifications(updated);
    if (value) {
      await scheduleNotification(updated);
    } else {
      await cancelAllNotifications();
    }
  }

  async function handleFrequencyChange(freq: 'daily' | 'weekly') {
    const updated = { ...notifications, frequency: freq };
    await setNotifications(updated);
    if (notifications.enabled) await scheduleNotification(updated);
  }

  async function handleSaveGoal() {
    if (!activeGoal) return;
    if (!goalName.trim()) {
      show({ type: 'warning', title: 'Atenção', message: 'Informe um nome para o objetivo.' });
      return;
    }
    const amount = parseCurrency(goalAmount);
    if (amount <= 0) {
      show({ type: 'warning', title: 'Atenção', message: 'Informe um valor válido.' });
      return;
    }
    await updateGoal({
      ...activeGoal,
      name: goalName.trim(),
      targetAmount: amount,
      emoji: goalEmoji || undefined,
      color: goalColor || undefined,
      description: goalDescription.trim() || undefined,
    });
    setEditingGoal(false);
    show({ type: 'success', title: 'Salvo', message: 'Objetivo atualizado com sucesso!' });
  }

  async function handleSelectModality(type: ModalityType) {
    if (!activeGoal) return;
    await updateGoal({ ...activeGoal, activeModality: type });
    setShowModalities(false);
  }

  function handleDateChange(text: string) {
    const digits = text.replace(/\D/g, '');
    let formatted = digits;
    if (digits.length > 2) formatted = digits.slice(0, 2) + '/' + digits.slice(2);
    if (digits.length > 4) formatted = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4, 8);
    setNewGoalDate(formatted);
  }

  function parseDate(dateStr: string): Date | null {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts.map(Number);
    if (!day || !month || !year || year < 2000) return null;
    const d = new Date(year, month - 1, day);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  async function handleAddGoal() {
    if (!newGoalName.trim()) {
      show({ type: 'warning', title: 'Atenção', message: 'Informe o nome do objetivo.' });
      return;
    }
    const amount = parseCurrency(newGoalAmount);
    if (amount <= 0) {
      show({ type: 'warning', title: 'Atenção', message: 'Informe um valor válido.' });
      return;
    }
    const dateObj = parseDate(newGoalDate);
    if (!dateObj || dateObj <= new Date()) {
      show({ type: 'warning', title: 'Atenção', message: 'Informe uma data futura válida (DD/MM/AAAA).' });
      return;
    }
    const goal: Goal = {
      id: Date.now().toString(),
      name: newGoalName.trim(),
      userName: activeGoal?.userName || user?.email?.split('@')[0] || 'Você',
      targetAmount: amount,
      targetDate: dateObj.toISOString(),
      createdAt: new Date().toISOString(),
      activeModality: 'daily',
    };
    await addGoal(goal);
    setShowNewGoal(false);
    setNewGoalName('');
    setNewGoalAmount('');
    setNewGoalDate('');
    show({ type: 'success', title: 'Criado!', message: `Objetivo "${goal.name}" adicionado e ativado.` });
  }

  function handleDeleteGoal(goalToDelete: Goal) {
    if (goals.length <= 1) {
      show({ type: 'warning', title: 'Atenção', message: 'Você precisa ter pelo menos um objetivo.' });
      return;
    }
    const role = myRoleByGoal[goalToDelete.id];
    const isOwner = role === 'owner' || !role;
    if (!isOwner) {
      // Não é dono — sair do objetivo compartilhado
      showConfirm({
        title: 'Sair do objetivo',
        message: `Deseja sair do objetivo "${goalToDelete.name}"?`,
        confirmText: 'Sair',
        destructive: true,
        icon: 'exit-outline',
        onConfirm: async () => {
          hideConfirm();
          if (user) {
            await removeGoalMember(goalToDelete.id, user.id);
            await refresh();
            show({ type: 'success', title: 'Pronto', message: 'Você saiu do objetivo.' });
          }
        },
      });
      return;
    }
    const savingsCount = savings.filter(s => s.goalId === goalToDelete.id).length;
    showConfirm({
      title: 'Excluir objetivo',
      message: `Excluir "${goalToDelete.name}"? ${savingsCount > 0 ? `${savingsCount} economia(s) serão removidas.` : ''}`,
      confirmText: 'Excluir',
      destructive: true,
      icon: 'trash-outline',
      onConfirm: async () => {
        hideConfirm();
        await deleteGoal(goalToDelete.id);
        show({ type: 'success', title: 'Excluído', message: 'Objetivo removido.' });
      },
    });
  }

  function handleLogout() {
    showConfirm({
      title: 'Sair da conta',
      message: 'Deseja sair da sua conta?',
      confirmText: 'Sair',
      destructive: true,
      icon: 'log-out-outline',
      onConfirm: async () => {
        hideConfirm();
        await signOut();
        router.replace('/login');
      },
    });
  }

  function handleExportCSV() {
    if (!activeGoal) {
      show({ type: 'warning', title: 'Atenção', message: 'Selecione um objetivo primeiro.' });
      return;
    }
    const goalSavings = savings
      .filter(sv => sv.goalId === activeGoal.id || (!sv.goalId && activeGoal === goals[0]))
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (goalSavings.length === 0) {
      show({ type: 'warning', title: 'Nada para exportar', message: 'Este objetivo ainda não tem economias.' });
      return;
    }
    const csv = savingsToCSV(goalSavings, activeGoal);
    const safeName = activeGoal.name.replace(/[^a-zA-Z0-9\-_]/g, '_').slice(0, 40) || 'objetivo';
    const filename = `cofry-${safeName}-${new Date().toISOString().slice(0, 10)}.csv`;
    if (Platform.OS === 'web') {
      const ok = downloadCSV(csv, filename);
      if (ok) {
        show({ type: 'success', title: 'Exportado', message: `${goalSavings.length} registros baixados.` });
      } else {
        show({ type: 'error', title: 'Erro', message: 'Não foi possível exportar.' });
      }
    } else {
      (async () => {
        try {
          const file = new ExpoFile(Paths.cache, filename);
          file.create({ overwrite: true });
          file.write('\uFEFF' + csv);
          await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Exportar economias' });
        } catch {
          show({ type: 'error', title: 'Erro', message: 'Não foi possível exportar os dados.' });
        }
      })();
    }
  }

  function handleReset() {
    showConfirm({
      title: 'Resetar tudo',
      message: 'Isso vai apagar todos os seus dados. Deseja continuar?',
      confirmText: 'Resetar',
      destructive: true,
      icon: 'trash-outline',
      onConfirm: async () => {
        hideConfirm();
        await resetAll();
        await cancelAllNotifications();
        router.replace('/onboarding');
      },
    });
  }

  const s = styles(theme);
  const THEME_OPTIONS: { label: string; value: 'light' | 'dark' | 'system'; icon: string }[] = [
    { label: 'Claro', value: 'light', icon: 'sunny-outline' },
    { label: 'Escuro', value: 'dark', icon: 'moon-outline' },
    { label: 'Sistema', value: 'system', icon: 'phone-portrait-outline' },
  ];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[s.screenTitle, { color: theme.colors.text }]}>Ajustes</Text>

        {/* Profile section */}
        {isConfigured && user && (
          <View style={[s.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={s.sectionHeader}>
              <Ionicons name="person-circle" size={18} color={Colors.primary} />
              <Text style={[s.sectionTitle, { color: theme.colors.text }]}>Perfil</Text>
            </View>
            <View style={s.profileRow}>
              <View style={[s.profileAvatar, { backgroundColor: Colors.primary + '20' }]}>
                <Ionicons name="person" size={28} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.profileName, { color: theme.colors.text }]}>{user.email?.split('@')[0] || 'Usuário'}</Text>
                <Text style={[s.profileEmail, { color: theme.colors.textSecondary }]}>{user.email}</Text>
              </View>
            </View>
            <TouchableOpacity style={[s.outlineBtn, { borderColor: Colors.error }]} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={16} color={Colors.error} />
              <Text style={[s.outlineBtnText, { color: Colors.error, marginLeft: 6 }]}>Sair da conta</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Goals section */}
        <View style={[s.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={s.sectionHeader}>
            <Ionicons name="flag" size={18} color={Colors.primary} />
            <Text style={[s.sectionTitle, { color: theme.colors.text }]}>Objetivos ({goals.length})</Text>
          </View>

          {/* Goal list */}
          {goals.map(g => {
            const isActive = g.id === activeGoal?.id;
            const gSavings = savings.filter(sv => !sv.goalId || sv.goalId === g.id);
            const gTotal = gSavings.reduce((sum, sv) => sum + sv.amount, 0);
            const gPct = g.targetAmount > 0 ? Math.min(1, gTotal / g.targetAmount) : 0;
            const role = myRoleByGoal[g.id];
            const memberCount = memberCountByGoal[g.id] || 0;
            const isShared = memberCount > 1;
            const canEdit = role === 'owner' || role === 'editor';
            const canDelete = role === 'owner';
            return (
              <View
                key={g.id}
                style={[
                  s.goalItem,
                  {
                    backgroundColor: isActive ? Colors.primary + '08' : theme.colors.background,
                    borderColor: isActive ? Colors.primary + '40' : theme.colors.border,
                  },
                ]}
              >
                <TouchableOpacity
                  style={s.goalItemTop}
                  onPress={() => setActiveGoal(g.id)}
                  activeOpacity={0.7}
                >
                  <View style={[s.goalDot, { backgroundColor: isActive ? Colors.primary : theme.colors.border }]} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={[s.goalItemName, { color: theme.colors.text }]}>{g.name}</Text>
                      {isShared && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#8B5CF6' + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                          <Ionicons name="people" size={10} color="#8B5CF6" />
                          <Text style={{ fontSize: 10, color: '#8B5CF6', fontWeight: '600' }}>{memberCount}</Text>
                        </View>
                      )}
                      {role && role !== 'owner' && (() => {
                        const roleMeta: Record<string, { label: string; color: string }> = {
                          editor: { label: 'Editor', color: '#3B82F6' },
                          participant: { label: 'Participante', color: '#10B981' },
                          viewer: { label: 'Aguardando aprovação', color: '#F59E0B' },
                        };
                        const m = roleMeta[role] || { label: role, color: '#6B7280' };
                        return (
                          <View style={{ backgroundColor: m.color + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                            <Text style={{ fontSize: 10, color: m.color, fontWeight: '600' }}>{m.label}</Text>
                          </View>
                        );
                      })()}
                    </View>
                    <Text style={[s.goalItemSub, { color: theme.colors.textSecondary }]}>
                      {formatCurrency(gTotal)} / {formatCurrency(g.targetAmount)} ({Math.round(gPct * 100)}%)
                    </Text>
                  </View>
                  {isActive && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
                </TouchableOpacity>
                {isActive && (canEdit || canDelete) && (
                  <View style={s.goalItemActions}>
                    {canEdit && (
                      <TouchableOpacity
                        style={[s.goalActionBtn, { borderColor: Colors.primary + '40' }]}
                        onPress={() => {
                          setGoalName(g.name);
                          setGoalAmount(formatCurrency(g.targetAmount));
                          setGoalEmoji(g.emoji || '🐷');
                          setGoalColor(g.color || '#10B981');
                          setGoalDescription(g.description || '');
                          setEditingGoal(true);
                        }}
                      >
                        <Ionicons name="pencil-outline" size={14} color={Colors.primary} />
                        <Text style={[s.goalActionText, { color: Colors.primary }]}>Editar</Text>
                      </TouchableOpacity>
                    )}
                    {canDelete ? (
                      <TouchableOpacity
                        style={[s.goalActionBtn, { borderColor: Colors.error + '40' }]}
                        onPress={() => handleDeleteGoal(g)}
                      >
                        <Ionicons name="trash-outline" size={14} color={Colors.error} />
                        <Text style={[s.goalActionText, { color: Colors.error }]}>Excluir</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[s.goalActionBtn, { borderColor: Colors.error + '40' }]}
                        onPress={() => handleDeleteGoal(g)}
                      >
                        <Ionicons name="exit-outline" size={14} color={Colors.error} />
                        <Text style={[s.goalActionText, { color: Colors.error }]}>Sair</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {/* Add new goal */}
          <TouchableOpacity
            style={[s.addGoalBtn, { borderColor: Colors.primary }]}
            onPress={() => setShowNewGoal(true)}
          >
            <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
            <Text style={[s.addGoalText, { color: Colors.primary }]}>Novo objetivo</Text>
          </TouchableOpacity>
        </View>

        {/* Edit Goal Modal */}
        {editingGoal && (
          <View style={[s.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[s.sectionTitle, { color: theme.colors.text, marginBottom: 12 }]}>Editar Objetivo</Text>

            <Text style={[s.label, { color: theme.colors.textSecondary }]}>Ícone</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {['🐷','🎯','✈️','🏠','🚗','💍','🎓','💻','🎮','📱','👶','🐾','🏖️','💰'].map(em => (
                <TouchableOpacity
                  key={em}
                  onPress={() => setGoalEmoji(em)}
                  style={{
                    width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: goalEmoji === em ? Colors.primary + '30' : theme.colors.background,
                    borderWidth: 2, borderColor: goalEmoji === em ? Colors.primary : theme.colors.border,
                  }}
                >
                  <Text style={{ fontSize: 22 }}>{em}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[s.label, { color: theme.colors.textSecondary }]}>Cor</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {['#10B981','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316'].map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setGoalColor(c)}
                  style={{
                    width: 36, height: 36, borderRadius: 18, backgroundColor: c,
                    borderWidth: goalColor === c ? 3 : 0, borderColor: theme.colors.text,
                  }}
                />
              ))}
            </View>

            <Text style={[s.label, { color: theme.colors.textSecondary }]}>Nome do objetivo</Text>
            <TextInput
              style={[s.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              value={goalName}
              onChangeText={setGoalName}
              placeholder="Nome do objetivo"
              placeholderTextColor={theme.colors.textSecondary}
              maxLength={50}
            />
            <Text style={[s.label, { color: theme.colors.textSecondary }]}>Valor alvo</Text>
            <TextInput
              style={[s.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              value={goalAmount}
              onChangeText={v => setGoalAmount(maskCurrency(v))}
              placeholder="R$ 0,00"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
            />
            <Text style={[s.label, { color: theme.colors.textSecondary }]}>Descrição (opcional)</Text>
            <TextInput
              style={[s.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background, minHeight: 60, textAlignVertical: 'top' }]}
              value={goalDescription}
              onChangeText={setGoalDescription}
              placeholder="Ex: Viagem em família de 15 dias"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              maxLength={200}
            />
            <View style={s.editBtnsRow}>
              <TouchableOpacity style={[s.outlineBtn, { borderColor: theme.colors.border, flex: 1 }]} onPress={() => setEditingGoal(false)}>
                <Text style={[s.outlineBtnText, { color: theme.colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.solidBtn, { flex: 1 }]} onPress={handleSaveGoal}>
                <Text style={s.solidBtnText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Modality */}
        {activeGoal && (() => {
          const myRole = myRoleByGoal[activeGoal.id];
          const canChangeModality = !myRole || myRole === 'owner' || myRole === 'editor';
          return (
          <View style={[s.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={s.sectionHeader}>
              <Ionicons name="swap-horizontal" size={18} color={Colors.primary} />
              <Text style={[s.sectionTitle, { color: theme.colors.text }]}>Modalidade</Text>
            </View>
            <Text style={[s.infoSub, { color: theme.colors.textSecondary }]}>
              Atual: {activeGoal.activeModality === 'daily' ? 'Diária' : activeGoal.activeModality === 'weekly' ? 'Semanal' : 'Mensal'}
            </Text>
            {canChangeModality ? (
              <>
                <TouchableOpacity style={[s.outlineBtn, { borderColor: Colors.primary }]} onPress={() => setShowModalities(!showModalities)}>
                  <Text style={[s.outlineBtnText, { color: Colors.primary }]}>
                    {showModalities ? 'Fechar' : 'Alterar modalidade'}
                  </Text>
                </TouchableOpacity>
                {showModalities && (
                  <View style={{ marginTop: 12 }}>
                    {modalities.map(m => (
                      <ModalityCard
                        key={m.type}
                        modality={m}
                        selected={activeGoal.activeModality === m.type}
                        onSelect={() => handleSelectModality(m.type)}
                      />
                    ))}
                  </View>
                )}
              </>
            ) : (
              <Text style={[s.infoSub, { color: theme.colors.textSecondary, fontStyle: 'italic' }]}>
                🔒 Apenas o dono ou editores podem alterar a modalidade.
              </Text>
            )}
          </View>
          );
        })()}

        {/* Export CSV */}
        {activeGoal && (
          <View style={[s.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={s.sectionHeader}>
              <Ionicons name="download-outline" size={18} color={Colors.primary} />
              <Text style={[s.sectionTitle, { color: theme.colors.text }]}>Exportar dados</Text>
            </View>
            <Text style={[s.infoSub, { color: theme.colors.textSecondary }]}>
              Baixe um CSV com todas as economias deste objetivo (abre no Excel/Sheets).
            </Text>
            <TouchableOpacity style={[s.outlineBtn, { borderColor: Colors.primary }]} onPress={handleExportCSV}>
              <Text style={[s.outlineBtnText, { color: Colors.primary }]}>📊 Baixar CSV</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Notifications */}
        <View style={[s.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={s.sectionHeader}>
            <Ionicons name="notifications" size={18} color={Colors.primary} />
            <Text style={[s.sectionTitle, { color: theme.colors.text }]}>Notificações</Text>
          </View>
          <View style={s.switchRow}>
            <Text style={[s.switchLabel, { color: theme.colors.text }]}>Lembretes ativos</Text>
            <Switch
              value={notifications.enabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: theme.colors.border, true: Colors.primary + '80' }}
              thumbColor={notifications.enabled ? Colors.primary : theme.colors.textSecondary}
            />
          </View>
          {notifications.enabled && (
            <>
              <Text style={[s.label, { color: theme.colors.textSecondary }]}>Frequência</Text>
              <View style={s.freqRow}>
                {(['daily', 'weekly'] as const).map(f => (
                  <TouchableOpacity
                    key={f}
                    style={[
                      s.freqBtn,
                      {
                        backgroundColor: notifications.frequency === f ? Colors.primary : theme.colors.background,
                        borderColor: notifications.frequency === f ? Colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => handleFrequencyChange(f)}
                  >
                    <Text style={[s.freqBtnText, { color: notifications.frequency === f ? '#fff' : theme.colors.textSecondary }]}>
                      {f === 'daily' ? 'Diário' : 'Semanal'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        {/* Theme */}
        <View style={[s.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={s.sectionHeader}>
            <Ionicons name="color-palette" size={18} color={Colors.primary} />
            <Text style={[s.sectionTitle, { color: theme.colors.text }]}>Aparência</Text>
          </View>
          <View style={s.themeRow}>
            {THEME_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  s.themeBtn,
                  {
                    backgroundColor: themeMode === opt.value ? Colors.primary : theme.colors.background,
                    borderColor: themeMode === opt.value ? Colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setThemeMode(opt.value)}
              >
                <Ionicons name={opt.icon as any} size={16} color={themeMode === opt.value ? '#fff' : theme.colors.textSecondary} />
                <Text style={[s.themeBtnText, { color: themeMode === opt.value ? '#fff' : theme.colors.textSecondary }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reset */}
        <View style={[s.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={s.sectionHeader}>
            <Ionicons name="trash" size={18} color={Colors.error} />
            <Text style={[s.sectionTitle, { color: theme.colors.text }]}>Dados</Text>
          </View>
          <TouchableOpacity style={[s.exportBtn, { borderColor: Colors.primary }]} onPress={handleExportCSV}>
            <Ionicons name="download-outline" size={16} color={Colors.primary} />
            <Text style={[s.exportBtnText, { color: Colors.primary }]}>Exportar dados (CSV)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.dangerBtn, { borderColor: Colors.error }]} onPress={handleReset}>
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
            <Text style={[s.dangerBtnText, { color: Colors.error }]}>Resetar todos os dados</Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <View style={s.versionRow}>
          <Ionicons name="information-circle-outline" size={14} color={theme.colors.textSecondary} />
          <Text style={[s.versionText, { color: theme.colors.textSecondary }]}>Cofry v3.2.0</Text>
        </View>
      </ScrollView>

      <ConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        destructive={confirmModal.destructive}
        icon={confirmModal.icon}
        onConfirm={confirmModal.onConfirm}
        onCancel={hideConfirm}
      />

      {/* New Goal Modal */}
      <Modal visible={showNewGoal} transparent animationType="fade" onRequestClose={() => setShowNewGoal(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setShowNewGoal(false)}>
          <Pressable style={[s.modalContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[s.modalTitle, { color: theme.colors.text }]}>Novo Objetivo</Text>

            <Text style={[s.label, { color: theme.colors.textSecondary }]}>Nome do objetivo</Text>
            <TextInput
              style={[s.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              value={newGoalName}
              onChangeText={setNewGoalName}
              placeholder="Ex: Novo celular"
              placeholderTextColor={theme.colors.textSecondary}
              maxLength={60}
            />

            <Text style={[s.label, { color: theme.colors.textSecondary }]}>Valor alvo</Text>
            <TextInput
              style={[s.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              value={newGoalAmount}
              onChangeText={v => setNewGoalAmount(maskCurrency(v))}
              placeholder="R$ 0,00"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
            />

            <Text style={[s.label, { color: theme.colors.textSecondary }]}>Data alvo (DD/MM/AAAA)</Text>
            <TextInput
              style={[s.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              value={newGoalDate}
              onChangeText={handleDateChange}
              placeholder="Ex: 31/12/2026"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
              maxLength={10}
            />

            <View style={s.editBtnsRow}>
              <TouchableOpacity style={[s.outlineBtn, { borderColor: theme.colors.border, flex: 1 }]} onPress={() => setShowNewGoal(false)}>
                <Text style={[s.outlineBtnText, { color: theme.colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.solidBtn, { flex: 1 }]} onPress={handleAddGoal}>
                <Text style={s.solidBtnText}>Criar</Text>
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
  scroll: { padding: 20, paddingBottom: 40 },
  screenTitle: { fontSize: 24, fontWeight: '800', marginBottom: 20 },
  section: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  profileAvatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  profileName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  profileEmail: { fontSize: 13 },
  infoText: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  infoSub: { fontSize: 13, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
  },
  outlineBtn: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  outlineBtnText: { fontSize: 14, fontWeight: '600' },
  solidBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 8,
  },
  solidBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  editBtnsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  switchLabel: { fontSize: 15 },
  freqRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  freqBtn: { flex: 1, borderWidth: 1.5, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  freqBtnText: { fontSize: 14, fontWeight: '600' },
  themeRow: { flexDirection: 'row', gap: 8 },
  themeBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 4,
  },
  themeBtnText: { fontSize: 12, fontWeight: '600' },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 10,
  },
  dangerBtnText: { fontSize: 14, fontWeight: '600' },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 12,
  },
  exportBtnText: { fontSize: 14, fontWeight: '600' },
  versionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8 },
  versionText: { fontSize: 12 },
  // Goal management
  goalItem: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  goalItemTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  goalDot: { width: 10, height: 10, borderRadius: 5 },
  goalItemName: { fontSize: 15, fontWeight: '600' },
  goalItemSub: { fontSize: 12, marginTop: 2 },
  goalItemActions: { flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.border },
  goalActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 7,
  },
  goalActionText: { fontSize: 12, fontWeight: '600' },
  addGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 10,
    borderStyle: 'dashed',
    paddingVertical: 12,
    marginTop: 4,
  },
  addGoalText: { fontSize: 14, fontWeight: '600' },
  // Modal
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
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
});
