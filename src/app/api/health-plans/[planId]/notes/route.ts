import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db/index';
import { healthPlanNotes } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-utils';
import { isPracticeAdministrator, isVeterinarian, isAdmin } from '@/lib/rbac-helpers';
import { createAuditLog } from '@/lib/audit-logger';

export async function GET(request: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const planId = Number(resolvedParams.planId);
    if (Number.isNaN(planId)) return NextResponse.json({ error: 'Invalid health plan id' }, { status: 400 });

    console.log(`[api/health-plans/[planId]/notes] GET called for planId=${planId}`);

    const notes = await db.query.healthPlanNotes.findMany({ 
      where: eq(healthPlanNotes.healthPlanId, planId),
      orderBy: [desc(healthPlanNotes.createdAt)],
      with: {
        createdBy: { columns: { id: true, name: true, email: true } }
      }
    });

    return NextResponse.json(notes, { status: 200 });
  } catch (error) {
    console.error('Error fetching health plan notes', error);
    return NextResponse.json({ error: 'Failed to fetch health plan notes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const planId = Number(resolvedParams.planId);
    if (Number.isNaN(planId)) return NextResponse.json({ error: 'Invalid health plan id' }, { status: 400 });

    // Only staff or admins allowed to add notes
    if (!(isPracticeAdministrator(user as any) || isVeterinarian(user as any) || isAdmin(user as any))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    console.log(`[api/health-plans/[planId]/notes] POST called for planId=${planId}`, { body });
    const { note } = body;

    if (!note || typeof note !== 'string' || note.trim().length === 0) {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 });
    }

    // Insert the new note
    const insertResult = await db.insert(healthPlanNotes).values({
      healthPlanId: planId,
      note: note.trim(),
      createdById: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    const newNote = insertResult[0];
    if (!newNote) return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });

    // Log the note creation
    try {
      await createAuditLog({
        action: 'CREATE',
        recordType: 'HEALTH_PLAN',
        recordId: newNote.id.toString(),
        description: `Note added to health plan ${planId}`,
        userId: user.id.toString(),
        practiceId: (user as any).practiceId?.toString(),
        metadata: {
          healthPlanId: planId,
          noteId: newNote.id,
          notePreview: note.substring(0, 100)
        }
      });
    } catch (auditError) {
      console.error('Failed to create audit log for health plan note:', auditError);
      // Don't fail the main operation if audit logging fails
    }

    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    console.error('Error creating health plan note', error);
    return NextResponse.json({ error: 'Failed to create health plan note' }, { status: 500 });
  }
}
