import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { medicationInteractions, inventory } from '@/db/schema';
import { createAuditLog } from '@/lib/audit-logger';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const updateInteractionSchema = z.object({
  severity: z.enum(['mild', 'moderate', 'severe']).optional(),
  description: z.string().min(5).optional(),
});

// GET /api/medication-interactions/[id] - Get specific interaction
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const interactionId = parseInt(resolvedParams.id);

    const interaction = await tenantDb.select().from(medicationInteractions)
      .where(and(
        eq(medicationInteractions.id, interactionId),
        eq(medicationInteractions.practiceId, userPractice.practiceId.toString())
      ))
      .limit(1);

    if (!interaction[0]) {
      return NextResponse.json({ error: 'Interaction not found' }, { status: 404 });
    }

    // Get medication names
    const medicationA = await tenantDb.query.inventory.findFirst({
      where: eq(inventory.id, interaction[0].medicationAId),
      columns: { id: true, name: true }
    });
    
    const medicationB = await tenantDb.query.inventory.findFirst({
      where: eq(inventory.id, interaction[0].medicationBId),
      columns: { id: true, name: true }
    });

    const result = {
      ...interaction[0],
      medicationAName: medicationA?.name || 'Unknown',
      medicationBName: medicationB?.name || 'Unknown'
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching medication interaction:', error);
    return NextResponse.json({ error: 'Failed to fetch interaction' }, { status: 500 });
  }
}

// PATCH /api/medication-interactions/[id] - Update interaction
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const interactionId = parseInt(resolvedParams.id);
    const body = await request.json();
    const validatedData = updateInteractionSchema.parse(body);

    // Check interaction exists and belongs to practice
    const existingInteraction = await tenantDb.select().from(medicationInteractions)
      .where(and(
        eq(medicationInteractions.id, interactionId),
        eq(medicationInteractions.practiceId, userPractice.practiceId.toString())
      ))
      .limit(1);

    if (!existingInteraction[0]) {
      return NextResponse.json({ error: 'Interaction not found' }, { status: 404 });
    }

    // Update the interaction
    const [updatedInteraction] = await tenantDb.update(medicationInteractions)
      .set(validatedData)
      .where(eq(medicationInteractions.id, interactionId))
      .returning();

    // Audit log
    await createAuditLog({
      action: 'UPDATE',
      recordType: 'INVENTORY',
      recordId: interactionId.toString(),
      description: `Updated medication interaction ${interactionId}`,
      userId: userPractice.user.id.toString(),
      practiceId: userPractice.practiceId.toString(),
      metadata: { 
        updatedFields: Object.keys(validatedData),
        ...validatedData 
      }
    });

    return NextResponse.json(updatedInteraction);
  } catch (error) {
    console.error('Error updating medication interaction:', error);
    return NextResponse.json({ error: 'Failed to update interaction' }, { status: 500 });
  }
}

// DELETE /api/medication-interactions/[id] - Delete interaction
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const interactionId = parseInt(resolvedParams.id);

    // Check interaction exists and belongs to practice
    const existingInteraction = await tenantDb.select().from(medicationInteractions)
      .where(and(
        eq(medicationInteractions.id, interactionId),
        eq(medicationInteractions.practiceId, userPractice.practiceId.toString())
      ))
      .limit(1);

    if (!existingInteraction[0]) {
      return NextResponse.json({ error: 'Interaction not found' }, { status: 404 });
    }

    // Delete the interaction
    await tenantDb.delete(medicationInteractions)
      .where(eq(medicationInteractions.id, interactionId));

    // Audit log
    await createAuditLog({
      action: 'DELETE',
      recordType: 'INVENTORY',
      recordId: interactionId.toString(),
      description: `Deleted medication interaction ${interactionId}`,
      userId: userPractice.user.id.toString(),
      practiceId: userPractice.practiceId.toString(),
      metadata: { 
        deletedInteraction: existingInteraction[0] 
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting medication interaction:', error);
    return NextResponse.json({ error: 'Failed to delete interaction' }, { status: 500 });
  }
}
