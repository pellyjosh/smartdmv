// src/app/api/practice/pets/[practiceId]/route.ts
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { schema } from '@/db/schema';
import { db } from '@/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ practiceId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { practiceId } = resolvedParams;
    console.log(`Fetching pets for practice ID: ${practiceId}`);

    if (!practiceId || typeof practiceId !== 'string') {
      return NextResponse.json(
        { error: 'Practice ID is required and must be a string' },
        { status: 400 }
      );
    }

    const pets = await db.query.pets.findMany({
      where: eq(schema.pets.practiceId, practiceId),
    });

    if (pets && pets.length > 0) {
      console.log(`Found ${pets.length} pets for practice ${practiceId}`);
    } else {
      console.log(`No pets found for practice ${practiceId}`);
    }

    return NextResponse.json(pets);
  } catch (error) {
    console.error('Error fetching pets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pets' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
