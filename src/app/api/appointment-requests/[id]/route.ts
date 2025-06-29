// src/app/api/appointment-requests/[id]/route.ts
// (This file handles DELETE for /api/appointment-requests/[id])
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { appointments } from '@/db/schema';
import { eq } from 'drizzle-orm';

type Context = {
  params: {
    id: string; // The ID of the appointment to delete
  };
};

// DELETE /api/appointment-requests/[id]
export async function DELETE(req: Request, context: Context) {
  try {
    const appointmentId = context.params.id; // ID will be a string (UUID)

    const [deletedAppointment] = await db.delete(appointments).where(eq(appointments.id, appointmentId)).returning();

    if (!deletedAppointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Appointment deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error('Error deleting appointment:', error);
    return NextResponse.json(
      { error: 'Failed to delete appointment', details: (error as Error).message },
      { status: 500 }
    );
  }
}