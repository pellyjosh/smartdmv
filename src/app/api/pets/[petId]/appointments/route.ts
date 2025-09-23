import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { appointments } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request, context: { params: Promise<{ petId: string }> }) {
  try {
    const params = await context.params;
    const { petId } = params;
    const petIdInt = parseInt(petId, 10);
    
    if (!Number.isFinite(petIdInt)) {
      return NextResponse.json({ error: 'Invalid pet ID' }, { status: 400 });
    }

    console.log('Fetching appointments for Pet ID:', petId);

    // Query the database for appointments for the given pet
    const appointmentRecords = await db.query.appointments.findMany({
      where: (appointments, { eq }) => eq(appointments.petId, petIdInt),
      with: {
        practitioner: {
          columns: {
            id: true,
            name: true,
          }
        },
        client: {
          columns: {
            id: true,
            name: true,
          }
        },
        practice: {
          columns: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: (appointments, { desc }) => [desc(appointments.date)],
    });

    // Transform appointment records to the format expected by the frontend
    const transformedAppointments = appointmentRecords.map(appointment => ({
      id: appointment.id,
      title: appointment.title,
      description: appointment.description,
      date: appointment.date,
      durationMinutes: appointment.durationMinutes,
      status: appointment.status,
      type: appointment.type,
      practitioner: appointment.practitioner ? appointment.practitioner.name : null,
      client: appointment.client ? appointment.client.name : null,
      practice: appointment.practice ? appointment.practice.name : null,
      notes: appointment.notes,
      telemedicineStartedAt: appointment.telemedicineStartedAt,
      telemedicineEndedAt: appointment.telemedicineEndedAt,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    }));

    return NextResponse.json(transformedAppointments, { status: 200 });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}
