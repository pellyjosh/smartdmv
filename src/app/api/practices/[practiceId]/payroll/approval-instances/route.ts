import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { 
  approvalInstances, 
  approvalWorkflows, 
  approvalStepInstances,
  approvalHistory,
  workHours,
  payroll
} from '@/db/schemas/financeSchema';
import { users } from '@/db/schemas/usersSchema';
import { eq, and, desc, or, inArray } from 'drizzle-orm';

export async function GET(req: NextRequest, context: { params: Promise<{ practiceId: string }> | { practiceId: string } }) {
  try {
    const resolvedParams = await context.params as { practiceId: string };
    const userPractice = await getUserPractice(req);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const practiceId = Number(resolvedParams.practiceId);
    if (practiceId !== parseInt(userPractice.practiceId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const entityType = url.searchParams.get('entityType');
    const assignedToMe = url.searchParams.get('assignedToMe') === 'true';

    const tenantDb = await getCurrentTenantDb();
    
    let clauses = [eq(approvalInstances.practiceId, practiceId)];
    
    if (status) {
      clauses.push(eq(approvalInstances.status, status as any));
    }
    
    if (entityType) {
      clauses.push(eq(approvalInstances.entityType, entityType));
    }
    
    const where = and(...clauses);

    const instances = await tenantDb.select({
      id: approvalInstances.id,
      workflowId: approvalInstances.workflowId,
      requestedById: approvalInstances.requestedById,
      entityType: approvalInstances.entityType,
      entityId: approvalInstances.entityId,
      entityData: approvalInstances.entityData,
      currentStep: approvalInstances.currentStep,
      status: approvalInstances.status,
      priority: approvalInstances.priority,
      reason: approvalInstances.reason,
      notes: approvalInstances.notes,
      dueDate: approvalInstances.dueDate,
      completedAt: approvalInstances.completedAt,
      createdAt: approvalInstances.createdAt,
      updatedAt: approvalInstances.updatedAt,
      requestedByName: users.name,
      workflowName: approvalWorkflows.name,
      workflowType: approvalWorkflows.workflowType
    })
    .from(approvalInstances)
    .leftJoin(users, eq(users.id, approvalInstances.requestedById))
    .leftJoin(approvalWorkflows, eq(approvalWorkflows.id, approvalInstances.workflowId))
    .where(where)
    .orderBy(desc(approvalInstances.createdAt));

    // Get current step details for each instance
    const enhancedInstances = await Promise.all(
      instances.map(async (instance: any) => {
        const currentStepInstance = await tenantDb.select()
          .from(approvalStepInstances)
          .where(and(
            eq(approvalStepInstances.approvalInstanceId, instance.id),
            eq(approvalStepInstances.stepOrder, instance.currentStep)
          ));

        // Get entity details based on entityType
        let entityDetails = null;
        try {
          if (instance.entityType === 'work_hours') {
            const [workHourDetails] = await tenantDb.select({
              id: workHours.id,
              date: workHours.date,
              hoursWorked: workHours.hoursWorked,
              description: workHours.description,
              employeeName: users.name
            })
            .from(workHours)
            .leftJoin(users, eq(users.id, workHours.userId))
            .where(eq(workHours.id, instance.entityId));
            
            entityDetails = workHourDetails;
          } else if (instance.entityType === 'payroll') {
            const [payrollDetails] = await tenantDb.select({
              id: payroll.id,
              grossAmount: payroll.grossAmount,
              netAmount: payroll.netAmount,
              payDate: payroll.payDate,
              employeeName: users.name
            })
            .from(payroll)
            .leftJoin(users, eq(users.id, payroll.employeeId))
            .where(eq(payroll.id, instance.entityId));
            
            entityDetails = payrollDetails;
          }
        } catch (e) {
          console.warn('Could not fetch entity details:', e);
        }

        return {
          ...instance,
          currentStepInstance: currentStepInstance[0] || null,
          entityDetails
        };
      })
    );

    return NextResponse.json(enhancedInstances);
  } catch (e) {
    console.error('List approval instances error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ practiceId: string }> | { practiceId: string } }) {
  try {
    const resolvedParams = await context.params as { practiceId: string };
    const userPractice = await getUserPractice(req);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const practiceId = Number(resolvedParams.practiceId);
    if (practiceId !== parseInt(userPractice.practiceId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const { workflowId, entityType, entityId, reason, notes, priority } = body;
    
    if (!workflowId || !entityType || !entityId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const tenantDb = await getCurrentTenantDb();
    
    // Get entity data snapshot
    let entityData = null;
    try {
      if (entityType === 'work_hours') {
        const [workHourData] = await tenantDb.select().from(workHours).where(eq(workHours.id, entityId));
        entityData = workHourData;
      } else if (entityType === 'payroll') {
        const [payrollData] = await tenantDb.select().from(payroll).where(eq(payroll.id, entityId));
        entityData = payrollData;
      }
    } catch (e) {
      console.warn('Could not capture entity data:', e);
    }

    // Create approval instance
    const [instance] = await tenantDb.insert(approvalInstances).values({
      practiceId,
      workflowId: Number(workflowId),
      requestedById: Number(userPractice.userId),
      entityType,
      entityId: Number(entityId),
      entityData: entityData ? JSON.stringify(entityData) : null,
      currentStep: 1,
      status: 'pending',
      priority: priority || 'normal',
      reason: reason || null,
      notes: notes || null,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    }).returning();

    // Create initial step instance
    const [workflow] = await tenantDb.select().from(approvalWorkflows).where(eq(approvalWorkflows.id, Number(workflowId)));
    if (workflow) {
      // Create step instances based on workflow configuration
      // For now, create a simple first step
      await tenantDb.insert(approvalStepInstances).values({
        approvalInstanceId: instance.id,
        workflowStepId: 1, // This should be dynamic based on workflow steps
        stepOrder: 1,
        status: 'pending'
      });
    }

    // Create history entry
    await tenantDb.insert(approvalHistory).values({
      approvalInstanceId: instance.id,
      action: 'submitted',
      performedById: Number(userPractice.userId),
      newStatus: 'pending',
      comments: `Approval request submitted for ${entityType}`,
      metadata: JSON.stringify({ entityType, entityId })
    });
    
    return NextResponse.json(instance);
  } catch (e) {
    console.error('Create approval instance error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}