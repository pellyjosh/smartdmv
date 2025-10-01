import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { users, UserRoleEnum } from '@/db/schemas/usersSchema';
import { eq, and } from 'drizzle-orm';
import { ResourceType, StandardAction } from '@/lib/rbac/types';
import { hasPermission } from '@/lib/rbac-helpers';

// GET /api/practices/[practiceId]/clients - list clients of a practice
export async function GET(request: NextRequest, { params }: { params: Promise<{ practiceId: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { practiceId } = await params;
    const pid = parseInt(practiceId);
    if (!pid || Number.isNaN(pid)) return NextResponse.json({ error: 'Invalid practice id' }, { status: 400 });
    if (user.practiceId !== pid) return NextResponse.json({ error: 'Access denied to this practice' }, { status: 403 });
    // Permission: need READ on BILLING or INVOICE or general BILLING access to view clients for billing


    const hasUpdatePermission = hasPermission(user, StandardAction.READ, ResourceType.BILLING);
    const isAdministrator = user.role === 'ADMINISTRATOR' || user.role === 'SUPER_ADMIN' || user.role === 'PRACTICE_ADMINISTRATOR';
    
    if (!hasUpdatePermission && !isAdministrator) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const tenantDb = await getCurrentTenantDb();
    const rows = await tenantDb.select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(and(eq(users.practiceId, pid), eq(users.role, UserRoleEnum.CLIENT)));
    return NextResponse.json(rows);
  } catch (e) {
    console.error('Error fetching practice clients', e);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}