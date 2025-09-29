// src/app/api/appointments/by-date-range/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { eq, and, gte, lte } from 'drizzle-orm';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { appointments, pets } from '@/db/schema';

export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const practitionerId = searchParams.get('practitionerId');

    if (!start || !end) {
      return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 });
    }

    // Parse dates
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // Set to start and end of day
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Build query conditions
    let conditions = [
      eq(appointments.practiceId, parseInt(userPractice.practiceId)),
      gte(appointments.date, startDate),
      lte(appointments.date, endDate)
    ];

    // Add practitioner filter if specified
    if (practitionerId && practitionerId !== 'all') {
      conditions.push(eq(appointments.practitionerId, parseInt(practitionerId)));
    }

    // Fetch appointments with pet information
    const appointmentList = await (db as any)
      .select({
        id: appointments.id,
        title: appointments.title,
        description: appointments.description,
        date: appointments.date,
        durationMinutes: appointments.durationMinutes,
        status: appointments.status,
        petId: appointments.petId,
        clientId: appointments.clientId,
        staffId: appointments.staffId,
        practitionerId: appointments.practitionerId,
        practiceId: appointments.practiceId,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        pet: {
          id: pets.id,
          name: pets.name,
          species: pets.species,
          breed: pets.breed,
          ownerId: pets.ownerId,
        },
      })
      .from(appointments)
      .leftJoin(pets, eq(appointments.petId, pets.id))
      .where(and(...conditions))
      .orderBy(appointments.date);

    return NextResponse.json(appointmentList);
  } catch (error) {
    console.error('Error fetching appointments by date range:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}
