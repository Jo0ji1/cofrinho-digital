-- ============================================
-- Cofrinho Digital v3.0 - Shared Goals Migration
-- Execute este SQL no SQL Editor do Supabase
-- ============================================

-- Coluna goal_id na tabela savings (se não existir)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'savings' AND column_name = 'goal_id') THEN
    ALTER TABLE savings ADD COLUMN goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- Tabela de membros de objetivo compartilhado
-- ============================================
CREATE TABLE IF NOT EXISTS goal_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id TEXT REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('owner', 'editor', 'participant')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (goal_id, user_id)
);

-- ============================================
-- Tabela de convites para objetivo compartilhado
-- ============================================
CREATE TABLE IF NOT EXISTS goal_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id TEXT REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  max_uses INT DEFAULT 10,
  used_count INT DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS para goal_members
-- ============================================
ALTER TABLE goal_members ENABLE ROW LEVEL SECURITY;

-- Membros podem ver outros membros do mesmo objetivo
CREATE POLICY "Members can view goal members"
  ON goal_members FOR SELECT
  USING (
    goal_id IN (
      SELECT gm.goal_id FROM goal_members gm WHERE gm.user_id = auth.uid()
    )
  );

-- Owners e editors podem adicionar membros
CREATE POLICY "Owners can insert goal members"
  ON goal_members FOR INSERT
  WITH CHECK (
    goal_id IN (
      SELECT gm.goal_id FROM goal_members gm
      WHERE gm.user_id = auth.uid() AND gm.role IN ('owner', 'editor')
    )
    OR user_id = auth.uid() -- Permitir auto-inserção (join via invite)
  );

-- Owners podem remover membros
CREATE POLICY "Owners can delete goal members"
  ON goal_members FOR DELETE
  USING (
    user_id = auth.uid() -- Pode sair sozinho
    OR goal_id IN (
      SELECT gm.goal_id FROM goal_members gm
      WHERE gm.user_id = auth.uid() AND gm.role = 'owner'
    )
  );

-- Owners podem atualizar roles
CREATE POLICY "Owners can update goal members"
  ON goal_members FOR UPDATE
  USING (
    goal_id IN (
      SELECT gm.goal_id FROM goal_members gm
      WHERE gm.user_id = auth.uid() AND gm.role = 'owner'
    )
  );

-- ============================================
-- RLS para goal_invites
-- ============================================
ALTER TABLE goal_invites ENABLE ROW LEVEL SECURITY;

-- Membros do objetivo podem ver convites
CREATE POLICY "Members can view goal invites"
  ON goal_invites FOR SELECT
  USING (
    goal_id IN (
      SELECT gm.goal_id FROM goal_members gm WHERE gm.user_id = auth.uid()
    )
  );

-- Owners e editors podem criar convites
CREATE POLICY "Owners can create invites"
  ON goal_invites FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND goal_id IN (
      SELECT gm.goal_id FROM goal_members gm
      WHERE gm.user_id = auth.uid() AND gm.role IN ('owner', 'editor')
    )
  );

-- Owners podem deletar convites
CREATE POLICY "Owners can delete invites"
  ON goal_invites FOR DELETE
  USING (
    goal_id IN (
      SELECT gm.goal_id FROM goal_members gm
      WHERE gm.user_id = auth.uid() AND gm.role = 'owner'
    )
  );

-- Anyone can read invite by code (for joining)
CREATE POLICY "Anyone can read invite by code"
  ON goal_invites FOR SELECT
  USING (true);

-- ============================================
-- Atualizar RLS de goals para permitir acesso de membros
-- ============================================

-- Remover políticas antigas de goals
DROP POLICY IF EXISTS "Users can view own goals" ON goals;
DROP POLICY IF EXISTS "Users can update own goals" ON goals;

-- Goals: usuário vê seus objetivos + objetivos onde é membro
CREATE POLICY "Users can view own or shared goals"
  ON goals FOR SELECT
  USING (
    auth.uid() = user_id
    OR id IN (SELECT gm.goal_id FROM goal_members gm WHERE gm.user_id = auth.uid())
  );

-- Goals: usuário pode atualizar seus objetivos + onde é editor/owner
CREATE POLICY "Users can update own or editable goals"
  ON goals FOR UPDATE
  USING (
    auth.uid() = user_id
    OR id IN (
      SELECT gm.goal_id FROM goal_members gm
      WHERE gm.user_id = auth.uid() AND gm.role IN ('owner', 'editor')
    )
  );

-- ============================================
-- Atualizar RLS de savings para objetivos compartilhados
-- ============================================
DROP POLICY IF EXISTS "Users can view own savings" ON savings;

CREATE POLICY "Users can view own or shared savings"
  ON savings FOR SELECT
  USING (
    auth.uid() = user_id
    OR goal_id IN (SELECT gm.goal_id FROM goal_members gm WHERE gm.user_id = auth.uid())
  );

-- ============================================
-- Função RPC para entrar em objetivo via código de convite
-- ============================================
CREATE OR REPLACE FUNCTION join_goal_by_invite(p_invite_code TEXT)
RETURNS JSON AS $$
DECLARE
  v_invite RECORD;
  v_goal RECORD;
  v_existing RECORD;
BEGIN
  -- Buscar convite válido
  SELECT * INTO v_invite FROM goal_invites
  WHERE invite_code = p_invite_code
    AND expires_at > NOW()
    AND used_count < max_uses;

  IF v_invite IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Convite inválido ou expirado');
  END IF;

  -- Verificar se já é membro
  SELECT * INTO v_existing FROM goal_members
  WHERE goal_id = v_invite.goal_id AND user_id = auth.uid();

  IF v_existing IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Você já participa deste objetivo');
  END IF;

  -- Adicionar como participante
  INSERT INTO goal_members (goal_id, user_id, role)
  VALUES (v_invite.goal_id, auth.uid(), 'participant');

  -- Incrementar uso
  UPDATE goal_invites SET used_count = used_count + 1 WHERE id = v_invite.id;

  -- Retornar dados do objetivo
  SELECT * INTO v_goal FROM goals WHERE id = v_invite.goal_id;

  RETURN json_build_object(
    'success', true,
    'goal_id', v_goal.id,
    'goal_name', v_goal.name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Atualizar categorias padrão para "Origem da economia"
-- ============================================
UPDATE categories SET name = 'Pix recebido', icon = '💸', color = '#10B981' WHERE name = 'Alimentação' AND is_default = TRUE;
UPDATE categories SET name = 'Sobra do salário', icon = '💰', color = '#3B82F6' WHERE name = 'Transporte' AND is_default = TRUE;
UPDATE categories SET name = 'Dinheiro em espécie', icon = '💵', color = '#059669' WHERE name = 'Lazer' AND is_default = TRUE;
UPDATE categories SET name = 'Desconto obtido', icon = '🏷️', color = '#F59E0B' WHERE name = 'Compras' AND is_default = TRUE;
UPDATE categories SET name = 'Economizei em compra', icon = '🛒', color = '#8B5CF6' WHERE name = 'Saúde' AND is_default = TRUE;
UPDATE categories SET name = 'Renda extra', icon = '📈', color = '#EC4899' WHERE name = 'Educação' AND is_default = TRUE;
UPDATE categories SET name = 'Cortei um gasto', icon = '✂️', color = '#EF4444' WHERE name = 'Moradia' AND is_default = TRUE;
-- "Outro" já existe, só atualizar ícone
UPDATE categories SET icon = '📌' WHERE name = 'Outro' AND is_default = TRUE;
