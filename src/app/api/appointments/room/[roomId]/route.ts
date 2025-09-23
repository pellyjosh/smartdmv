import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/index";
import { appointments, users, pets } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Unauthorized. Client access required.' }, { status: 401 });
    }

    const { roomId } = params;
    
    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    console.log('Fetching appointment for room:', roomId, 'user:', user.id);

    // Fetch appointment with related data
    const appointment = await db.query.appointments.findFirst({
      where: and(
        eq(appointments.roomId, roomId),
        eq(appointments.clientId, parseInt(user.id))
      ),
      with: {
        practitioner: {
          columns: {
            id: true,
            name: true,
            email: true,
          }
        },
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
        }
      }
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found or access denied' }, { status: 404 });
    }

    console.log(`Found appointment: ${appointment.id}`);

    // Format response
    const response = {
      id: appointment.id,
      title: appointment.title,
      description: appointment.description,
      date: appointment.date,
      durationMinutes: appointment.durationMinutes,
      status: appointment.status,
      type: appointment.type,
      roomId: appointment.roomId,
      notes: appointment.notes,
      telemedicineStartedAt: appointment.telemedicineStartedAt,
      telemedicineEndedAt: appointment.telemedicineEndedAt,
      practitioner: appointment.practitioner,
      pet: appointment.pet,
      client: appointment.client,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch appointment due to a server error. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
