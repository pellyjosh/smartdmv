import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { users, roles, userRoles } from '@/db/schema';
import { z } from 'zod';
import { eq, and, count, isNull, or } from 'drizzle-orm';
import { createAuditLog } from '@/lib/audit-logger';

// GET roles for a practice
export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const { searchParams } = request.nextUrl;
    const practiceId = searchParams.get('practiceId');
    const available = searchParams.get('available') === 'true';

    if (!practiceId) {
      return NextResponse.json({ error: 'Practice ID is required' }, { status: 400 });
    }

    // Get all roles for the practice (system-defined and custom)
    const rolesData = await tenantDb.select().from(roles).where(
      or(
        eq(roles.practiceId, parseInt(practiceId)),
        and(eq(roles.isSystemDefined, true), isNull(roles.practiceId))
      )
    );

    // Get user counts for each role - using both legacy users.role and new user_roles table
    const userCounts = await Promise.all(
      rolesData.map(async (role: any) => {
        // Count from legacy users.role field
        const [legacyResult] = await tenantDb
          .select({ count: count() })
          .from(users)
          .where(and(
            eq(users.practiceId, parseInt(practiceId)),
            eq(users.role, role.name)
          ));
        
        // Count from new user_roles assignments
        const [assignedResult] = await tenantDb
          .select({ count: count() })
          .from(userRoles)
          .innerJoin(users, eq(users.id, userRoles.userId))
          .where(and(
            eq(users.practiceId, parseInt(practiceId)),
            eq(userRoles.roleId, role.id),
            eq(userRoles.isActive, true)
          ));
        
        // Use the higher count (handles transition period where both might exist)
        const totalCount = Math.max(legacyResult?.count || 0, assignedResult?.count || 0);
        
        return { roleId: role.id, count: totalCount };
      })
    );

    // Combine roles with user counts
    const rolesWithCounts = rolesData.map((role: any) => {
      const userCount = userCounts.find(uc => uc.roleId === role.id)?.count || 0;
      return {
        ...role,
        userCount,
        permissions: Array.isArray(role.permissions) ? role.permissions : [],
        isCustom: !role.isSystemDefined, // Add the isCustom property that the frontend expects
      };
    });

    if (available) {
      // Return simplified format for dropdowns
      return NextResponse.json(rolesWithCounts.map((role: any) => ({
        id: role.id.toString(),
        name: role.name,
        displayName: role.displayName,
        type: role.isSystemDefined ? 'system' : 'custom',
        isActive: role.isActive
      })));
    }

    return NextResponse.json(rolesWithCounts);
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}

// POST create custom role
export async function POST(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const body = await request.json();
    
    const roleSchema = z.object({
      name: z.string().min(2),
      displayName: z.string().min(2),
      description: z.string().optional(),
      permissions: z.array(z.object({
        id: z.string(),
        resource: z.string(),
        action: z.string(),
        granted: z.boolean(),
        category: z.string(),
      })),
      practiceId: z.number()
    });

    const validatedData = roleSchema.parse(body);

    // Check if role name already exists for this practice
    const existingRole = await tenantDb.select().from(roles).where(
      and(
        eq(roles.name, validatedData.name as string),
        or(
          eq(roles.practiceId, validatedData.practiceId as number),
          eq(roles.isSystemDefined, true)
        )
      )
    );

    if (existingRole.length > 0) {
      return NextResponse.json({ error: 'Role name already exists' }, { status: 400 });
    }

    // Create the role
    const [newRole] = await tenantDb.insert(roles).values({
      name: validatedData.name as string,
      displayName: validatedData.displayName as string,
      description: validatedData.description as string | undefined,
      permissions: validatedData.permissions,
      practiceId: validatedData.practiceId as number,
      isSystemDefined: false,
      isActive: true,
    }).returning();

    // Log audit event
    await createAuditLog({
      action: 'CREATE',
      practiceId: (validatedData.practiceId as number).toString(),
      recordType: 'ROLE',
      recordId: newRole.id.toString(),
      description: `Created custom role: ${validatedData.displayName}`,
      changes: {
        after: newRole,
      },
    });

    return NextResponse.json({
      ...newRole,
      userCount: 0,
      permissions: Array.isArray(newRole.permissions) ? newRole.permissions : [],
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating role:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }
}
