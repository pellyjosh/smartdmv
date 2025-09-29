import { NextResponse, NextRequest } from 'next/server';
import { getUserPractice, getCurrentUser } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { healthPlans, pets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isPracticeAdministrator, isVeterinarian, isAdmin } from '@/lib/rbac-helpers';
import { createAuditLog } from '@/lib/audit-logger';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const id = Number(resolvedParams.planId);
    if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid health plan id' }, { status: 400 });

    // Only staff or admins allowed to update health plans
    if (!(isPracticeAdministrator(user as any) || isVeterinarian(user as any) || isAdmin(user as any))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    console.log(`[api/health-plans/[planId]] PUT called for id=${id}`, { body });
    const { name, startDate, endDate, description } = body;    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Get the existing health plan for audit logging
    const existingPlan = await tenantDb.query.healthPlans.findFirst({ where: eq(healthPlans.id, id) });
    if (!existingPlan) return NextResponse.json({ error: 'Health plan not found' }, { status: 404 });

    // Update health plan
    const updated = await tenantDb.update(healthPlans)
      .set({
        name,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        description,
        updatedAt: new Date()
      })
      .where(eq(healthPlans.id, id))
      .returning();

    const updatedPlan = updated[0] ?? null;
    if (!updatedPlan) return NextResponse.json({ error: 'Failed to update health plan' }, { status: 500 });

    // Log the health plan update
    try {
      await createAuditLog({
        action: 'UPDATE',
        recordType: 'HEALTH_PLAN',
        recordId: id.toString(),
        description: `Health plan "${name}" updated`,
        userId: user.id.toString(),
        practiceId: existingPlan.practiceId?.toString(),
        metadata: {
          healthPlanId: id,
          healthPlanName: name,
          petId: existingPlan.petId
        },
        changes: {
          before: {
            name: existingPlan.name,
            startDate: existingPlan.startDate,
            endDate: existingPlan.endDate,
            description: existingPlan.description
          },
          after: {
            name,
            startDate,
            endDate,
            description
          }
        }
      });
    } catch (auditError) {
      console.error('Failed to create audit log for health plan update:', auditError);
      // Don't fail the main operation if audit logging fails
    }

    // Safe date conversion helper
    const safeToISOString = (value: any): string | null => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'string') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date.toISOString();
      }
      if (value instanceof Date) {
        return isNaN(value.getTime()) ? null : value.toISOString();
      }
      try {
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date.toISOString();
      } catch {
        return null;
      }
    };

    // Serialize date fields to safe ISO strings
    const safeUpdatedPlan = {
      ...updatedPlan,
      notes: (updatedPlan as any).notes ?? null,
      startDate: safeToISOString(updatedPlan.startDate),
      endDate: safeToISOString(updatedPlan.endDate),
      createdAt: safeToISOString(updatedPlan.createdAt),
      updatedAt: safeToISOString(updatedPlan.updatedAt),
    };

    return NextResponse.json(safeUpdatedPlan, { status: 200 });
  } catch (error) {
    console.error('Error updating health plan', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return NextResponse.json({ error: 'Failed to update health plan' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const id = Number(resolvedParams.planId);
    if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid health plan id' }, { status: 400 });
    console.log(`[api/health-plans/[planId]] GET called for id=${id}`);

    const healthPlan = await tenantDb.query.healthPlans.findFirst({ 
      where: eq(healthPlans.id, id),
      with: {
        pet: { columns: { id: true, name: true, species: true, breed: true } },
        practice: { columns: { id: true, name: true } }
      }
    });

    if (!healthPlan) return NextResponse.json({ error: 'Health plan not found' }, { status: 404 });

    // Authorization: check if user has access to this health plan
    const legacyRole = (user as any)?.role;
    const isAdminUser = legacyRole === 'ADMINISTRATOR' || legacyRole === 'SUPER_ADMIN' || isAdmin(user as any);
    const isPracticeUser = (isPracticeAdministrator(user as any) || isVeterinarian(user as any)) && 
                           Number((user as any).practiceId) === Number(healthPlan.practiceId);
    
    // Check if this is a client who owns the pet
    let isClientOwner = false;
    if (legacyRole === 'CLIENT') {
      // Get the pet to check ownership
      const pet = await tenantDb.query.pets.findFirst({
        where: eq(pets.id, healthPlan.petId),
        columns: { id: true, ownerId: true }
      });
      isClientOwner = !!(pet && Number(pet.ownerId) === Number(user.id));
      console.log(`[auth] Client ${user.id} checking access to health plan ${id}: pet owner=${pet?.ownerId}, isOwner=${isClientOwner}`);
    }

    if (!isAdminUser && !isPracticeUser && !isClientOwner) {
      console.log(`[auth] Access denied for user ${user.id} (role: ${legacyRole}) to health plan ${id}`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Safe date conversion helper
    const safeToISOString = (value: any): string | null => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'string') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date.toISOString();
      }
      if (value instanceof Date) {
        return isNaN(value.getTime()) ? null : value.toISOString();
      }
      try {
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date.toISOString();
      } catch {
        return null;
      }
    };

    // Serialize date fields to safe ISO strings
    const safeHealthPlan = {
      ...healthPlan,
      startDate: safeToISOString(healthPlan.startDate),
      endDate: safeToISOString(healthPlan.endDate),
      createdAt: safeToISOString(healthPlan.createdAt),
      updatedAt: safeToISOString(healthPlan.updatedAt),
    };

    return NextResponse.json(safeHealthPlan, { status: 200 });
  } catch (error) {
    console.error('Error fetching health plan', error);
    return NextResponse.json({ error: 'Failed to fetch health plan' }, { status: 500 });
  }
}
