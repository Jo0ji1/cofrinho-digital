-- ============================================
-- Poupi v3.0 - FIX 2: join_goal_by_invite hardening
-- Execute este SQL no SQL Editor do Supabase
-- ============================================
-- Reescreve a RPC usando FOUND (mais confiável) e
-- tratamento transacional explícito para garantir que
-- o contador só incremente se o INSERT funcionar.
-- Também adiciona search_path para resolver warning
-- do Security Advisor.
-- ============================================

CREATE OR REPLACE FUNCTION join_goal_by_invite(p_invite_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_invite_id UUID;
  v_goal_id TEXT;
  v_goal_name TEXT;
  v_max_uses INT;
  v_used_count INT;
  v_expires TIMESTAMPTZ;
  v_user UUID := auth.uid();
BEGIN
  -- Usuário autenticado?
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Você precisa estar autenticado');
  END IF;

  -- Normalizar código
  p_invite_code := UPPER(TRIM(p_invite_code));

  -- Buscar convite
  SELECT id, goal_id, max_uses, used_count, expires_at
    INTO v_invite_id, v_goal_id, v_max_uses, v_used_count, v_expires
    FROM goal_invites
   WHERE invite_code = p_invite_code
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Código de convite inválido');
  END IF;

  IF v_expires <= NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Este convite expirou');
  END IF;

  IF v_used_count >= v_max_uses THEN
    RETURN json_build_object('success', false, 'error', 'Este convite atingiu o limite de usos');
  END IF;

  -- Já é membro?
  IF EXISTS (
    SELECT 1 FROM goal_members
     WHERE goal_id = v_goal_id AND user_id = v_user
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Você já participa deste objetivo');
  END IF;

  -- Verificar se o objetivo ainda existe
  SELECT name INTO v_goal_name FROM goals WHERE id = v_goal_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Objetivo não existe mais');
  END IF;

  -- Inserir o membro
  INSERT INTO goal_members (goal_id, user_id, role)
  VALUES (v_goal_id, v_user, 'participant');

  -- Somente incrementar contador se INSERT foi bem-sucedido
  UPDATE goal_invites SET used_count = used_count + 1 WHERE id = v_invite_id;

  RETURN json_build_object(
    'success', true,
    'goal_id', v_goal_id,
    'goal_name', v_goal_name
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Erro ao entrar no objetivo: ' || SQLERRM
  );
END;
$$;

-- ============================================
-- Corrigir search_path das outras funções (warnings)
-- ============================================
ALTER FUNCTION is_goal_member(TEXT, UUID) SET search_path = public, auth;
ALTER FUNCTION get_user_goal_ids(UUID) SET search_path = public, auth;
ALTER FUNCTION is_goal_owner_or_editor(TEXT, UUID) SET search_path = public, auth;
ALTER FUNCTION is_goal_owner(TEXT, UUID) SET search_path = public, auth;
ALTER FUNCTION handle_new_user() SET search_path = public, auth;
