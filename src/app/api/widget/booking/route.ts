import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, pets, appointments, practices, integrationApiKeys } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'crypto';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// Validation schema for external booking
const externalBookingSchema = z.object({
  // Practice and API validation
  practiceId: z.coerce.number({ message: "Practice ID is required." }),
  apiKey: z.string({ message: "API key is required." }),
  
  // Appointment details
  appointmentType: z.string({ message: "Please select appointment type" }),
  appointmentDate: z.string({ message: "Please select appointment date" }), // Accept date as string
  appointmentTime: z.string({ message: "Please select appointment time" }),
  
  // Client information
  clientName: z.string().min(2, { message: "Full name is required" }),
  clientEmail: z.string().email({ message: "Valid email is required" }),
  clientPhone: z.string().min(10, { message: "Phone number is required" }),
  
  // Pet information
  petName: z.string().min(2, { message: "Pet name is required" }),
  petType: z.string({ message: "Pet type is required" }),
  petBreed: z.string().optional(),
  petAge: z.string().optional(),
  
  // Additional info
  reason: z.string().min(5, { message: "Reason for visit is required" }),
  preferredDoctor: z.string().optional(),
});

// API key validation
async function validateApiKey(apiKey: string, practiceId: number): Promise<boolean> {
  try {
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    const keyRecord = await db.query.integrationApiKeys.findFirst({
      where: and(
        eq(integrationApiKeys.practiceId, practiceId),
        eq(integrationApiKeys.keyHash, keyHash),
        eq(integrationApiKeys.isActive, true)
      )
    });
    
    return !!keyRecord;
  } catch (error) {
    console.error('API key validation error:', error);
    return false;
  }
}

// Create or find client by email
async function createOrFindClient(clientData: any, practiceId: number) {
  try {
    console.log('Creating/finding client:', clientData, practiceId);
    
    // First, try to find existing client by email and practice
    const existingClient = await db.query.users.findFirst({
      where: and(
        eq(users.email, clientData.clientEmail),
        eq(users.practiceId, practiceId),
        eq(users.role, 'CLIENT')
      )
    });

    if (existingClient) {
      console.log('Found existing client:', existingClient.id);
      // Update client info if needed
      await db.update(users)
        .set({
          name: clientData.clientName,
          phone: clientData.clientPhone,
          updatedAt: new Date()
        })
        .where(eq(users.id, existingClient.id));
      
      return existingClient;
    }

    console.log('Creating new client');
    // Create new client
    const [newClient] = await db.insert(users).values({
      email: clientData.clientEmail,
      username: clientData.clientEmail, // Use email as username for external clients
      name: clientData.clientName,
      phone: clientData.clientPhone,
      password: crypto.randomBytes(32).toString('hex'), // Random password, they'll need to reset
      role: 'CLIENT',
      practiceId: practiceId,
      currentPracticeId: practiceId,
    }).returning();

    console.log('Client created successfully:', newClient.id);
    return newClient;
  } catch (error) {
    console.error('Error creating/finding client:', error);
    throw new Error(`Failed to create or find client: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Create pet for client
async function createPet(petData: any, clientId: number, practiceId: number) {
  try {
    console.log('Creating pet for client:', petData, clientId, practiceId);
    
    // Check if pet already exists for this client
    const existingPet = await db.query.pets.findFirst({
      where: and(
        eq(pets.name, petData.petName),
        eq(pets.ownerId, clientId),
        eq(pets.practiceId, practiceId)
      )
    });

    if (existingPet) {
      console.log('Found existing pet:', existingPet.id);
      // Update pet info if needed
      await db.update(pets)
        .set({
          species: petData.petType,
          breed: petData.petBreed || null,
          pet_type: petData.petType,
          updatedAt: new Date()
        })
        .where(eq(pets.id, existingPet.id));
      
      return existingPet;
    }

    console.log('Creating new pet');
    // Create new pet
    const [newPet] = await db.insert(pets).values({
      name: petData.petName,
      species: petData.petType,
      breed: petData.petBreed || null,
      pet_type: petData.petType,
      ownerId: clientId,
      practiceId: practiceId,
    }).returning();

    console.log('Pet created successfully:', newPet.id);
    return newPet;
  } catch (error) {
    console.error('Error creating pet:', error);
    throw new Error(`Failed to create pet: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Create appointment
async function createAppointment(appointmentData: any, clientId: number, petId: number, practiceId: number) {
  try {
    // Combine date and time
    const appointmentDateTime = new Date(`${appointmentData.appointmentDate}T${appointmentData.appointmentTime}:00`);
    
    if (isNaN(appointmentDateTime.getTime())) {
      throw new Error('Invalid appointment date/time');
    }

    console.log('Creating appointment with data:', {
      title: `${appointmentData.appointmentType} - ${appointmentData.petName}`,
      date: appointmentDateTime,
      clientId,
      petId,
      practiceId
    });

    // Create appointment with 'external' source
    const [newAppointment] = await db.insert(appointments).values({
      title: `${appointmentData.appointmentType} - ${appointmentData.petName}`,
      description: appointmentData.reason,
      date: appointmentDateTime,
      durationMinutes: '30', // Default duration
      status: 'pending', // External bookings start as pending
      type: appointmentData.appointmentType,
      petId: petId,
      clientId: clientId,
      practiceId: practiceId,
      source: 'external', // Mark as external booking
      notes: appointmentData.preferredDoctor ? `Preferred Doctor: ${appointmentData.preferredDoctor}` : null,
    }).returning();

    console.log('Appointment created successfully:', newAppointment);
    return newAppointment;
  } catch (error) {
    console.error('Error creating appointment:', error);
    console.error('Appointment error details:', error instanceof Error ? error.message : String(error));
    throw new Error(`Failed to create appointment: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request data
    const validationResult = externalBookingSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.error('Validation Error:', validationResult.error.flatten());
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid booking data', 
          details: validationResult.error.flatten().fieldErrors 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const {
      practiceId,
      apiKey,
      appointmentType,
      appointmentDate,
      appointmentTime,
      clientName,
      clientEmail,
      clientPhone,
      petName,
      petType,
      petBreed,
      petAge,
      reason,
      preferredDoctor
    } = validationResult.data;

    // Validate API key
    const isValidApiKey = await validateApiKey(apiKey, practiceId);
    if (!isValidApiKey) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key or practice ID' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify practice exists
    const practice = await db.query.practices.findFirst({
      where: eq(practices.id, practiceId)
    });

    if (!practice) {
      return NextResponse.json(
        { success: false, error: 'Practice not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Start transaction to create client, pet, and appointment
    const result = await db.transaction(async (tx) => {
      // 1. Create or find client
      const client = await createOrFindClient({
        clientName,
        clientEmail,
        clientPhone
      }, practiceId);

      // 2. Create pet
      const pet = await createPet({
        petName,
        petType,
        petBreed,
        petAge
      }, client.id, practiceId);

      // 3. Create appointment
      const appointment = await createAppointment({
        appointmentType,
        appointmentDate,
        appointmentTime,
        reason,
        preferredDoctor,
        petName
      }, client.id, pet.id, practiceId);

      return {
        client,
        pet,
        appointment
      };
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Appointment booked successfully!',
      data: {
        appointmentId: result.appointment.id,
        clientId: result.client.id,
        petId: result.pet.id,
        appointmentDate: result.appointment.date,
        status: result.appointment.status,
        practice: practice.name
      }
    }, { 
      status: 201, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('External booking error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to book appointment. Please try again.',
        debug: error instanceof Error ? error.message : String(error) // Add debug info in development
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
