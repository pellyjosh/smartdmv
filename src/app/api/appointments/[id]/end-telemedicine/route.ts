import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { appointments } from '@/db/schema';
import { cookies } from 'next/headers';
import { HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME } from '@/config/authConstants';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string  }> }
) {
  const resolvedParams = await params;
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    // Get session token from cookies
    const sessionTokenValue = (await cookies()).get(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME)?.value;
    
    if (!sessionTokenValue) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appointmentId = parseInt(resolvedParams.id, 10);
    if (isNaN(appointmentId)) {
      return NextResponse.json({ error: 'Invalid appointment ID' }, { status: 400 });
    }

    // Parse request body for optional session notes
    const body = await request.json();
    const { notes } = body;

    // Get the appointment to validate access
    const appointment = await tenantDb.query.appointments.findFirst({
      where: eq(appointments.id, appointmentId),
      with: {
        client: true,
        staff: true,
        practitioner: true,
        pet: true,
        practice: true
      }
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Validate that this is a telemedicine appointment in progress
    if (appointment.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'This appointment is not currently in progress' },
        { status: 400 }
      );
    }

    // Update appointment status and end time
    const updatedAppointment = await tenantDb
      .update(appointments)
      .set({
        status: 'completed',
        telemedicineEndedAt: new Date(),
        notes: notes || appointment.notes, // Update notes if provided, keep existing if not
        updatedAt: new Date()
      })
      .where(eq(appointments.id, appointmentId))
      .returning();

    // TODO: Create notification for other participants
    // This would notify the client/practitioner that the session has ended

    return NextResponse.json({
      success: true,
      appointment: updatedAppointment[0]
    });

  } catch (error) {
    console.error('Error ending telemedicine session:', error);
    return NextResponse.json(
      { error: 'Failed to end telemedicine session' },
      { status: 500 }
    );
  }
}
