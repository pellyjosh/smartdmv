import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { 
  workHours, 
  approvalInstances, 
  approvalWorkflows, 
  approvalStepInstances,
  approvalHistory
} from '@/db/schemas/financeSchema';
import { eq, and } from 'drizzle-orm';

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
    const { workHoursIds, reason, priority } = body; // Array of work hour IDs to submit for approval
    
    if (!workHoursIds || !Array.isArray(workHoursIds) || workHoursIds.length === 0) {
      return NextResponse.json({ error: 'No work hours specified' }, { status: 400 });
    }

    const tenantDb = await getCurrentTenantDb();
    
    // Get the time approval workflow
    const [workflow] = await tenantDb.select()
      .from(approvalWorkflows)
      .where(and(
        eq(approvalWorkflows.practiceId, practiceId),
        eq(approvalWorkflows.workflowType, 'time_approval'),
        eq(approvalWorkflows.isActive, true)
      ));

    if (!workflow) {
      return NextResponse.json({ error: 'No time approval workflow configured' }, { status: 400 });
    }

    const results = [];

    // Create approval instances for each work hours entry
    for (const workHoursId of workHoursIds) {
      try {
        // Get work hours details
        const [workHour] = await tenantDb.select()
          .from(workHours)
          .where(eq(workHours.id, Number(workHoursId)));

        if (!workHour) {
          console.warn(`Work hours ${workHoursId} not found`);
          continue;
        }

        if (workHour.isApproved) {
          console.warn(`Work hours ${workHoursId} already approved`);
          continue;
        }

        // Check if approval already exists
        const [existingApproval] = await tenantDb.select()
          .from(approvalInstances)
          .where(and(
            eq(approvalInstances.practiceId, practiceId),
            eq(approvalInstances.entityType, 'work_hours'),
            eq(approvalInstances.entityId, Number(workHoursId)),
            eq(approvalInstances.status, 'pending')
          ));

        if (existingApproval) {
          results.push({
            workHoursId,
            status: 'already_pending',
            approvalInstanceId: existingApproval.id
          });
          continue;
        }

        // Create approval instance
        const [instance] = await tenantDb.insert(approvalInstances).values({
          practiceId,
          workflowId: workflow.id,
          requestedById: Number(userPractice.userId),
          entityType: 'work_hours',
          entityId: Number(workHoursId),
          entityData: JSON.stringify(workHour),
          currentStep: 1,
          status: 'pending',
          priority: priority || 'normal',
          reason: reason || `Time approval for ${workHour.hoursWorked} hours on ${workHour.date}`,
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
        }).returning();

        // Create initial step instance (simplified - assuming single step approval)
        await tenantDb.insert(approvalStepInstances).values({
          approvalInstanceId: instance.id,
          workflowStepId: 1, // This should be dynamic based on workflow configuration
          stepOrder: 1,
          status: 'pending'
        });

        // Create history entry
        await tenantDb.insert(approvalHistory).values({
          approvalInstanceId: instance.id,
          action: 'submitted',
          performedById: Number(userPractice.userId),
          newStatus: 'pending',
          comments: `Time approval submitted for ${workHour.hoursWorked} hours`,
          metadata: JSON.stringify({ 
            workHoursId, 
            date: workHour.date, 
            hours: workHour.hoursWorked 
          })
        });

        results.push({
          workHoursId,
          status: 'submitted',
          approvalInstanceId: instance.id
        });

      } catch (e) {
        console.error(`Error processing work hours ${workHoursId}:`, e);
        results.push({
          workHoursId,
          status: 'error',
          error: 'Failed to submit for approval'
        });
      }
    }
    
    return NextResponse.json({
      message: `Submitted ${results.filter(r => r.status === 'submitted').length} work hours entries for approval`,
      results
    });
  } catch (e) {
    console.error('Submit work hours for approval error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}