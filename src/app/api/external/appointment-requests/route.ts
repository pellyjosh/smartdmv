import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { appointments, users, pets } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { parseISO, format } from 'date-fns';
import { validateApiKey, hasPermission, hasScope } from '@/lib/api-key-auth';

// Schema for external appointment request (from website widget)
const externalAppointmentRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM format."),
  reason: z.string().min(1, "Reason for appointment is required."),
  source: z.enum(['WEBSITE', 'API']).default('WEBSITE'),
  clientInfo: z.object({
    name: z.string().min(1, "Client name is required."),
    email: z.string().email("Invalid email address."),
    phone: z.string().min(1, "Phone number is required.")
  }),
  petInfo: z.object({
    name: z.string().min(1, "Pet name is required."),
    species: z.string().min(1, "Pet species is required."),
    breed: z.string().optional(),
    age: z.string().optional()
  })
});

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    const apiKeyValidation = await validateApiKey(request);
    if (!apiKeyValidation.isValid) {
      return NextResponse.json(
        { error: apiKeyValidation.error },
        { status: 401 }
      );
    }

    // Check permissions
    if (!hasPermission(apiKeyValidation.keyInfo, 'write') || 
        !hasScope(apiKeyValidation.keyInfo, 'appointments')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create appointments' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = externalAppointmentRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid appointment request data', 
          details: validationResult.error.flatten() 
        },
        { status: 400 }
      );
    }

    const requestData = validationResult.data;
    const practiceId = apiKeyValidation.practiceId!;

    // Create or find client
    let client = await db.query.users.findFirst({
      where: and(
        eq(users.email, requestData.clientInfo.email),
        eq(users.practiceId, practiceId)
      )
    });

    if (!client) {
      const [newClient] = await db.insert(users).values({
        email: requestData.clientInfo.email,
        username: requestData.clientInfo.email,
        password: 'external-client', // External clients don't need login
        name: requestData.clientInfo.name,
        phone: requestData.clientInfo.phone,
        role: 'CLIENT',
        practiceId: practiceId,
      }).returning();
      
      if (!newClient) {
        throw new Error("Failed to create new client user.");
      }
      client = newClient;
    }

    // Create or find pet
    let pet = await db.query.pets.findFirst({
      where: and(
        eq(pets.name, requestData.petInfo.name),
        eq(pets.species, requestData.petInfo.species),
        eq(pets.ownerId, client.id)
      )
    });

    if (!pet) {
      const [newPet] = await db.insert(pets).values({
        name: requestData.petInfo.name,
        species: requestData.petInfo.species,
        breed: requestData.petInfo.breed || null,
        // Simple age conversion - in real app you'd want more sophisticated logic
        dateOfBirth: requestData.petInfo.age ? 
          new Date(new Date().getFullYear() - parseInt(requestData.petInfo.age), 0, 1) : null,
        ownerId: client.id,
        practiceId: practiceId,
      }).returning();
      
      if (!newPet) {
        throw new Error("Failed to create new pet.");
      }
      pet = newPet;
    }

    // Combine date and time
    const appointmentDateTimeString = `${requestData.date}T${requestData.time}:00`;
    const appointmentDate = parseISO(appointmentDateTimeString);

    if (isNaN(appointmentDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date or time format provided.' },
        { status: 400 }
      );
    }

    // Create the appointment with pending status
    const [createdAppointment] = await db.insert(appointments).values({
      title: `${requestData.reason} - ${requestData.petInfo.name}`,
      type: requestData.reason.toLowerCase().replace(/\s+/g, '-'),
      description: `Website appointment request - ${requestData.reason}`,
      date: appointmentDate,
      status: 'pending',
      petId: pet.id,
      clientId: client.id,
      practiceId: practiceId,
      practitionerId: null, // To be assigned by staff
      durationMinutes: '30', // Default duration
    }).returning();

    if (!createdAppointment) {
      throw new Error('Failed to create appointment request.');
    }

    // Return success response
    return NextResponse.json({
      id: createdAppointment.id,
      status: 'PENDING_APPROVAL',
      message: 'Appointment request submitted successfully',
      appointment: {
        date: format(createdAppointment.date, 'yyyy-MM-dd'),
        time: format(createdAppointment.date, 'HH:mm'),
        clientName: client.name,
        petName: pet.name,
        reason: requestData.reason
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating external appointment request:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create appointment request', 
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}
