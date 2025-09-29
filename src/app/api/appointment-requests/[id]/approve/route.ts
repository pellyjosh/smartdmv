// src/app/api/appointment-requests/[id]/approve/route.ts
import { NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { appointments, appointmentStatusEnum, users, pets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { format } from 'date-fns'; // Used for potential logging/return data if needed

type Context = {
  params: Promise<{
    id: string; // The ID of the appointment to approve
  }>;
};

export async function POST(req: Request, context: Context) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const params = await context.params;
    const appointmentIdString = params.id;
    
    // Convert string ID to integer
    const appointmentId = parseInt(appointmentIdString);
    if (isNaN(appointmentId)) {
      return NextResponse.json({ error: 'Invalid appointment ID' }, { status: 400 });
    }

    // Find the appointment
    const appointmentToApprove = await tenantDb.query.appointments.findFirst({
      where: eq(appointments.id, appointmentId),
    });

    if (!appointmentToApprove) {
      return NextResponse.json({ error: 'Appointment request (appointment) not found' }, { status: 404 });
    }

    // Only allow approval if status is 'pending' or similar
    if (appointmentToApprove.status !== 'pending') {
      return NextResponse.json({ error: 'Appointment is not in a pending state for approval.' }, { status: 400 });
    }

    // Update the appointment status to 'approved'
    await tenantDb.update(appointments)
      .set({
        status: 'approved',
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointmentId));
    
    // Fetch the updated appointment
    const updatedAppointment = await tenantDb.query.appointments.findFirst({
      where: eq(appointments.id, appointmentId),
    });

    if (!updatedAppointment) {
      throw new Error('Failed to approve appointment.');
    }

    // Return the updated appointment, or a success message
    return NextResponse.json({
        message: 'Appointment approved successfully',
        appointment: {
            id: updatedAppointment.id,
            status: 'APPROVED', // Frontend expects 'APPROVED'
            appointmentId: updatedAppointment.id // Frontend uses appointmentId
        }
    }, { status: 200 });

  } catch (error) {
    console.error('Error approving appointment:', error);
    return NextResponse.json(
      { error: 'Failed to approve appointment', details: (error as Error).message },
      { status: 500 }
    );
  }
}
