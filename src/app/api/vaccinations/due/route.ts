import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { vaccinations } from '@/db/schema';
import { getUserPractice } from '@/lib/auth-utils';
import { eq, and, gte, lte } from 'drizzle-orm';

// GET /api/vaccinations/due - Get vaccinations due within a date range
export async function GET(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const practiceId = searchParams.get('practiceId') || userPractice.practiceId.toString();
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // Query vaccinations due within the date range
    const result = await db.query.vaccinations.findMany({
      where: and(
        eq(vaccinations.practiceId, parseInt(practiceId)),
        gte(vaccinations.nextDueDate, new Date(startDate)),
        lte(vaccinations.nextDueDate, new Date(endDate)),
        eq(vaccinations.status, 'completed') // Only completed vaccinations that are due for boosters
      ),
      with: {
        pet: {
          columns: {
            id: true,
            name: true,
            species: true,
            breed: true,
          },
        },
        vaccineType: {
          columns: {
            id: true,
            name: true,
            type: true,
            durationOfImmunity: true,
          },
        },
        administeringVet: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching due vaccinations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch due vaccinations' },
      { status: 500 }
    );
  }
}
