// src/app/api/appointment-requests/route.ts
import { NextResponse } from 'next/server';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { appointments, appointmentStatusEnum, users, pets } from '@/db/schema'; // Import necessary schemas
import { eq, and, InferInsertModel, sql } from 'drizzle-orm';
import { z } from 'zod'; // For input validation
import { parseISO, format } from 'date-fns'; // For date parsing and formatting

// Zod schema for GET request query parameters
const getAppointmentsSchema = z.object({
  practiceId: z.string().nonempty("Practice ID is required."),
  // Map frontend 'pending', 'approved', 'rejected', 'all' to backend status
  status: z.enum(['pending', 'approved', 'rejected', 'all']).optional(),
  // Add source filter for internal vs external requests
  source: z.enum(['internal', 'external', 'all']).optional(),
});

// Zod schema for POST request body (for a new appointment submission)
const newAppointmentSchema = z.object({
  practiceId: z.string().nonempty("Practice ID is required."),
  clientName: z.string().min(1, "Client name is required."),
  clientEmail: z.string().email("Invalid email address."),
  clientPhone: z.string().optional().nullable(),
  petName: z.string().min(1, "Pet name is required."),
  petType: z.string().min(1, "Pet type is required."),
  petBreed: z.string().optional().nullable(),
  petAge: z.string().optional().nullable(),
  reason: z.string().min(1, "Reason for appointment is required."),
  appointmentType: z.string().optional().nullable(), // Add appointment type field
  // Frontend sends date as string, combine with time to form ISO string
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM format."),
  requestNotes: z.string().optional().nullable(),
  preferredDoctor: z.string().optional().nullable(),
  source: z.string().default('website'), // Default to 'website'
  // Initial status for a new request will be 'pending'
});

export async function GET(req: Request) {
  try {
    const contextualDb = await getCurrentTenantDb();
    const { searchParams } = new URL(req.url);

    const queryParams = Object.fromEntries(searchParams);
    const validationResult = getAppointmentsSchema.safeParse(queryParams);

    if (!validationResult.success) {
      console.error('Validation Error:', validationResult.error.flatten());
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { practiceId, status, source } = validationResult.data;

    const conditions = [eq(appointments.practiceId, parseInt(practiceId))];

    // Map frontend status string to database status enum
    if (status === 'pending') {
      conditions.push(eq(appointments.status, 'pending'));
    } else if (status === 'approved') {
      conditions.push(eq(appointments.status, 'approved')); // Assuming 'scheduled' is your approved state
    } else if (status === 'rejected') {
      conditions.push(eq(appointments.status, 'rejected')); // Assuming 'cancelled' is your rejected state
    }
    // If status is 'all', no status condition is added.

    // Add source filter condition
    if (source === 'internal') {
      conditions.push(eq(appointments.source, 'internal'));
    } else if (source === 'external') {
      conditions.push(eq(appointments.source, 'external'));
    }
    // If source is 'all' or undefined, no source condition is added.

    const fetchedAppointments = await contextualDb.query.appointments.findMany({
      where: and(...conditions),
      orderBy: (appointments, { desc }) => [desc(appointments.createdAt)],
      // You might want to include related data for display on the frontend
      with: {
        pet: true,
        client: true, // Assuming client is a user
        practitioner: true, // Assuming preferred doctor maps to a practitioner
      }
    });

    // Format data to match frontend's expected `AppointmentRequest` type more closely
    // (esp. clientName, petName etc. which are denormalized in the frontend type but from relations here)
    const formattedRequests = fetchedAppointments.map(appt => ({
        id: appt.id, // Use the appointment ID directly
        practiceId: appt.practiceId,
        clientName: appt.client?.name || appt.client?.email || 'N/A', // Get client name from relation
        clientEmail: appt.client?.email || 'N/A',
        clientPhone: appt.client?.phone || null,
        petName: appt.pet?.name || 'N/A', // Get pet name from relation
        petType: appt.pet?.species || 'N/A', // Use species instead of type
        petBreed: appt.pet?.breed || null,
        petAge: appt.pet?.dateOfBirth ? new Date().getFullYear() - new Date(appt.pet.dateOfBirth).getFullYear() : null, // Calculate age from dateOfBirth
        reason: appt.description || appt.title, // Map description/title to reason
        date: format(appt.date, 'yyyy-MM-dd'), // Format date back to string for frontend
        time: format(appt.date, 'HH:mm'), // Format time back to string for frontend
        requestNotes: appt.description, // Use description for notes
        preferredDoctor: appt.practitioner?.name || null,
        source: appt.source || 'internal', // Use actual source from database
        status: appt.status === 'pending' ? 'PENDING_APPROVAL' : // Map DB status back to frontend string
                appt.status === 'approved' || appt.status === 'confirmed' ? 'APPROVED' :
                appt.status === 'rejected' ? 'REJECTED' : 'PENDING_APPROVAL', // Default to pending if unknown
        createdAt: new Date(appt.createdAt).toISOString(),
        updatedAt: appt.updatedAt ? new Date(appt.updatedAt).toISOString() : null,
        appointmentId: appt.id, // The appointment ID IS the request ID in this model
        rejectionReason: appt.status === 'cancelled' ? appt.description : null, // Use description for rejection reason if cancelled
    }));


    return NextResponse.json(formattedRequests, { status: 200 });

  } catch (error) {
    console.error('Error fetching appointments (requests):', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointment requests', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST endpoint for initial submission of a new appointment request
export async function POST(req: Request) {
  try {
    const contextualDb = await getCurrentTenantDb();
    const body = await req.json();

    const validationResult = newAppointmentSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('Validation Error:', validationResult.error.flatten());
      return NextResponse.json(
        { error: 'Invalid input for new appointment request', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const requestData = validationResult.data;

    // --- Create/Find Client (User) ---
    let client = await contextualDb.query.users.findFirst({
        where: eq(users.email, requestData.clientEmail)
    });

    if (!client) {
        // If client doesn't exist, create a new user/client record
        const [newClient] = await contextualDb.insert(users).values({
            email: requestData.clientEmail,
            username: requestData.clientEmail, // Use email as username
            password: 'temp-password', // You'll need to handle password properly
            name: requestData.clientName,
            phone: requestData.clientPhone,
            role: 'CLIENT', // Assign a default role
            practiceId: parseInt(requestData.practiceId), // Assign to the practice
        }).returning();
        if (!newClient) throw new Error("Failed to create new client user.");
        client = newClient;
    }

    // --- Create/Find Pet ---
    // This logic might need to be more sophisticated (e.g., check for pet owned by client)
    // For simplicity, we'll create a new pet for each new request or find if exists by name/species for this client
    let pet = await contextualDb.query.pets.findFirst({
        where: and(eq(pets.name, requestData.petName), eq(pets.species, requestData.petType), eq(pets.ownerId, client.id))
    });

    if (!pet) {
        const [newPet] = await contextualDb.insert(pets).values({
            name: requestData.petName,
            species: requestData.petType, // Use species instead of type
            breed: requestData.petBreed,
            dateOfBirth: requestData.petAge ? new Date(new Date().getFullYear() - parseInt(requestData.petAge), 0, 1) : null, // Convert age to approximate birth date
            ownerId: client.id, // Link pet to client
            practiceId: parseInt(requestData.practiceId), // Link pet to practice
        }).returning();
        if (!newPet) throw new Error("Failed to create new pet.");
        pet = newPet;
    }

    // --- Combine date and time into a single Date object for the appointment schema ---
    const appointmentDateTimeString = `${requestData.date}T${requestData.time}:00`; // Assuming no seconds/timezone
    const appointmentDate = parseISO(appointmentDateTimeString);

    if (isNaN(appointmentDate.getTime())) {
        return NextResponse.json({ error: 'Invalid date or time format provided.' }, { status: 400 });
    }

    // --- Create the Appointment ---
    const [createdAppointment] = await contextualDb.insert(appointments).values({
        title: `Appointment for ${requestData.petName} (${requestData.reason})`,
        type: requestData.appointmentType || 'routine-checkup', // Add appointment type with default
        description: requestData.requestNotes || requestData.reason,
        date: appointmentDate,
        status: 'pending', // Initial status for a new request
        petId: pet.id,
        clientId: client.id,
        practiceId: parseInt(requestData.practiceId),
        // practitionerId and staffId can be set later upon approval if preferredDoctor is a name
        // For now, if preferredDoctor is a name, you'd need to find the user ID. Leaving null for simplicity.
        practitionerId: null, // Assuming this is set upon approval
        durationMinutes: '30', // Default duration
        // createdAt and updatedAt are handled by schema defaults
    }).returning();

    if (!createdAppointment) {
      throw new Error('Failed to create new appointment.');
    }

    // Return the created appointment (which represents the "request")
    return NextResponse.json({
        ...createdAppointment,
        clientName: client.name,
        clientEmail: client.email,
        petName: pet.name,
        petType: pet.species, // Use species instead of type
        // Add other fields from original requestData if needed by frontend
        date: format(createdAppointment.date, 'yyyy-MM-dd'),
        time: format(createdAppointment.date, 'HH:mm'),
        status: 'PENDING_APPROVAL' // Map DB status back to frontend string
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating appointment (request):', error);
    return NextResponse.json(
      { error: 'Failed to create appointment request', details: (error as Error).message },
      { status: 500 }
    );
  }
}