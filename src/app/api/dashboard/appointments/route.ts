import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { appointments } from '@/db/schema';
import { eq, and, gte, desc } from 'drizzle-orm';

// Map database status to display status
function mapAppointmentStatus(dbStatus: string): string {
  switch (dbStatus) {
    case 'approved':
      return 'confirmed';
    case 'pending':
      return 'scheduled';
    case 'rejected':
      return 'cancelled';
    default:
      return dbStatus;
  }
}

// GET /api/dashboard/appointments - Get upcoming appointments for dashboard widget
export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');
    const days = parseInt(searchParams.get('days') || '7'); // Show next 7 days by default

    // Calculate the start time (Date object for timestamp columns)
    const now = new Date();
    const startTime = now;

    // Calculate end time (X days from now as Date, if needed later)
    const endTime = new Date();
    endTime.setDate(endTime.getDate() + days);

    // Fetch upcoming appointments for the practice
    const upcomingAppointments = await tenantDb.query.appointments.findMany({
      where: and(
        eq(appointments.practiceId, userPractice.practiceId),
        gte(appointments.date, startTime) // Appointments from now onwards
      ),
      with: {
        pet: {
          columns: {
            id: true,
            name: true,
            species: true,
            breed: true,
          }
        },
        client: {
          columns: {
            id: true,
            name: true,
            email: true,
          }
        },
        practitioner: {
          columns: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: [appointments.date], // Order by date ascending (earliest first)
      limit: limit,
    });

    // Transform the data to a more frontend-friendly format
    const formattedAppointments = upcomingAppointments.map(appointment => ({
      id: appointment.id,
      title: appointment.title,
      description: appointment.description,
      date: typeof appointment.date === 'object' && appointment.date instanceof Date 
        ? appointment.date.getTime() 
        : appointment.date, // Handle both timestamp and Date objects
      duration: parseInt(appointment.durationMinutes || '30'),
      status: mapAppointmentStatus(appointment.status),
      pet: appointment.pet ? {
        id: appointment.pet.id,
        name: appointment.pet.name,
        species: appointment.pet.species,
        breed: appointment.pet.breed,
      } : null,
      client: appointment.client ? {
        id: appointment.client.id,
        name: appointment.client.name,
        email: appointment.client.email,
      } : null,
      practitioner: appointment.practitioner ? {
        id: appointment.practitioner.id,
        name: appointment.practitioner.name,
      } : null,
    }));

    return NextResponse.json(formattedAppointments);
  } catch (error) {
    console.error('Error fetching dashboard appointments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}
