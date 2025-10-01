import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { appointments } from '@/db/schema';
import { cookies } from 'next/headers';
import { HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME } from '@/config/authConstants';
import { nanoid } from 'nanoid';

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

    // TODO: Add proper user session validation here
    // For now, we'll allow access - in production you'd validate the session

    // Validate that this is a virtual/telemedicine appointment
    if (appointment.type !== 'virtual' && appointment.type !== 'telemedicine') {
      return NextResponse.json(
        { error: 'This appointment is not a telemedicine appointment' },
        { status: 400 }
      );
    }

    // Generate unique room ID if not already present
    const roomId = appointment.roomId || nanoid(12);

    // Update appointment status and start time
    const updatedAppointment = await tenantDb
      .update(appointments)
      .set({
        status: 'in_progress',
        roomId: roomId,
        telemedicineStartedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(appointments.id, appointmentId))
      .returning();

    // TODO: Create notification for other participants
    // This would notify the client/practitioner that the session has started

    return NextResponse.json({
      success: true,
      appointment: updatedAppointment[0],
      roomId: roomId
    });

  } catch (error) {
    console.error('Error starting telemedicine session:', error);
    return NextResponse.json(
      { error: 'Failed to start telemedicine session' },
      { status: 500 }
    );
  }
}
