import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { medicationInteractions, inventory } from '@/db/schema';
import { getUserPractice } from '@/lib/auth-utils';
import { createAuditLog } from '@/lib/audit-logger';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const createInteractionSchema = z.object({
  medicationAId: z.number(),
  medicationBId: z.number(),
  severity: z.enum(['mild', 'moderate', 'severe']),
  description: z.string().min(5),
});

// POST /api/medication-interactions - Create a new medication interaction
export async function POST(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createInteractionSchema.parse(body);

    // Create the interaction
    const [newInteraction] = await db.insert(medicationInteractions).values({
      medicationAId: validatedData.medicationAId,
      medicationBId: validatedData.medicationBId,
      severity: validatedData.severity,
      description: validatedData.description,
      practiceId: userPractice.practiceId.toString(),
      createdBy: userPractice.user.id,
    }).returning();

    // Audit log
    await createAuditLog({
      action: 'CREATE',
      recordType: 'INVENTORY',
      recordId: newInteraction.id.toString(),
      description: `Created medication interaction between medications ${validatedData.medicationAId} and ${validatedData.medicationBId}`,
      userId: userPractice.user.id.toString(),
      practiceId: userPractice.practiceId.toString(),
      metadata: { 
        severity: validatedData.severity,
        medicationAId: validatedData.medicationAId,
        medicationBId: validatedData.medicationBId 
      }
    });

    return NextResponse.json(newInteraction, { status: 201 });
  } catch (error) {
    console.error('Error creating medication interaction:', error);
    return NextResponse.json({ error: 'Failed to create interaction' }, { status: 500 });
  }
}

// GET /api/medication-interactions - List all medication interactions for practice
export async function GET(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const interactions = await db.select().from(medicationInteractions)
      .where(eq(medicationInteractions.practiceId, userPractice.practiceId.toString()));

    // Get medication names for each interaction
    const interactionsWithNames = await Promise.all(
      interactions.map(async (interaction) => {
        const medicationA = await db.query.inventory.findFirst({
          where: eq(inventory.id, interaction.medicationAId),
          columns: { id: true, name: true }
        });
        
        const medicationB = await db.query.inventory.findFirst({
          where: eq(inventory.id, interaction.medicationBId),
          columns: { id: true, name: true }
        });

        return {
          ...interaction,
          medicationAName: medicationA?.name || 'Unknown',
          medicationBName: medicationB?.name || 'Unknown'
        };
      })
    );

    return NextResponse.json(interactionsWithNames);
  } catch (error) {
    console.error('Error fetching medication interactions:', error);
    return NextResponse.json({ error: 'Failed to fetch interactions' }, { status: 500 });
  }
}
