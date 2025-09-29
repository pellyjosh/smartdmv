import { NextResponse, NextRequest } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { appointments } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-utils";
import { z } from "zod";

export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const user = await getCurrentUser(request);
    
    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Unauthorized. Client access required.' }, { status: 401 });
    }

    console.log('Fetching appointments for client ID:', user.id);

    const appointmentsData = await tenantDb.query.appointments.findMany({
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

    // Log raw appointment data with detailed status information
    appointmentsData.forEach((apt, index) => {
      console.log(`🔍 Raw Appointment ${index + 1}:`, {
        id: apt.id,
        title: apt.title,
        rawStatus: apt.status,
        date: apt.date,
        dateString: apt.date.toISOString(),
        petName: apt.pet?.name,
        description: apt.description
      });
    });

    // Transform the data to match the frontend expectations
    const transformedAppointments = appointmentsData.map((appointment, index) => {
      const originalStatus = appointment.status;
      const transformedStatus = (() => {
        switch (appointment.status) {
          case 'approved':
            return 'scheduled';
          case 'rejected':
            return 'cancelled';
          case 'pending':
            return 'pending';
          case 'completed':
            return 'completed';
          case 'cancelled':
            return 'cancelled';
          case 'no_show':
            return 'no_show';
          case 'pending_pickup':
            return 'completed'; // pending_pickup means the appointment is done but pet needs pickup
          case 'in_progress':
            return 'scheduled'; // in_progress means it's currently happening
          case 'triage':
            return 'scheduled'; // triage is a form of scheduled
          case 'in_treatment':
            return 'scheduled'; // in_treatment is ongoing
          default:
            console.warn(`⚠️ Unknown appointment status: "${appointment.status}"`);
            return appointment.status; // Return original status if unknown
        }
      })();
      
      console.log(`🔄 Status Transform ${index + 1}: "${originalStatus}" → "${transformedStatus}"`);
      
      return {
        id: appointment.id,
        title: appointment.title,
        date: appointment.date.toISOString(), // Convert Date object to ISO string to prevent serialization issues
        time: appointment.date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        }),
        status: transformedStatus,
        reason: appointment.description || 'General consultation',
        type: appointment.type || 'in-person', // Use actual appointment type from database
        duration: parseInt(Array.isArray(appointment.durationMinutes) 
          ? appointment.durationMinutes[0] || '30' 
          : appointment.durationMinutes || '30'),
        petId: appointment.petId,
        petName: appointment.pet?.name,
        doctor: appointment.practitioner?.name || 'Dr. Smith',
        notes: appointment.description,
      };
    });

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
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

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

    // console.log('Creating appointment for client:', user.id);

    // Create appointment with client information
    const newAppointment = await (db as any).insert(appointments).values({
      title: appointmentData.title,
      type: appointmentData.type || null, // Add appointment type
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

// PATCH /api/appointments/client?id={appointmentId} - Update client's appointment
const updateAppointmentSchema = z.object({
  date: z.string().datetime().optional(),
  status: z.enum(['pending', 'scheduled', 'cancelled', 'completed']).optional(),
  notes: z.string().optional(),
  title: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const user = await getCurrentUser(request);
    
    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Unauthorized. Client access required.' }, { status: 401 });
    }

    const url = new URL(request.url);
    const appointmentId = url.searchParams.get('id');

    if (!appointmentId) {
      return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
    }

    const parsedId = parseInt(appointmentId);
    if (isNaN(parsedId)) {
      return NextResponse.json({ error: 'Invalid appointment ID' }, { status: 400 });
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

    // Check if the appointment exists and belongs to the client
    const existingAppointment = await (db as any)
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.id, parsedId),
        eq(appointments.clientId, user.id)
      ))
      .limit(1);

    if (existingAppointment.length === 0) {
      return NextResponse.json(
        { error: 'Appointment not found or access denied' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    // Convert date string to Date object if provided
    if (data.date) {
      console.log('DEBUG API: Received date string:', data.date);
      updateData.date = new Date(data.date);
      console.log('DEBUG API: Converted to Date object:', updateData.date);
      console.log('DEBUG API: Date object details:', {
        year: updateData.date.getFullYear(),
        month: updateData.date.getMonth(),
        day: updateData.date.getDate(),
        hours: updateData.date.getHours(),
        minutes: updateData.date.getMinutes()
      });
    }

    // Update the appointment
    const [updatedAppointment] = await (db as any)
      .update(appointments)
      .set(updateData)
      .where(and(
        eq(appointments.id, parsedId),
        eq(appointments.clientId, user.id)
      ))
      .returning();

    console.log('Appointment updated by client:', updatedAppointment);

    return NextResponse.json(updatedAppointment, { status: 200 });
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    );
  }
}
