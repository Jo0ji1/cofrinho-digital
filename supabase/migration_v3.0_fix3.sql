-- ============================================
-- Migration v3.0 Fix 3
-- Backfill existing goal owners into goal_members
-- Allow viewing profile names of co-members (for member list UI)
-- ============================================

-- 1) Backfill: add every goal's owner (goals.user_id) as 'owner' in goal_members
INSERT INTO goal_members (goal_id, user_id, role)
SELECT g.id, g.user_id, 'owner'
FROM goals g
WHERE NOT EXISTS (
  SELECT 1 FROM goal_members m
  WHERE m.goal_id = g.id AND m.user_id = g.user_id
);

-- 2) Allow users to read profiles of users they share a goal with
--    (so the shared-goal screen can display member names)
DROP POLICY IF EXISTS "Users can view co-member profiles" ON profiles;
CREATE POLICY "Users can view co-member profiles"
ON profiles FOR SELECT
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1
    FROM goal_members m1
    JOIN goal_members m2 ON m1.goal_id = m2.goal_id
    WHERE m1.user_id = auth.uid() AND m2.user_id = profiles.id
  )
);

-- 3) Allow owners to update role of members (for promote/demote)
DROP POLICY IF EXISTS "Owners can update member roles" ON goal_members;
CREATE POLICY "Owners can update member roles"
ON goal_members FOR UPDATE
USING (public.is_goal_owner(goal_id))
WITH CHECK (public.is_goal_owner(goal_id));
