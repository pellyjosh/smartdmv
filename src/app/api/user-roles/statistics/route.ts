import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { users, roles, userRoles } from '@/db/schema';
import { eq, and, count, isNull, or } from 'drizzle-orm';

// GET user role assignment statistics for a practice
export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const { searchParams } = request.nextUrl;
    const practiceId = searchParams.get('practiceId');

    if (!practiceId) {
      return NextResponse.json({ error: 'Practice ID is required' }, { status: 400 });
    }

    // Get total user count for the practice
    const [totalUsersResult] = await tenantDb
      .select({ count: count() })
      .from(users)
      .where(eq(users.practiceId, parseInt(practiceId)));

    const totalUsers = totalUsersResult?.count || 0;

    // Get role assignment statistics
    const roleStats = await tenantDb
      .select({
        roleId: roles.id,
        roleName: roles.name,
        roleDisplayName: roles.displayName,
        isSystemDefined: roles.isSystemDefined,
        userCount: count(userRoles.userId)
      })
      .from(roles)
      .leftJoin(userRoles, and(
        eq(userRoles.roleId, roles.id),
        eq(userRoles.isActive, true)
      ))
      .leftJoin(users, and(
        eq(users.id, userRoles.userId),
        eq(users.practiceId, parseInt(practiceId))
      ))
      .where(
        or(
          eq(roles.practiceId, parseInt(practiceId)),
          and(eq(roles.isSystemDefined, true), isNull(roles.practiceId))
        )
      )
      .groupBy(roles.id, roles.name, roles.displayName, roles.isSystemDefined);

    // Get legacy role counts (users who haven't been migrated to role assignments)
    const legacyRoleStats = await tenantDb
      .select({
        roleName: users.role,
        userCount: count(users.id)
      })
      .from(users)
      .where(eq(users.practiceId, parseInt(practiceId)))
      .groupBy(users.role);

    // Combine the statistics, prioritizing role assignments over legacy roles
    const combinedStats = new Map();

    // Add legacy role counts first
  legacyRoleStats.forEach((stat: { roleName: string | null; userCount: number | null }) => {
      if (stat.roleName) {
        combinedStats.set(stat.roleName, {
          roleName: stat.roleName,
          roleDisplayName: stat.roleName,
          isSystemDefined: true,
          userCount: stat.userCount || 0,
          source: 'legacy'
        });
      }
    });

    // Override with role assignment counts (these are more accurate)
  roleStats.forEach((stat: { roleId: number; roleName: string; roleDisplayName: string | null; isSystemDefined: boolean; userCount: number | null }) => {
        if ((stat.userCount || 0) > 0) {
        combinedStats.set(stat.roleName, {
          roleId: stat.roleId,
          roleName: stat.roleName,
          roleDisplayName: stat.roleDisplayName,
          isSystemDefined: stat.isSystemDefined,
          userCount: stat.userCount || 0,
          source: 'assignments'
        });
      }
    });

    // Get users without any role assignments (for statistics)
    const [unassignedUsersResult] = await tenantDb
      .select({ count: count() })
      .from(users)
      .leftJoin(userRoles, and(
        eq(userRoles.userId, users.id),
        eq(userRoles.isActive, true)
      ))
      .where(and(
        eq(users.practiceId, parseInt(practiceId)),
        isNull(userRoles.id)
      ));

    const unassignedUsers = unassignedUsersResult?.count || 0;

    return NextResponse.json({
      totalUsers,
      unassignedUsers,
      roleDistribution: Array.from(combinedStats.values()),
      summary: {
        totalAssignedUsers: totalUsers - unassignedUsers,
        totalRoles: roleStats.length,
        customRoles: roleStats.filter((r: { isSystemDefined: boolean }) => !r.isSystemDefined).length,
        systemRoles: roleStats.filter((r: { isSystemDefined: boolean }) => r.isSystemDefined).length
      }
    });

  } catch (error) {
    console.error('Error fetching user role statistics:', error);
    return NextResponse.json({ error: 'Failed to fetch user role statistics' }, { status: 500 });
  }
}
