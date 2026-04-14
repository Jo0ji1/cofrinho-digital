import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useData } from '../contexts/DataContext';
import { ModalityCard } from '../components/ModalityCard';
import { getModalityInfos } from '../utils/calculations';
import { ModalityType } from '../types';
import { Colors } from '../constants/colors';

export default function ModalitiesScreen() {
  const { theme } = useTheme();
  const { goal, setGoal, completeOnboarding } = useData();
  const router = useRouter();
  const [selected, setSelected] = useState<ModalityType>('daily');

  if (!goal) {
    router.replace('/onboarding');
    return null;
  }

  const modalities = getModalityInfos(goal, []);

  async function handleConfirm() {
    await setGoal({ ...goal!, activeModality: selected });
    await completeOnboarding();
    router.replace('/(tabs)');
  }

  const s = styles(theme);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[s.title, { color: theme.colors.text }]}>Escolha sua Modalidade</Text>
          <Text style={[s.subtitle, { color: theme.colors.textSecondary }]}>
            Como você prefere economizar para {goal.name}?
          </Text>
        </View>

        <View style={s.list}>
          {modalities.map(m => (
            <ModalityCard
              key={m.type}
              modality={m}
              selected={selected === m.type}
              onSelect={() => setSelected(m.type)}
            />
          ))}
        </View>

        <TouchableOpacity style={[s.btn, { backgroundColor: Colors.primary }]} onPress={handleConfirm} activeOpacity={0.85}>
          <Text style={s.btnText}>Começar a economizar!</Text>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 40 },
  header: { marginBottom: 24, marginTop: 8 },
  backBtn: { marginBottom: 16, width: 36 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  list: { marginBottom: 8 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 8,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
