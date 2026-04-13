import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useData } from '../../contexts/DataContext';
import { ModalityCard } from '../../components/ModalityCard';
import { getModalityInfos } from '../../utils/calculations';
import { formatCurrency, maskCurrency, parseCurrency } from '../../utils/currency';
import { requestNotificationPermissions, scheduleNotification, cancelAllNotifications } from '../../utils/notifications';
import { ModalityType } from '../../types';
import { Colors } from '../../constants/colors';

export default function SettingsScreen() {
  const { theme, themeMode, setThemeMode } = useTheme();
  const { goal, setGoal, notifications, setNotifications, resetAll } = useData();
  const router = useRouter();

  const [showModalities, setShowModalities] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalName, setGoalName] = useState(goal?.name || '');
  const [goalAmount, setGoalAmount] = useState(goal ? formatCurrency(goal.targetAmount) : '');

  const modalities = goal ? getModalityInfos(goal, []) : [];

  async function handleNotificationToggle(value: boolean) {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert('Permissão negada', 'Habilite as notificações nas configurações do dispositivo.');
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
    if (!goal) return;
    if (!goalName.trim()) {
      Alert.alert('Atenção', 'Informe um nome para o objetivo.');
      return;
    }
    const amount = parseCurrency(goalAmount);
    if (amount <= 0) {
      Alert.alert('Atenção', 'Informe um valor válido.');
      return;
    }
    await setGoal({ ...goal, name: goalName.trim(), targetAmount: amount });
    setEditingGoal(false);
    Alert.alert('Salvo', 'Objetivo atualizado com sucesso!');
  }

  async function handleSelectModality(type: ModalityType) {
    if (!goal) return;
    await setGoal({ ...goal, activeModality: type });
    setShowModalities(false);
  }

  async function handleReset() {
    Alert.alert(
      'Resetar tudo',
      'Isso vai apagar todos os seus dados. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resetar',
          style: 'destructive',
          onPress: async () => {
            await resetAll();
            await cancelAllNotifications();
            router.replace('/onboarding');
          },
        },
      ],
    );
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

        {/* Goal section */}
        {goal && (
          <View style={[s.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={s.sectionHeader}>
              <Ionicons name="flag" size={18} color={Colors.primary} />
              <Text style={[s.sectionTitle, { color: theme.colors.text }]}>Objetivo</Text>
            </View>
            {!editingGoal ? (
              <>
                <Text style={[s.infoText, { color: theme.colors.text }]}>{goal.name}</Text>
                <Text style={[s.infoSub, { color: theme.colors.textSecondary }]}>{formatCurrency(goal.targetAmount)}</Text>
                <TouchableOpacity style={[s.outlineBtn, { borderColor: Colors.primary }]} onPress={() => setEditingGoal(true)}>
                  <Text style={[s.outlineBtnText, { color: Colors.primary }]}>Editar objetivo</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[s.label, { color: theme.colors.textSecondary }]}>Nome do objetivo</Text>
                <TextInput
                  style={[s.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                  value={goalName}
                  onChangeText={setGoalName}
                  placeholder="Nome do objetivo"
                  placeholderTextColor={theme.colors.textSecondary}
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
                <View style={s.editBtnsRow}>
                  <TouchableOpacity style={[s.outlineBtn, { borderColor: theme.colors.border, flex: 1 }]} onPress={() => setEditingGoal(false)}>
                    <Text style={[s.outlineBtnText, { color: theme.colors.textSecondary }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.solidBtn, { flex: 1 }]} onPress={handleSaveGoal}>
                    <Text style={s.solidBtnText}>Salvar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}

        {/* Modality */}
        {goal && (
          <View style={[s.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={s.sectionHeader}>
              <Ionicons name="swap-horizontal" size={18} color={Colors.primary} />
              <Text style={[s.sectionTitle, { color: theme.colors.text }]}>Modalidade</Text>
            </View>
            <Text style={[s.infoSub, { color: theme.colors.textSecondary }]}>
              Atual: {goal.activeModality === 'daily' ? 'Diária' : goal.activeModality === 'weekly' ? 'Semanal' : 'Mensal'}
            </Text>
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
                    selected={goal.activeModality === m.type}
                    onSelect={() => handleSelectModality(m.type)}
                  />
                ))}
              </View>
            )}
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
          <TouchableOpacity style={[s.dangerBtn, { borderColor: Colors.error }]} onPress={handleReset}>
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
            <Text style={[s.dangerBtnText, { color: Colors.error }]}>Resetar todos os dados</Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <View style={s.versionRow}>
          <Ionicons name="information-circle-outline" size={14} color={theme.colors.textSecondary} />
          <Text style={[s.versionText, { color: theme.colors.textSecondary }]}>Cofrinho Digital v1.0.0</Text>
        </View>
      </ScrollView>
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
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
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
  },
  dangerBtnText: { fontSize: 14, fontWeight: '600' },
  versionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8 },
  versionText: { fontSize: 12 },
});
