import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/index";
import { appointments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Unauthorized. Client access required.' }, { status: 401 });
    }

    console.log('Fetching appointments for client ID:', user.id);

    const appointmentsData = await db.query.appointments.findMany({
      where: eq(appointments.clientId, user.id),
      with: {
        pet: {
          columns: {
            id: true,
            name: true,
            species: true,
          }
        },
        practitioner: {
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
      orderBy: [desc(appointments.date)]
    });

    console.log(`Found ${appointmentsData.length} appointments for client ${user.id}`);

    // Transform the data to match the frontend expectations
    const transformedAppointments = appointmentsData.map(appointment => ({
      id: appointment.id,
      title: appointment.title,
      date: new Date(appointment.date),
      time: new Date(appointment.date).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }),
      status: appointment.status === 'approved' ? 'scheduled' : 
              appointment.status === 'rejected' ? 'cancelled' : 
              appointment.status === 'pending' ? 'pending' : 'completed',
      reason: appointment.description || 'General consultation',
      type: Math.random() > 0.5 ? 'in-person' : 'virtual', // Mock data - you may want to add this field to schema
      duration: parseInt(appointment.durationMinutes || '30'),
      petId: appointment.petId,
      petName: appointment.pet?.name,
      doctor: appointment.practitioner?.name || 'Dr. Smith',
      notes: appointment.description,
    }));

    return NextResponse.json(transformedAppointments, { status: 200 });
  } catch (error) {
    console.error('Error fetching client appointments:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch appointments due to a server error. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Unauthorized. Client access required.' }, { status: 401 });
    }

    const appointmentData = await request.json();
    
    // Validate required fields
    const requiredFields = ['title', 'date', 'petId'];
    for (const field of requiredFields) {
      if (!appointmentData[field]) {
        return NextResponse.json({ 
          error: `Missing required field: ${field}` 
        }, { status: 400 });
      }
    }

    console.log('Creating appointment for client:', user.id);

    // Create appointment with client information
    const newAppointment = await (db as any).insert(appointments).values({
      title: appointmentData.title,
      description: appointmentData.description || null,
      date: new Date(appointmentData.date),
      durationMinutes: appointmentData.durationMinutes || '30',
      status: 'pending', // All client bookings start as pending
      petId: appointmentData.petId,
      clientId: user.id, // Set the client who is booking
      practitionerId: appointmentData.practitionerId || null,
      practiceId: user.practiceId, // Use client's practice
    } as any).returning();

    console.log('Appointment created:', newAppointment[0]);

    return NextResponse.json(newAppointment[0], { status: 201 });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json({ 
      error: 'Failed to create appointment due to a server error. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
