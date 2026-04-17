-- ============================================
-- Poupi v3.0 - FIX: RLS Policy Recursion
-- Execute este SQL no SQL Editor do Supabase
-- ============================================
-- A migration anterior causou recursão infinita nas policies
-- de goal_members (tabela consulta a si mesma no SELECT policy).
-- Este fix usa SECURITY DEFINER para evitar a recursão.
-- ============================================

-- 1) Função auxiliar para verificar membership (bypassa RLS)
CREATE OR REPLACE FUNCTION is_goal_member(p_goal_id TEXT, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM goal_members WHERE goal_id = p_goal_id AND user_id = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_goal_ids(p_user_id UUID DEFAULT auth.uid())
RETURNS SETOF TEXT AS $$
  SELECT goal_id FROM goal_members WHERE user_id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_goal_owner_or_editor(p_goal_id TEXT, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM goal_members
    WHERE goal_id = p_goal_id AND user_id = p_user_id AND role IN ('owner', 'editor')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_goal_owner(p_goal_id TEXT, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM goal_members
    WHERE goal_id = p_goal_id AND user_id = p_user_id AND role = 'owner'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- 2) Recriar policies de goal_members SEM recursão
-- ============================================
DROP POLICY IF EXISTS "Members can view goal members" ON goal_members;
DROP POLICY IF EXISTS "Owners can insert goal members" ON goal_members;
DROP POLICY IF EXISTS "Owners can delete goal members" ON goal_members;
DROP POLICY IF EXISTS "Owners can update goal members" ON goal_members;

-- Ver membros: você é membro do mesmo objetivo
CREATE POLICY "Members can view goal members"
  ON goal_members FOR SELECT
  USING (is_goal_member(goal_id));

-- Inserir membros: owner/editor OU auto-inserção (join via invite)
CREATE POLICY "Owners can insert goal members"
  ON goal_members FOR INSERT
  WITH CHECK (
    is_goal_owner_or_editor(goal_id)
    OR user_id = auth.uid()
  );

-- Deletar: sair sozinho OU owner remove
CREATE POLICY "Owners can delete goal members"
  ON goal_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR is_goal_owner(goal_id)
  );

-- Atualizar: apenas owner
CREATE POLICY "Owners can update goal members"
  ON goal_members FOR UPDATE
  USING (is_goal_owner(goal_id));

-- ============================================
-- 3) Recriar policies de goal_invites
-- ============================================
DROP POLICY IF EXISTS "Members can view goal invites" ON goal_invites;
DROP POLICY IF EXISTS "Owners can create invites" ON goal_invites;
DROP POLICY IF EXISTS "Owners can delete invites" ON goal_invites;
DROP POLICY IF EXISTS "Anyone can read invite by code" ON goal_invites;

CREATE POLICY "Members can view goal invites"
  ON goal_invites FOR SELECT
  USING (is_goal_member(goal_id));

CREATE POLICY "Anyone can read invite by code"
  ON goal_invites FOR SELECT
  USING (true);

CREATE POLICY "Owners can create invites"
  ON goal_invites FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND is_goal_owner_or_editor(goal_id)
  );

CREATE POLICY "Owners can delete invites"
  ON goal_invites FOR DELETE
  USING (is_goal_owner(goal_id));

-- ============================================
-- 4) Recriar policies de goals (SELECT e UPDATE)
-- ============================================
DROP POLICY IF EXISTS "Users can view own or shared goals" ON goals;
DROP POLICY IF EXISTS "Users can update own or editable goals" ON goals;

CREATE POLICY "Users can view own or shared goals"
  ON goals FOR SELECT
  USING (
    auth.uid() = user_id
    OR is_goal_member(id)
  );

CREATE POLICY "Users can update own or editable goals"
  ON goals FOR UPDATE
  USING (
    auth.uid() = user_id
    OR is_goal_owner_or_editor(id)
  );

-- Garantir que INSERT e DELETE de goals ainda existem
DROP POLICY IF EXISTS "Users can insert own goals" ON goals;
CREATE POLICY "Users can insert own goals"
  ON goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own goals" ON goals;
CREATE POLICY "Users can delete own goals"
  ON goals FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 5) Recriar policy de savings SELECT
-- ============================================
DROP POLICY IF EXISTS "Users can view own or shared savings" ON savings;
DROP POLICY IF EXISTS "Users can view own savings" ON savings;

CREATE POLICY "Users can view own or shared savings"
  ON savings FOR SELECT
  USING (
    auth.uid() = user_id
    OR goal_id IN (SELECT get_user_goal_ids())
  );

-- Garantir que INSERT, UPDATE, DELETE de savings existem
DROP POLICY IF EXISTS "Users can insert own savings" ON savings;
CREATE POLICY "Users can insert own savings"
  ON savings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own savings" ON savings;
CREATE POLICY "Users can update own savings"
  ON savings FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own savings" ON savings;
CREATE POLICY "Users can delete own savings"
  ON savings FOR DELETE
  USING (auth.uid() = user_id);
