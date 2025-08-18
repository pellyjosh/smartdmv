// src/app/api/appointment-requests/[id]/reject/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { appointments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

type Context = {
  params: Promise<{
    id: string; // The ID of the appointment to reject
  }>;
};

const rejectRequestSchema = z.object({
  rejectionReason: z.string().min(1, "Rejection reason is required."),
});

export async function POST(req: Request, context: Context) {
  try {
    const params = await context.params;
    const appointmentIdString = params.id;
    
    // Convert string ID to integer
    const appointmentId = parseInt(appointmentIdString);
    if (isNaN(appointmentId)) {
      return NextResponse.json({ error: 'Invalid appointment ID' }, { status: 400 });
    }
    
    const body = await req.json();

    const validationResult = rejectRequestSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('Validation Error:', validationResult.error.flatten());
      return NextResponse.json(
        { error: 'Invalid input for rejection', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { rejectionReason } = validationResult.data;

    // Find the appointment
    const appointmentToReject = await db.query.appointments.findFirst({
      where: eq(appointments.id, appointmentId),
    });

    if (!appointmentToReject) {
      return NextResponse.json({ error: 'Appointment request (appointment) not found' }, { status: 404 });
    }

    // Only allow rejection if status is 'pending' or 'scheduled' (if allowed to cancel)
    if (appointmentToReject.status !== 'pending' && appointmentToReject.status !== 'scheduled') {
      return NextResponse.json({ error: 'Appointment is not in a state that can be rejected.' }, { status: 400 });
    }

    // Update the appointment status to 'rejected' and store the reason in description
    const [updatedAppointment] = await db.update(appointments)
      .set({
        status: 'rejected',
        description: `REJECTED: ${rejectionReason}`, // Store reason in description
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointmentId))
      .returning();

    if (!updatedAppointment) {
      throw new Error('Failed to reject appointment.');
    }

    // Return success message
    return NextResponse.json({
        message: 'Appointment rejected successfully',
        appointment: {
            id: updatedAppointment.id,
            status: 'REJECTED', // Frontend expects 'REJECTED'
            rejectionReason: rejectionReason
        }
    }, { status: 200 });

  } catch (error) {
    console.error('Error rejecting appointment:', error);
    return NextResponse.json(
      { error: 'Failed to reject appointment', details: (error as Error).message },
      { status: 500 }
    );
  }
}
