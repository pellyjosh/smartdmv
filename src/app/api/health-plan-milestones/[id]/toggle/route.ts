import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db/index';
import { healthPlanMilestones } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-utils';
import { isPracticeAdministrator, isVeterinarian, isAdmin } from '@/lib/rbac-helpers';
import { createAuditLog } from '@/lib/audit-logger';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid milestone id' }, { status: 400 });

    // Only staff or admins allowed to toggle milestones
    if (!(isPracticeAdministrator(user as any) || isVeterinarian(user as any) || isAdmin(user as any))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const milestone = await db.query.healthPlanMilestones.findFirst({ where: eq(healthPlanMilestones.id, id) });
    if (!milestone) return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });

    console.log('Toggle milestone - fetched milestone', {
      id: milestone.id,
      preview: milestone,
      rawTypes: {
        dueDateProto: milestone.dueDate ? Object.prototype.toString.call(milestone.dueDate) : null,
        completedOnProto: milestone.completedOn ? Object.prototype.toString.call(milestone.completedOn) : null,
      }
    });

    const updated = await db.update(healthPlanMilestones)
      .set({ 
        completed: !milestone.completed, 
        completedOn: milestone.completed ? null : new Date(),
        updatedAt: new Date()
      })
      .where(eq(healthPlanMilestones.id, id))
      .returning();

    console.log('Toggle milestone - update query returned', { updated });

    const row = updated[0] ?? null;
    if (!row) return NextResponse.json(null, { status: 200 });

    // Log the milestone toggle activity
    try {
      await createAuditLog({
        action: 'UPDATE',
        recordType: 'HEALTH_PLAN',
        recordId: milestone.id.toString(),
        description: `Milestone "${milestone.title}" ${!milestone.completed ? 'completed' : 'uncompleted'}`,
        userId: user.id.toString(),
        practiceId: user.practiceId?.toString(),
        metadata: {
          milestoneId: milestone.id,
          milestoneTitle: milestone.title,
          healthPlanId: milestone.healthPlanId,
          previousState: milestone.completed,
          newState: !milestone.completed,
          completedOn: !milestone.completed ? new Date().toISOString() : null
        },
        changes: {
          before: { completed: milestone.completed, completedOn: milestone.completedOn },
          after: { completed: !milestone.completed, completedOn: !milestone.completed ? new Date() : null }
        }
      });
    } catch (auditError) {
      console.error('Failed to create audit log for milestone toggle:', auditError);
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
      if (typeof value === 'object' && value.toISOString) {
        try {
          return value.toISOString();
        } catch {
          return null;
        }
      }
      // Try to convert other types to Date
      try {
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date.toISOString();
      } catch {
        return null;
      }
    };

    // Serialize date fields to safe ISO strings to avoid downstream serialization errors
    const safeRow: any = {
      ...row,
      dueDate: safeToISOString(row.dueDate),
      completedOn: safeToISOString(row.completedOn),
      createdAt: safeToISOString(row.createdAt),
      updatedAt: safeToISOString(row.updatedAt),
    };

    return NextResponse.json(safeRow, { status: 200 });
  } catch (error) {
    console.error('Error toggling milestone', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return NextResponse.json({ error: 'Failed to toggle milestone' }, { status: 500 });
  }
}
