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
import { GoalMember, GoalInvite, GoalActivity } from '../types';
import { showAlert } from '../utils/alert';

export default function SharedGoalScreen() {
  const { theme } = useTheme();
  const { activeGoal, savings, getGoalMembers, createGoalInvite, regenerateInvite, joinGoalByInvite, removeGoalMember, updateMemberRole, getGoalInvites, getGoalActivities, refresh } = useData();
  const { user } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<GoalMember[]>([]);
  const [invites, setInvites] = useState<GoalInvite[]>([]);
  const [activities, setActivities] = useState<GoalActivity[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'members' | 'join'>('members');

  const loadData = useCallback(async () => {
    if (!activeGoal) return;
    const [m, inv, act] = await Promise.all([
      getGoalMembers(activeGoal.id),
      getGoalInvites(activeGoal.id),
      getGoalActivities(activeGoal.id, 15),
    ]);
    setMembers(m);
    setInvites(inv);
    setActivities(act);
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

  const handleRegenerateInvite = async () => {
    if (!activeGoal) return;
    showAlert(
      'Gerar novo código',
      'Isso vai invalidar o código atual e criar um novo. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Gerar novo', onPress: async () => {
            setLoading(true);
            const invite = await regenerateInvite(activeGoal.id);
            setLoading(false);
            if (invite) {
              setInviteCode(invite.inviteCode);
              await loadData();
            } else {
              showAlert('Erro', 'Não foi possível gerar novo código.');
            }
          },
        },
      ]
    );
  };

  const handleShareInvite = async (code: string) => {
    const message = `🐰 Entre no meu Cofry compartilhado!\n\nCódigo de convite: ${code}\n\nBaixe o Cofry e use este código para economizar junto comigo!`;
    try {
      if (Platform.OS === 'web') {
        // Tentar Web Share API
        if (typeof navigator !== 'undefined' && (navigator as any).share) {
          await (navigator as any).share({ title: 'Cofry', text: message });
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
    if (result.success) {
      await refresh();
    }
    setLoading(false);
    if (result.success) {
      showAlert('Sucesso! 🎉', `Você entrou no objetivo "${result.goalName}"!\n\nVá para a aba Início para visualizá-lo.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
      setJoinCode('');
    } else {
      showAlert('Erro', result.error || 'Não foi possível entrar no objetivo');
    }
  };

  const handleApprove = (member: GoalMember) => {
    showAlert(
      'Aprovar acesso',
      `Aprovar ${member.userName} como Participante?\n\nParticipantes podem registrar economias no objetivo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprovar', onPress: async () => {
            const ok = await updateMemberRole(member.goalId, member.userId, 'participant');
            if (ok) {
              await loadData();
              showAlert('✅ Aprovado', `${member.userName} agora pode registrar economias.`);
            } else {
              showAlert('Erro', 'Não foi possível aprovar.');
            }
          },
        },
      ]
    );
  };

  const handlePromote = (member: GoalMember) => {
    // Cycle: viewer → participant → editor → participant → viewer
    let newRole: 'editor' | 'participant' | 'viewer';
    let description: string;
    if (member.role === 'participant') {
      newRole = 'editor';
      description = 'Editores podem criar convites e editar o objetivo.';
    } else if (member.role === 'editor') {
      newRole = 'participant';
      description = 'Participantes registram economias mas não editam o objetivo.';
    } else {
      return; // viewer uses handleApprove
    }
    const action = newRole === 'editor' ? 'Promover a Editor' : 'Rebaixar a Participante';
    showAlert(
      action,
      `${action} ${member.userName}?\n\n${description}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar', onPress: async () => {
            const ok = await updateMemberRole(member.goalId, member.userId, newRole);
            if (ok) {
              await loadData();
            } else {
              showAlert('Erro', 'Não foi possível alterar a permissão.');
            }
          },
        },
      ]
    );
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
      case 'viewer': return '⏳ Aguardando aprovação';
      default: return '👤 Participante';
    }
  };

  const roleColor = (role: string) => {
    switch (role) {
      case 'owner': return '#F59E0B';
      case 'editor': return '#3B82F6';
      case 'viewer': return '#F59E0B';
      default: return '#10B981';
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
        <Text style={[s.headerTitle, { color: theme.colors.text }]}>Cofry Compartilhado</Text>
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
            {activeGoal ? (
              <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={s.goalRow}>
                  <View style={[s.goalIcon, { backgroundColor: Colors.primary + '15' }]}>
                    <Text style={{ fontSize: 24 }}>🐷</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.goalName, { color: theme.colors.text }]}>{activeGoal.name}</Text>
                    <Text style={[s.goalSub, { color: theme.colors.textSecondary }]}>
                      {members.length > 1 ? `${members.length} membros` : members.length === 1 ? '1 membro' : 'Apenas você'}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, alignItems: 'center', paddingVertical: 28 }]}>
                <Ionicons name="alert-circle-outline" size={36} color={theme.colors.textSecondary} />
                <Text style={[{ color: theme.colors.textSecondary, textAlign: 'center', marginTop: 8 }]}>
                  Selecione um objetivo primeiro para gerenciá-lo
                </Text>
              </View>
            )}

            {/* Members List - always shown when there's an active goal */}
            {activeGoal && (
              <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[s.cardTitle, { color: theme.colors.textSecondary }]}>
                  Membros {members.length > 0 ? `(${members.length})` : ''}
                </Text>

                {/* If no members registered yet, show current user as implicit owner */}
                {members.length === 0 && (
                  <View style={s.memberRow}>
                    <View style={[s.avatar, { backgroundColor: '#F59E0B' + '20' }]}>
                      <Text style={{ fontSize: 16 }}>👑</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.memberName, { color: theme.colors.text }]}>Você (dono)</Text>
                      <Text style={[s.memberRole, { color: '#F59E0B' }]}>👑 Dono</Text>
                    </View>
                  </View>
                )}

                {members.map((m, i) => {
                  const iAmOwner = members.find(x => x.userId === user?.id)?.role === 'owner';
                  const isMe = m.userId === user?.id;
                  const canManage = iAmOwner && !isMe && m.role !== 'owner';
                  return (
                    <View key={m.id} style={[s.memberRow, i < members.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}>
                      <View style={[s.avatar, { backgroundColor: roleColor(m.role) + '20' }]}>
                        <Text style={{ fontSize: 16 }}>{m.role === 'owner' ? '👑' : m.role === 'editor' ? '✏️' : m.role === 'viewer' ? '⏳' : '🙂'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.memberName, { color: theme.colors.text }]}>
                          {m.userName}{isMe ? ' (você)' : ''}
                        </Text>
                        <Text style={[s.memberRole, { color: roleColor(m.role) }]}>{roleLabel(m.role)}</Text>
                      </View>

                      {/* Approve viewer */}
                      {canManage && m.role === 'viewer' && (
                        <TouchableOpacity onPress={() => handleApprove(m)} style={[s.actionBtn, { backgroundColor: Colors.primary + '20', borderRadius: 8, paddingHorizontal: 10 }]}>
                          <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                          <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 12, marginLeft: 4 }}>Aprovar</Text>
                        </TouchableOpacity>
                      )}

                      {/* Promote/demote editor ↔ participant */}
                      {canManage && (m.role === 'editor' || m.role === 'participant') && (
                        <TouchableOpacity onPress={() => handlePromote(m)} style={s.actionBtn}>
                          <Ionicons
                            name={m.role === 'editor' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
                            size={22}
                            color={Colors.primary}
                          />
                        </TouchableOpacity>
                      )}

                      {/* Remove button */}
                      {canManage && (
                        <TouchableOpacity onPress={() => handleRemoveMember(m)} style={s.actionBtn}>
                          <Ionicons name="close-circle" size={22} color={Colors.error} />
                        </TouchableOpacity>
                      )}

                      {/* Leave button (self, non-owner) */}
                      {isMe && m.role !== 'owner' && (
                        <TouchableOpacity onPress={() => handleRemoveMember(m)} style={s.actionBtn}>
                          <Ionicons name="exit-outline" size={22} color={Colors.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}

                {/* Legend for roles (only visible to owner) */}
                {members.find(x => x.userId === user?.id)?.role === 'owner' && members.length > 1 && (
                  <View style={[s.legend, { borderTopColor: theme.colors.border }]}>
                    <Text style={[s.legendText, { color: theme.colors.textSecondary }]}>
                      <Ionicons name="arrow-up-circle-outline" size={12} color={Colors.primary} /> Promover a Editor  •  <Ionicons name="close-circle" size={12} color={Colors.error} /> Remover
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Contribution breakdown per member */}
            {activeGoal && members.length > 1 && (() => {
              const goalSavings = savings.filter(sv => sv.goalId === activeGoal.id);
              const totalContrib = goalSavings.reduce((sum, sv) => sum + sv.amount, 0);
              if (totalContrib === 0) return null;
              const perMember = members.map(m => {
                const memberSavings = goalSavings.filter(sv => sv.userId === m.userId);
                const amount = memberSavings.reduce((sum, sv) => sum + sv.amount, 0);
                return { member: m, amount, count: memberSavings.length };
              }).sort((a, b) => b.amount - a.amount);
              return (
                <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={[s.cardTitle, { color: theme.colors.textSecondary }]}>Contribuições</Text>
                  {perMember.map(pm => {
                    const pct = totalContrib > 0 ? (pm.amount / totalContrib) * 100 : 0;
                    const isMe = pm.member.userId === user?.id;
                    return (
                      <View key={pm.member.id} style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 13 }}>
                            {pm.member.userName}{isMe ? ' (você)' : ''}
                          </Text>
                          <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '600' }}>
                            R$ {pm.amount.toFixed(2).replace('.', ',')}
                          </Text>
                        </View>
                        <View style={{ height: 6, backgroundColor: theme.colors.background, borderRadius: 3, overflow: 'hidden' }}>
                          <View style={{ width: `${pct}%`, height: '100%', backgroundColor: roleColor(pm.member.role) }} />
                        </View>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 10, marginTop: 2 }}>
                          {pct.toFixed(1)}% • {pm.count} registro{pm.count !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              );
            })()}

            {/* Activity Feed */}
            {activities.length > 0 && (
              <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[s.cardTitle, { color: theme.colors.textSecondary }]}>📋 Atividade recente</Text>
                {activities.map((act, idx) => {
                  const iconMap: Record<string, { icon: any; color: string }> = {
                    joined: { icon: 'person-add', color: '#10B981' },
                    left: { icon: 'exit-outline', color: '#6B7280' },
                    approved: { icon: 'checkmark-circle', color: '#10B981' },
                    promoted: { icon: 'arrow-up-circle', color: '#3B82F6' },
                    demoted: { icon: 'arrow-down-circle', color: '#F59E0B' },
                    removed: { icon: 'close-circle', color: '#EF4444' },
                    added_saving: { icon: 'cash-outline', color: '#10B981' },
                    edited_saving: { icon: 'create-outline', color: '#3B82F6' },
                    deleted_saving: { icon: 'trash-outline', color: '#EF4444' },
                    created_invite: { icon: 'mail-outline', color: '#8B5CF6' },
                    edited_goal: { icon: 'pencil', color: '#3B82F6' },
                    completed_goal: { icon: 'trophy', color: '#F59E0B' },
                  };
                  const labelMap: Record<string, string> = {
                    joined: 'entrou no objetivo',
                    left: 'saiu do objetivo',
                    approved: 'foi aprovado',
                    promoted: 'foi promovido',
                    demoted: 'foi rebaixado',
                    removed: 'foi removido',
                    added_saving: 'registrou uma economia',
                    edited_saving: 'editou uma economia',
                    deleted_saving: 'removeu uma economia',
                    created_invite: 'criou um convite',
                    edited_goal: 'editou o objetivo',
                    completed_goal: 'concluiu o objetivo',
                  };
                  const meta = iconMap[act.action] || { icon: 'information-circle-outline', color: '#6B7280' };
                  const label = labelMap[act.action] || act.action;
                  const timeAgo = (() => {
                    const diff = Date.now() - new Date(act.createdAt).getTime();
                    const min = Math.floor(diff / 60000);
                    if (min < 1) return 'agora';
                    if (min < 60) return `${min}min atrás`;
                    const hr = Math.floor(min / 60);
                    if (hr < 24) return `${hr}h atrás`;
                    const d = Math.floor(hr / 24);
                    if (d < 30) return `${d}d atrás`;
                    return new Date(act.createdAt).toLocaleDateString('pt-BR');
                  })();
                  return (
                    <View key={act.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: idx < activities.length - 1 ? 1 : 0, borderBottomColor: theme.colors.border }}>
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: meta.color + '20', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                        <Ionicons name={meta.icon} size={16} color={meta.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.colors.text, fontSize: 13 }}>
                          <Text style={{ fontWeight: '700' }}>{act.userName || 'Alguém'}</Text> {label}
                        </Text>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 1 }}>{timeAgo}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
            {(() => {
              const myRole = members.find(x => x.userId === user?.id)?.role;
              const canInvite = !myRole || myRole === 'owner' || myRole === 'editor';
              if (!canInvite) return null;
              return (
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
                  <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
                    <TouchableOpacity
                      style={[s.shareBtn, { backgroundColor: Colors.primary, flex: 1 }]}
                      onPress={() => handleShareInvite(inviteCode)}
                    >
                      <Ionicons name="share-outline" size={18} color="#FFF" />
                      <Text style={s.shareBtnText}>Compartilhar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.shareBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.primary, flex: 1 }]}
                      onPress={handleRegenerateInvite}
                      disabled={loading}
                    >
                      <Ionicons name="refresh" size={18} color={Colors.primary} />
                      <Text style={[s.shareBtnText, { color: Colors.primary }]}>Novo código</Text>
                    </TouchableOpacity>
                  </View>
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
              );
            })()}
          </>
        ) : (
          /* Join Tab */
          <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={s.joinHeader}>
              <View style={[s.joinIcon, { backgroundColor: Colors.primary + '15' }]}>
                <Text style={{ fontSize: 32 }}>🤝</Text>
              </View>
              <Text style={[s.joinTitle, { color: theme.colors.text }]}>Entrar num Cofry</Text>
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
  actionBtn: { padding: 6, marginLeft: 2 },
  legend: { marginTop: 12, paddingTop: 10, borderTopWidth: 1 },
  legendText: { fontSize: 11, textAlign: 'center' },
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
