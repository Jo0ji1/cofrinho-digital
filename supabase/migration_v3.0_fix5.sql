-- ============================================
-- Migration v3.0 Fix 5 - Fix CHECK constraint + enable Realtime
--
-- Run AFTER migration_v3.0_fix4.sql
-- Fixes the critical bug: "new row violates check constraint goal_members_role_check"
-- ============================================

-- =====================================================
-- 1) Update goal_members.role CHECK to include 'viewer'
-- =====================================================
ALTER TABLE goal_members DROP CONSTRAINT IF EXISTS goal_members_role_check;
ALTER TABLE goal_members ADD CONSTRAINT goal_members_role_check
  CHECK (role IN ('owner', 'editor', 'participant', 'viewer'));

-- =====================================================
-- 2) Enable Realtime on collaboration tables
--    (so owner sees changes without manual refresh)
-- =====================================================
-- Supabase Realtime uses publications; add our tables if not already added
DO $$
BEGIN
  -- savings
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'savings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE savings;
  END IF;

  -- goal_members
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'goal_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE goal_members;
  END IF;

  -- goals
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'goals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE goals;
  END IF;

  -- goal_activities
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'goal_activities'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE goal_activities;
  END IF;
END $$;

-- =====================================================
-- 3) When a member is removed, decrement used_count of
--    their most recently consumed invite so the owner
--    can re-invite them without "convite esgotado" spam.
--    (Best-effort: we can't track exactly which invite
--    they used, so we reset the newest still-valid one.)
-- =====================================================
-- Actually, simpler: we just make sure max_uses is high enough.
-- Current client uses max_uses=10 so this is already fine.
-- We only need a function to regenerate invite code easily (below).

-- =====================================================
-- 4) RPC: regenerate invite code (for owner to get fresh code)
-- =====================================================
CREATE OR REPLACE FUNCTION public.regenerate_goal_invite(p_goal_id TEXT, p_expires_in_days INT DEFAULT 7)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_code TEXT;
  v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I confusion
  v_len INT := 6;
  v_i INT;
  v_new_id UUID;
  v_role TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  -- Must be owner or editor of the goal
  SELECT role INTO v_role FROM goal_members WHERE goal_id = p_goal_id AND user_id = v_uid;
  IF v_role IS NULL OR v_role NOT IN ('owner', 'editor') THEN
    RETURN json_build_object('success', false, 'error', 'Sem permissão para gerar convite');
  END IF;

  -- Generate unique code
  LOOP
    v_code := '';
    FOR v_i IN 1..v_len LOOP
      v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM goal_invites WHERE invite_code = v_code);
  END LOOP;

  -- Invalidate previous active invites for this goal (optional — helps cleanup)
  UPDATE goal_invites SET expires_at = now()
   WHERE goal_id = p_goal_id AND expires_at > now();

  INSERT INTO goal_invites (goal_id, invite_code, created_by, max_uses, expires_at)
  VALUES (p_goal_id, v_code, v_uid, 10, now() + (p_expires_in_days || ' days')::interval)
  RETURNING id INTO v_new_id;

  RETURN json_build_object('success', true, 'invite_code', v_code, 'invite_id', v_new_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.regenerate_goal_invite TO authenticated;
