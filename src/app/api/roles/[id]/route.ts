import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { roles } from '@/db/schema';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { createAuditLog } from '@/lib/audit-logger';

// GET role by ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string  }> }) {
  const resolvedParams = await params;
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const roleId = parseInt(resolvedParams.id);
    
    if (isNaN(roleId)) {
      return NextResponse.json({ error: 'Invalid role ID' }, { status: 400 });
    }

    const [role] = await tenantDb.select().from(roles).where(eq(roles.id, roleId));
    
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...role,
      permissions: Array.isArray(role.permissions) ? role.permissions : [],
    });
  } catch (error) {
    console.error('Error fetching role:', error);
    return NextResponse.json({ error: 'Failed to fetch role' }, { status: 500 });
  }
}

// PUT update role
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string  }> }) {
  const resolvedParams = await params;
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const roleId = parseInt(resolvedParams.id);
    
    if (isNaN(roleId)) {
      return NextResponse.json({ error: 'Invalid role ID' }, { status: 400 });
    }

    const body = await request.json();
    
    const roleSchema = z.object({
      name: z.string().min(2).optional(),
      displayName: z.string().min(2).optional(),
      description: z.string().optional(),
      permissions: z.array(z.object({
        id: z.string(),
        resource: z.string(),
        action: z.string(),
        granted: z.boolean(),
        category: z.string(),
      })).optional(),
      isActive: z.boolean().optional(),
    });

    const validatedData = roleSchema.parse(body);

    // Get existing role first
    const [existingRole] = await tenantDb.select().from(roles).where(eq(roles.id, roleId));
    
    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Don't allow updating system-defined roles' core properties
    if (existingRole.isSystemDefined && (validatedData.name || validatedData.displayName)) {
      return NextResponse.json({ error: 'Cannot modify system-defined role properties' }, { status: 400 });
    }

    // Update the role
    const [updatedRole] = await tenantDb.update(roles)
      .set({
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.displayName && { displayName: validatedData.displayName }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.permissions && { permissions: validatedData.permissions }),
        ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
        updatedAt: new Date(),
      })
      .where(eq(roles.id, roleId))
      .returning();

    // Log audit event
    await createAuditLog({
      action: 'UPDATE',
      practiceId: existingRole.practiceId?.toString(),
      recordType: 'ROLE',
      recordId: roleId.toString(),
      description: `Updated role: ${updatedRole.displayName}`,
      changes: {
        before: existingRole,
        after: updatedRole,
      },
    });

    return NextResponse.json({
      ...updatedRole,
      permissions: Array.isArray(updatedRole.permissions) ? updatedRole.permissions : [],
    });
  } catch (error) {
    console.error('Error updating role:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}

// DELETE role
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string  }> }) {
  const resolvedParams = await params;
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const roleId = parseInt(resolvedParams.id);
    
    if (isNaN(roleId)) {
      return NextResponse.json({ error: 'Invalid role ID' }, { status: 400 });
    }

    // Get existing role first
    const [existingRole] = await tenantDb.select().from(roles).where(eq(roles.id, roleId));
    
    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Don't allow deleting system-defined roles
    if (existingRole.isSystemDefined) {
      return NextResponse.json({ error: 'Cannot delete system-defined role' }, { status: 400 });
    }

    // Delete the role
    await tenantDb.delete(roles).where(eq(roles.id, roleId));

    // Log audit event
    await createAuditLog({
      action: 'DELETE',
      practiceId: existingRole.practiceId?.toString(),
      recordType: 'ROLE',
      recordId: roleId.toString(),
      description: `Deleted custom role: ${existingRole.displayName}`,
      changes: {
        before: existingRole,
      },
    });

    return NextResponse.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
  }
}
