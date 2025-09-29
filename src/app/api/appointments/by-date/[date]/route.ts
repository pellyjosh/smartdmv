// src/app/api/appointments/by-date/[date]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { eq, and, gte, lte } from 'drizzle-orm';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { appointments, pets } from '@/db/schema';

export async function GET(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params to ensure it's fully resolved
    const resolvedParams = await params;
    const { date } = resolvedParams;

    const { searchParams } = new URL(request.url);
    const practitionerId = searchParams.get('practitionerId');

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    // Parse the date
    const requestedDate = new Date(date);

    if (isNaN(requestedDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // Define the start and end of the day
    const startOfDay = new Date(requestedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(requestedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Build query conditions
    let conditions = [
      eq(appointments.practiceId, parseInt(userPractice.practiceId)),
      gte(appointments.date, startOfDay),
      lte(appointments.date, endOfDay)
    ];

    // Add practitioner filter if specified
    if (practitionerId && practitionerId !== 'all') {
      conditions.push(eq(appointments.practitionerId, parseInt(practitionerId)));
    }

    // Fetch appointments with pet information
    const appointmentList = await tenantDb
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
    console.error('Error fetching appointments:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}