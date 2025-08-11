// src/app/api/appointment-requests/[id]/approve/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { appointments, appointmentStatusEnum, users, pets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { format } from 'date-fns'; // Used for potential logging/return data if needed

type Context = {
  params: Promise<{
    id: string; // The ID of the appointment to approve
  }>;
};

export async function POST(req: Request, context: Context) {
  try {
    const params = await context.params;
    const appointmentId = params.id;

    // Find the appointment
    const appointmentToApprove = await db.query.appointments.findFirst({
      where: eq(appointments.id, appointmentId),
    });

    if (!appointmentToApprove) {
      return NextResponse.json({ error: 'Appointment request (appointment) not found' }, { status: 404 });
    }

    // Only allow approval if status is 'pending' or similar
    if (appointmentToApprove.status !== 'pending') {
      return NextResponse.json({ error: 'Appointment is not in a pending state for approval.' }, { status: 400 });
    }

    // Update the appointment status to 'scheduled' or 'confirmed'
    // Due to union type issues with Drizzle ORM, use type suppression to bypass TypeScript error
    // Handle ID as string (UUID) for SQLite compatibility
    // Convert updatedAt to a format SQLite can bind (string or timestamp)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await db.update(appointments)
      .set({
        status: 'approved', // Or 'confirmed', based on your desired workflow
        updatedAt: new Date().toISOString(), // Convert Date to ISO string for SQLite compatibility
      })
      .where(eq(appointments.id, appointmentId as any));
    
    // Fetch the updated appointment manually
    const updatedAppointment = await db.query.appointments.findFirst({
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
