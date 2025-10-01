import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { appointments, appointmentStatusEnum } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { 
  type AppointmentStatus, 
  isValidStatusTransition 
} from '@/lib/appointment-workflow';

// PATCH /api/appointments/[id] - Update appointment
const updateAppointmentSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional().nullable(),
  date: z.string().datetime().optional(),
  durationMinutes: z.string().optional(),
  status: z.enum([...appointmentStatusEnum]).optional(),
  petId: z.coerce.number().optional().nullable(),
  clientId: z.coerce.number().optional().nullable(),
  staffId: z.coerce.number().optional().nullable(),
  practitionerId: z.coerce.number().optional().nullable(),
  type: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const { id } = await params;
    const appointmentId = parseInt(id);
    
    if (isNaN(appointmentId)) {
      return NextResponse.json(
        { error: 'Invalid appointment ID' },
        { status: 400 }
      );
    }

    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = updateAppointmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if the appointment exists and belongs to the user's practice
    const existingAppointment = await tenantDb
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.id, appointmentId),
        eq(appointments.practiceId, parseInt(userPractice.practiceId))
      ))
      .limit(1);

    if (existingAppointment.length === 0) {
      return NextResponse.json(
        { error: 'Appointment not found or access denied' },
        { status: 404 }
      );
    }

    // If updating status, validate the transition
    if (data.status) {
      const currentStatus = existingAppointment[0].status as AppointmentStatus;
      const newStatus = data.status as AppointmentStatus;
      
      const isValid = isValidStatusTransition(currentStatus, newStatus);
      
      if (!isValid) {
        return NextResponse.json(
          { 
            error: 'Invalid status transition', 
            details: `Cannot change from "${currentStatus}" to "${newStatus}"`,
            currentStatus,
            requestedStatus: newStatus
          },
          { status: 400 }
        );
      }
    }

    // Update the appointment
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    // Convert date string to Date object if provided
    if (data.date) {
      updateData.date = new Date(data.date);
    }

    const [updatedAppointment] = await tenantDb
      .update(appointments)
      .set(updateData)
      .where(eq(appointments.id, appointmentId))
      .returning();

    return NextResponse.json(updatedAppointment, { status: 200 });
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    );
  }
}

// DELETE /api/appointments/[id] - Delete appointment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const { id } = await params;
    const appointmentId = parseInt(id);
    
    if (isNaN(appointmentId)) {
      return NextResponse.json(
        { error: 'Invalid appointment ID' },
        { status: 400 }
      );
    }

    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the appointment exists and belongs to the user's practice
    const existingAppointment = await tenantDb
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.id, appointmentId),
        eq(appointments.practiceId, parseInt(userPractice.practiceId))
      ))
      .limit(1);

    if (existingAppointment.length === 0) {
      return NextResponse.json(
        { error: 'Appointment not found or access denied' },
        { status: 404 }
      );
    }

    // Delete the appointment
    await tenantDb
      .delete(appointments)
      .where(eq(appointments.id, appointmentId));

    return NextResponse.json({ message: 'Appointment deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return NextResponse.json(
      { error: 'Failed to delete appointment' },
      { status: 500 }
    );
  }
}

// GET /api/appointments/[id] - Get specific appointment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const { id } = await params;
    const appointmentId = parseInt(id);
    
    if (isNaN(appointmentId)) {
      return NextResponse.json(
        { error: 'Invalid appointment ID' },
        { status: 400 }
      );
    }

    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the appointment
    const appointment = await tenantDb.query.appointments.findFirst({
      where: and(
        eq(appointments.id, appointmentId),
        eq(appointments.practiceId, parseInt(userPractice.practiceId))
      ),
      with: {
        pet: true,
        client: true,
        staff: true,
        practitioner: true,
        practice: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json(appointment, { status: 200 });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointment' },
      { status: 500 }
    );
  }
}
