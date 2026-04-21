import { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { GoalRole } from '../types';

export interface GoalPermissions {
  role: GoalRole | null;
  isShared: boolean;
  memberCount: number;
  canEditGoal: boolean;
  canDeleteGoal: boolean;
  canInvite: boolean;
  canManageMembers: boolean;
  loading: boolean;
}

/**
 * Returns the current user's permissions over a given goal.
 * - canEditGoal / canInvite: owner or editor
 * - canDeleteGoal / canManageMembers: owner only
 * - isShared: goal has more than one member
 */
export function useGoalPermissions(goalId: string | undefined): GoalPermissions {
  const { getGoalMembers } = useData();
  const { user } = useAuth();
  const [role, setRole] = useState<GoalRole | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!goalId || !user) {
        setRole(null);
        setMemberCount(0);
        setLoading(false);
        return;
      }
      setLoading(true);
      const members = await getGoalMembers(goalId);
      if (cancel) return;
      setMemberCount(members.length);
      const mine = members.find(m => m.userId === user.id);
      // If there are no members yet but goal exists, assume owner (offline/backfill case)
      setRole(mine?.role ?? (members.length === 0 ? 'owner' : null));
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [goalId, user?.id]);

  const isOwner = role === 'owner';
  const isEditor = role === 'editor';
  const isShared = memberCount > 1;

  return {
    role,
    isShared,
    memberCount,
    canEditGoal: isOwner || isEditor,
    canDeleteGoal: isOwner,
    canInvite: isOwner || isEditor,
    canManageMembers: isOwner,
    loading,
  };
}
