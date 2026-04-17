import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Share, ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/colors';
import { GoalMember, GoalInvite } from '../types';
import { showAlert } from '../utils/alert';

export default function SharedGoalScreen() {
  const { theme } = useTheme();
  const { activeGoal, getGoalMembers, createGoalInvite, joinGoalByInvite, removeGoalMember, getGoalInvites } = useData();
  const { user } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<GoalMember[]>([]);
  const [invites, setInvites] = useState<GoalInvite[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'members' | 'join'>('members');

  const loadData = useCallback(async () => {
    if (!activeGoal) return;
    const [m, inv] = await Promise.all([
      getGoalMembers(activeGoal.id),
      getGoalInvites(activeGoal.id),
    ]);
    setMembers(m);
    setInvites(inv);
  }, [activeGoal?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreateInvite = async () => {
    if (!activeGoal) return;
    setLoading(true);
    const invite = await createGoalInvite(activeGoal.id);
    setLoading(false);
    if (invite) {
      setInviteCode(invite.inviteCode);
      await loadData();
    } else {
      showAlert('Erro', 'Não foi possível criar o convite. Verifique sua conexão.');
    }
  };

  const handleShareInvite = async (code: string) => {
    const message = `🐷 Entre no meu Poupi compartilhado!\n\nCódigo de convite: ${code}\n\nBaixe o Poupi e use este código para economizar junto comigo!`;
    try {
      if (Platform.OS === 'web') {
        // Tentar Web Share API
        if (typeof navigator !== 'undefined' && (navigator as any).share) {
          await (navigator as any).share({ title: 'Poupi', text: message });
          return;
        }
        // Fallback: copiar para clipboard
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(code);
          showAlert('Código copiado!', `O código ${code} foi copiado para sua área de transferência.`);
          return;
        }
        showAlert('Código de convite', code);
        return;
      }
      await Share.share({ message });
    } catch {}
  };

  const handleJoinGoal = async () => {
    const code = joinCode.trim();
    if (!code) {
      showAlert('Atenção', 'Digite o código de convite');
      return;
    }
    setLoading(true);
    const result = await joinGoalByInvite(code);
    setLoading(false);
    if (result.success) {
      showAlert('Sucesso! 🎉', `Você entrou no objetivo "${result.goalName}"!`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
      setJoinCode('');
    } else {
      showAlert('Erro', result.error || 'Não foi possível entrar no objetivo');
    }
  };

  const handleRemoveMember = (member: GoalMember) => {
    if (member.userId === user?.id) {
      showAlert('Sair do objetivo', 'Deseja sair deste objetivo compartilhado?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair', style: 'destructive', onPress: async () => {
            await removeGoalMember(member.goalId, member.userId);
            router.back();
          },
        },
      ]);
    } else {
      showAlert('Remover membro', `Remover ${member.userName} do objetivo?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover', style: 'destructive', onPress: async () => {
            await removeGoalMember(member.goalId, member.userId);
            await loadData();
          },
        },
      ]);
    }
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case 'owner': return '👑 Dono';
      case 'editor': return '✏️ Editor';
      default: return '👤 Participante';
    }
  };

  const roleColor = (role: string) => {
    switch (role) {
      case 'owner': return '#F59E0B';
      case 'editor': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const s = styles(theme);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.colors.text }]}>Poupi Compartilhado</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        <TouchableOpacity
          style={[s.tab, tab === 'members' && { backgroundColor: Colors.primary + '20', borderColor: Colors.primary }]}
          onPress={() => setTab('members')}
        >
          <Ionicons name="people" size={18} color={tab === 'members' ? Colors.primary : theme.colors.textSecondary} />
          <Text style={[s.tabText, { color: tab === 'members' ? Colors.primary : theme.colors.textSecondary }]}>
            Meu objetivo
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === 'join' && { backgroundColor: Colors.primary + '20', borderColor: Colors.primary }]}
          onPress={() => setTab('join')}
        >
          <Ionicons name="enter" size={18} color={tab === 'join' ? Colors.primary : theme.colors.textSecondary} />
          <Text style={[s.tabText, { color: tab === 'join' ? Colors.primary : theme.colors.textSecondary }]}>
            Entrar em objetivo
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
      >
        {tab === 'members' ? (
          <>
            {/* Current Goal Info */}
            {activeGoal && (
              <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={s.goalRow}>
                  <View style={[s.goalIcon, { backgroundColor: Colors.primary + '15' }]}>
                    <Text style={{ fontSize: 24 }}>🐷</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.goalName, { color: theme.colors.text }]}>{activeGoal.name}</Text>
                    <Text style={[s.goalSub, { color: theme.colors.textSecondary }]}>
                      {members.length > 0 ? `${members.length} membro${members.length > 1 ? 's' : ''}` : 'Apenas você'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Members List */}
            {members.length > 0 && (
              <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[s.cardTitle, { color: theme.colors.textSecondary }]}>Membros</Text>
                {members.map((m, i) => (
                  <View key={m.id} style={[s.memberRow, i < members.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}>
                    <View style={[s.avatar, { backgroundColor: roleColor(m.role) + '20' }]}>
                      <Text style={{ fontSize: 16 }}>{m.role === 'owner' ? '👑' : '🙂'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.memberName, { color: theme.colors.text }]}>
                        {m.userName}{m.userId === user?.id ? ' (você)' : ''}
                      </Text>
                      <Text style={[s.memberRole, { color: roleColor(m.role) }]}>{roleLabel(m.role)}</Text>
                    </View>
                    {m.userId !== user?.id && members.find(x => x.userId === user?.id)?.role === 'owner' && (
                      <TouchableOpacity onPress={() => handleRemoveMember(m)} style={s.removeBtn}>
                        <Ionicons name="close-circle" size={22} color={Colors.error} />
                      </TouchableOpacity>
                    )}
                    {m.userId === user?.id && m.role !== 'owner' && (
                      <TouchableOpacity onPress={() => handleRemoveMember(m)} style={s.removeBtn}>
                        <Ionicons name="exit-outline" size={20} color={Colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Create Invite */}
            <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[s.cardTitle, { color: theme.colors.textSecondary }]}>Convidar pessoas</Text>
              <Text style={[s.desc, { color: theme.colors.textSecondary }]}>
                Gere um código de convite e compartilhe com amigos ou familiares para economizarem juntos!
              </Text>

              {inviteCode ? (
                <View style={s.inviteCodeBox}>
                  <View style={[s.codeDisplay, { backgroundColor: theme.colors.background, borderColor: Colors.primary }]}>
                    <Text style={[s.codeText, { color: Colors.primary }]}>{inviteCode}</Text>
                  </View>
                  <TouchableOpacity
                    style={[s.shareBtn, { backgroundColor: Colors.primary }]}
                    onPress={() => handleShareInvite(inviteCode)}
                  >
                    <Ionicons name="share-outline" size={18} color="#FFF" />
                    <Text style={s.shareBtnText}>Compartilhar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[s.createBtn, { backgroundColor: Colors.primary }]}
                  onPress={handleCreateInvite}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="link" size={18} color="#FFF" />
                      <Text style={s.createBtnText}>Gerar código de convite</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Active Invites */}
              {invites.length > 0 && (
                <View style={s.invitesList}>
                  <Text style={[s.invitesTitle, { color: theme.colors.textSecondary }]}>Convites ativos</Text>
                  {invites.map(inv => {
                    const isExpired = new Date(inv.expiresAt) < new Date();
                    const isFull = inv.usedCount >= inv.maxUses;
                    return (
                      <View key={inv.id} style={[s.inviteItem, { borderColor: theme.colors.border }]}>
                        <TouchableOpacity onPress={() => handleShareInvite(inv.inviteCode)} style={{ flex: 1 }}>
                          <Text style={[s.inviteItemCode, { color: isExpired || isFull ? theme.colors.textSecondary : Colors.primary }]}>
                            {inv.inviteCode}
                          </Text>
                          <Text style={[s.inviteItemInfo, { color: theme.colors.textSecondary }]}>
                            {inv.usedCount}/{inv.maxUses} usos
                            {isExpired ? ' • Expirado' : isFull ? ' • Lotado' : ''}
                          </Text>
                        </TouchableOpacity>
                        <Ionicons name="share-outline" size={16} color={theme.colors.textSecondary} />
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        ) : (
          /* Join Tab */
          <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={s.joinHeader}>
              <View style={[s.joinIcon, { backgroundColor: Colors.primary + '15' }]}>
                <Text style={{ fontSize: 32 }}>🤝</Text>
              </View>
              <Text style={[s.joinTitle, { color: theme.colors.text }]}>Entrar em um Poupi</Text>
              <Text style={[s.joinDesc, { color: theme.colors.textSecondary }]}>
                Peça o código de convite para o dono do objetivo e cole abaixo
              </Text>
            </View>

            <TextInput
              style={[s.joinInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              placeholder="Ex: AB12CD"
              placeholderTextColor={theme.colors.textSecondary}
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="characters"
              maxLength={8}
            />

            <TouchableOpacity
              style={[s.joinBtn, { backgroundColor: joinCode.trim() ? Colors.primary : theme.colors.border }]}
              onPress={handleJoinGoal}
              disabled={loading || !joinCode.trim()}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="enter-outline" size={18} color="#FFF" />
                  <Text style={s.joinBtnText}>Entrar no objetivo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scroll: { padding: 20, paddingBottom: 40 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  tabText: { fontSize: 13, fontWeight: '600' },
  card: { borderRadius: 18, padding: 18, borderWidth: 1, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 13, fontWeight: '600', marginBottom: 12 },
  desc: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  goalIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  goalName: { fontSize: 16, fontWeight: '700' },
  goalSub: { fontSize: 12, marginTop: 2 },
  // Members
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  memberName: { fontSize: 14, fontWeight: '600' },
  memberRole: { fontSize: 12, marginTop: 1 },
  removeBtn: { padding: 4 },
  // Invite
  inviteCodeBox: { alignItems: 'center', gap: 12 },
  codeDisplay: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, borderWidth: 2 },
  codeText: { fontSize: 28, fontWeight: '800', letterSpacing: 6 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  shareBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  createBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  invitesList: { marginTop: 16 },
  invitesTitle: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  inviteItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  inviteItemCode: { fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  inviteItemInfo: { fontSize: 11, marginTop: 1 },
  // Join
  joinHeader: { alignItems: 'center', marginBottom: 20 },
  joinIcon: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  joinTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  joinDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  joinInput: { fontSize: 20, fontWeight: '700', textAlign: 'center', letterSpacing: 4, borderWidth: 1, borderRadius: 14, paddingVertical: 14, marginBottom: 14 },
  joinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  joinBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
