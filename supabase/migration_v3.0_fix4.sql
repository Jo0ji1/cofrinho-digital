-- ============================================
-- Migration v3.0 Fix 4 - Security hardening + features
--
-- Run AFTER migration_v3.0_fix.sql, fix2, fix3
-- ============================================

-- =====================================================
-- 1) NEW 'viewer' ROLE: join defaults to viewer (read-only)
-- =====================================================
-- The CHECK constraint on goal_members.role already allows TEXT;
-- we just need to update the join RPC to set 'viewer' as default.

-- Update join_goal_by_invite to insert viewer instead of participant
CREATE OR REPLACE FUNCTION public.join_goal_by_invite(p_invite_code TEXT)
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
  v_expires_at TIMESTAMPTZ;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  -- Fetch invite by code
  SELECT id, goal_id, max_uses, used_count, expires_at
    INTO v_invite_id, v_goal_id, v_max_uses, v_used_count, v_expires_at
  FROM public.goal_invites
  WHERE invite_code = upper(trim(p_invite_code))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Código inválido');
  END IF;

  IF v_expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Convite expirado');
  END IF;

  IF v_used_count >= v_max_uses THEN
    RETURN json_build_object('success', false, 'error', 'Convite esgotado (limite de usos atingido)');
  END IF;

  -- Already a member?
  IF EXISTS (
    SELECT 1 FROM public.goal_members
    WHERE goal_id = v_goal_id AND user_id = v_uid
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Você já participa deste objetivo');
  END IF;

  -- Insert as VIEWER (requires owner approval to contribute)
  INSERT INTO public.goal_members (goal_id, user_id, role)
  VALUES (v_goal_id, v_uid, 'viewer');

  -- Increment invite usage
  UPDATE public.goal_invites
  SET used_count = used_count + 1
  WHERE id = v_invite_id;

  -- Fetch goal name for response
  SELECT name INTO v_goal_name FROM public.goals WHERE id = v_goal_id;

  RETURN json_build_object('success', true, 'goal_id', v_goal_id, 'goal_name', v_goal_name, 'role', 'viewer');
END;
$$;

-- =====================================================
-- 2) BLOCK savings INSERT for viewers
-- =====================================================
-- Savings must be inserted only by owner/editor/participant (NOT viewer)
DROP POLICY IF EXISTS "Users can insert own savings" ON savings;
CREATE POLICY "Users can insert own or contributor savings"
  ON savings FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      -- Personal goal (no shared membership records)
      goal_id IS NULL
      OR EXISTS (
        SELECT 1 FROM goals g
        WHERE g.id = savings.goal_id AND g.user_id = auth.uid()
      )
      -- OR the user has a contributing role on the shared goal
      OR EXISTS (
        SELECT 1 FROM goal_members m
        WHERE m.goal_id = savings.goal_id
          AND m.user_id = auth.uid()
          AND m.role IN ('owner', 'editor', 'participant')
      )
    )
  );

-- =====================================================
-- 3) ACTIVITY FEED table
-- =====================================================
CREATE TABLE IF NOT EXISTS goal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('joined','left','promoted','demoted','removed','approved','added_saving','edited_saving','deleted_saving','created_invite','edited_goal','completed_goal')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS goal_activities_goal_idx ON goal_activities(goal_id, created_at DESC);

ALTER TABLE goal_activities ENABLE ROW LEVEL SECURITY;

-- RLS: members of the goal can view; any member can insert their own action
DROP POLICY IF EXISTS "Members can view activities" ON goal_activities;
CREATE POLICY "Members can view activities"
  ON goal_activities FOR SELECT
  USING (public.is_goal_member(goal_id));

DROP POLICY IF EXISTS "Members can log own activity" ON goal_activities;
CREATE POLICY "Members can log own activity"
  ON goal_activities FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_goal_member(goal_id)
  );

-- =====================================================
-- 4) GOAL customization: description + emoji + color
-- =====================================================
ALTER TABLE goals ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '🐷';
ALTER TABLE goals ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#10B981';
