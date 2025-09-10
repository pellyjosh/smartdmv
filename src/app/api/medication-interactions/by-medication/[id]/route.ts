import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { medicationInteractions, inventory } from '@/db/schema';
import { getUserPractice } from '@/lib/auth-utils';
import { eq, and, or } from 'drizzle-orm';

// GET /api/medication-interactions/by-medication/[id] - Get interactions for a specific medication
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const medicationId = parseInt(resolvedParams.id);

    // Get all interactions where this medication is either medicationA or medicationB
    const interactions = await db.select().from(medicationInteractions)
      .where(and(
        eq(medicationInteractions.practiceId, userPractice.practiceId.toString()),
        or(
          eq(medicationInteractions.medicationAId, medicationId),
          eq(medicationInteractions.medicationBId, medicationId)
        )
      ));

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
