import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getUserAssignedRoles, isUserPracticeAdmin, isUserSuperAdmin } from '@/lib/rbac/dynamic-roles';

// GET /api/user-roles/user/[userId]
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    const practiceId = userPractice.practiceId ? parseInt(userPractice.practiceId) : undefined;

    // Allow the user to fetch their own assigned roles, or practice admins / super admins
    const isSelf = String(userPractice.user.id) === String(userId);
    const allowed = isSelf ||
      await isUserPracticeAdmin(userPractice.user.id, practiceId) ||
      await isUserSuperAdmin(userPractice.user.id, practiceId);

    if (!allowed) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const assignedRoles = await getUserAssignedRoles(userId, practiceId);
    return NextResponse.json(assignedRoles);
  } catch (error) {
    console.error('Error fetching user assigned roles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
