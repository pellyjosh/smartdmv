import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { 
  approvalInstances, 
  approvalStepInstances,
  approvalHistory,
  workHours,
  payroll
} from '@/db/schemas/financeSchema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(req: NextRequest, context: { params: Promise<{ practiceId: string; id: string }> | { practiceId: string; id: string } }) {
  try {
    const resolvedParams = await context.params as { practiceId: string; id: string };
    const userPractice = await getUserPractice(req);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const practiceId = Number(resolvedParams.practiceId);
    const instanceId = Number(resolvedParams.id);
    
    if (practiceId !== parseInt(userPractice.practiceId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const { action, comments, stepId } = body; // action: 'approve', 'reject', 'cancel'
    
    if (!action || !['approve', 'reject', 'cancel'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const tenantDb = await getCurrentTenantDb();
    
    // Get the approval instance
    const [instance] = await tenantDb.select()
      .from(approvalInstances)
      .where(and(eq(approvalInstances.id, instanceId), eq(approvalInstances.practiceId, practiceId)));
    
    if (!instance) {
      return NextResponse.json({ error: 'Approval instance not found' }, { status: 404 });
    }

    if (instance.status !== 'pending') {
      return NextResponse.json({ error: 'Approval instance is not pending' }, { status: 400 });
    }

    let newStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'cancelled';
    let completedAt = action !== 'approve' ? new Date() : null;

    // Handle approval/rejection
    if (action === 'approve') {
      // Update current step instance
      await tenantDb.update(approvalStepInstances)
        .set({
          status: 'approved',
          approvedById: Number(userPractice.userId),
          approvedAt: new Date(),
          notes: comments || null
        })
        .where(and(
          eq(approvalStepInstances.approvalInstanceId, instanceId),
          eq(approvalStepInstances.stepOrder, instance.currentStep)
        ));

      // For now, mark as complete after first approval (simplified workflow)
      // In a full implementation, this would check if there are more steps
      newStatus = 'approved';
      completedAt = new Date();

      // Apply the approval to the actual entity
      await applyApproval(tenantDb, instance);

    } else if (action === 'reject') {
      // Update current step instance
      await tenantDb.update(approvalStepInstances)
        .set({
          status: 'rejected',
          approvedById: Number(userPractice.userId),
          approvedAt: new Date(),
          rejectionReason: comments || null,
          notes: comments || null
        })
        .where(and(
          eq(approvalStepInstances.approvalInstanceId, instanceId),
          eq(approvalStepInstances.stepOrder, instance.currentStep)
        ));
    }

    // Update the approval instance
    const [updatedInstance] = await tenantDb.update(approvalInstances)
      .set({
        status: newStatus,
        completedAt,
        updatedAt: new Date()
      })
      .where(eq(approvalInstances.id, instanceId))
      .returning();

    // Create history entry
    await tenantDb.insert(approvalHistory).values({
      approvalInstanceId: instanceId,
      action,
      performedById: Number(userPractice.userId),
      previousStatus: instance.status,
      newStatus,
      comments: comments || null,
      metadata: JSON.stringify({ 
        stepOrder: instance.currentStep,
        entityType: instance.entityType,
        entityId: instance.entityId
      })
    });
    
    return NextResponse.json(updatedInstance);
  } catch (e) {
    console.error('Update approval instance error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to apply approval to the actual entity
async function applyApproval(tenantDb: any, instance: any) {
  try {
    if (instance.entityType === 'work_hours') {
      // Approve work hours
      await tenantDb.update(workHours)
        .set({
          isApproved: true,
          updatedAt: new Date()
        })
        .where(eq(workHours.id, instance.entityId));
        
    } else if (instance.entityType === 'payroll') {
      // Approve payroll
      await tenantDb.update(payroll)
        .set({
          status: 'approved',
          updatedAt: new Date()
        })
        .where(eq(payroll.id, instance.entityId));
    }
  } catch (e) {
    console.error('Error applying approval:', e);
    throw e;
  }
}