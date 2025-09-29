import { NextResponse, NextRequest } from 'next/server';
import { getUserPractice, getCurrentUser } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { healthPlanMilestones, healthPlans, pets } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { isPracticeAdministrator, isVeterinarian, isAdmin } from '@/lib/rbac-helpers';
import { createAuditLog } from '@/lib/audit-logger';

export async function GET(request: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { planId: planIdParam } = await params;
  const planId = Number(planIdParam);
    if (Number.isNaN(planId)) return NextResponse.json({ error: 'Invalid plan id' }, { status: 400 });

    // Authorization: owners (client) and staff with access should be able to view
    const plan = await tenantDb.query.healthPlans.findFirst({ where: eq(healthPlans.id, planId) });
    if (!plan) return NextResponse.json({ error: 'Health plan not found' }, { status: 404 });

    // If client, ensure they own the pet
    if (user.role === 'CLIENT' && plan.petId) {
  const pet = await tenantDb.query.pets.findFirst({ where: eq(pets.id, plan.petId), columns: { ownerId: true } as any });
  if (!pet || (pet as any).ownerId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const milestones = await tenantDb.query.healthPlanMilestones.findMany({
      where: eq(healthPlanMilestones.healthPlanId, planId),
      orderBy: [asc(healthPlanMilestones.dueDate)],
    });

    return NextResponse.json(milestones, { status: 200 });
  } catch (error) {
    console.error('Error fetching milestones', error);
    return NextResponse.json({ error: 'Failed to fetch milestones' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { planId: planIdParam } = await params;
  const planId = Number(planIdParam);
    if (Number.isNaN(planId)) return NextResponse.json({ error: 'Invalid plan id' }, { status: 400 });

    // Only staff / admins can create milestones
    if (!(isPracticeAdministrator(user as any) || isVeterinarian(user as any) || isAdmin(user as any))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : null;
    const description = typeof body.description === 'string' ? body.description.trim() : null;
    const dueDate = body.dueDate ? new Date(body.dueDate) : null;

    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

    const inserted = await tenantDb.insert(healthPlanMilestones).values({
      healthPlanId: planId,
      title,
      description,
      dueDate,
      completed: false,
    }).returning();

    const milestone = inserted[0] ?? null;
    if (!milestone) return NextResponse.json({ error: 'Failed to create milestone' }, { status: 500 });

    // Get health plan details for audit logging
    const plan = await tenantDb.query.healthPlans.findFirst({ where: eq(healthPlans.id, planId) });

    // Log the milestone creation
    try {
      await createAuditLog({
        action: 'CREATE',
        recordType: 'HEALTH_PLAN',
        recordId: milestone.id.toString(),
        description: `Milestone "${title}" created for health plan "${plan?.name || 'Unknown'}" (ID: ${planId})`,
        userId: user.id.toString(),
        practiceId: plan?.practiceId?.toString(),
        metadata: {
          milestoneId: milestone.id,
          milestoneTitle: title,
          milestoneDescription: description,
          dueDate: dueDate?.toISOString() || null,
          healthPlanId: planId,
          healthPlanName: plan?.name || null
        }
      });
    } catch (auditError) {
      console.error('Failed to create audit log for milestone creation:', auditError);
      // Don't fail the main operation if audit logging fails
    }

    return NextResponse.json(milestone, { status: 201 });
  } catch (error) {
    console.error('Error creating milestone', error);
    return NextResponse.json({ error: 'Failed to create milestone' }, { status: 500 });
  }
}
