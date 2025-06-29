// src/app/api/appointment-requests/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/db'; // Your Drizzle DB instance
import { appointments, appointmentStatusEnum, users, pets } from '@/db/schema'; // Import necessary schemas
import { eq, and, InferInsertModel, sql } from 'drizzle-orm';
import { z } from 'zod'; // For input validation
import { parseISO, format } from 'date-fns'; // For date parsing and formatting

// Zod schema for GET request query parameters
const getAppointmentsSchema = z.object({
  practiceId: z.string().nonempty("Practice ID is required."),
  // Map frontend 'pending', 'approved', 'rejected', 'all' to backend status
  status: z.enum(['pending', 'approved', 'rejected', 'all']).optional(),
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

    const { practiceId, status } = validationResult.data;

    const conditions = [eq(appointments.practiceId, practiceId)];

    // Map frontend status string to database status enum
    if (status === 'pending') {
      conditions.push(eq(appointments.status, 'pending'));
    } else if (status === 'approved') {
      conditions.push(eq(appointments.status, 'scheduled')); // Assuming 'scheduled' is your approved state
    } else if (status === 'rejected') {
      conditions.push(eq(appointments.status, 'cancelled')); // Assuming 'cancelled' is your rejected state
    }
    // If status is 'all', no status condition is added.

    const fetchedAppointments = await db.query.appointments.findMany({
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
        petType: appt.pet?.type || 'N/A',
        petBreed: appt.pet?.breed || null,
        petAge: appt.pet?.age || null,
        reason: appt.description || appt.title, // Map description/title to reason
        date: format(appt.date, 'yyyy-MM-dd'), // Format date back to string for frontend
        time: format(appt.date, 'HH:mm'), // Format time back to string for frontend
        requestNotes: appt.description, // Use description for notes
        preferredDoctor: appt.practitioner?.name || null,
        source: 'website', // Assuming all these come from 'website' for now
        status: appt.status === 'pending' ? 'PENDING_APPROVAL' : // Map DB status back to frontend string
                appt.status === 'scheduled' || appt.status === 'confirmed' ? 'APPROVED' :
                appt.status === 'cancelled' ? 'REJECTED' : 'PENDING_APPROVAL', // Default to pending if unknown
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
    let client = await db.query.users.findFirst({
        where: eq(users.email, requestData.clientEmail)
    });

    if (!client) {
        // If client doesn't exist, create a new user/client record
        const [newClient] = await db.insert(users).values({
            id: crypto.randomUUID(),
            email: requestData.clientEmail,
            name: requestData.clientName,
            phone: requestData.clientPhone,
            role: 'client', // Assign a default role
            practiceId: requestData.practiceId, // Assign to the practice
        }).returning();
        if (!newClient) throw new Error("Failed to create new client user.");
        client = newClient;
    }

    // --- Create/Find Pet ---
    // This logic might need to be more sophisticated (e.g., check for pet owned by client)
    // For simplicity, we'll create a new pet for each new request or find if exists by name/type for this client
    let pet = await db.query.pets.findFirst({
        where: and(eq(pets.name, requestData.petName), eq(pets.type, requestData.petType), eq(pets.ownerId, client.id))
    });

    if (!pet) {
        const [newPet] = await db.insert(pets).values({
            id: crypto.randomUUID(),
            name: requestData.petName,
            type: requestData.petType,
            breed: requestData.petBreed,
            age: requestData.petAge,
            ownerId: client.id, // Link pet to client
            practiceId: requestData.practiceId, // Link pet to practice
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
    const [createdAppointment] = await db.insert(appointments).values({
        id: crypto.randomUUID(),
        title: `Appointment for ${requestData.petName} (${requestData.reason})`,
        description: requestData.requestNotes || requestData.reason,
        date: appointmentDate,
        status: 'pending', // Initial status for a new request
        petId: pet.id,
        clientId: client.id,
        practiceId: requestData.practiceId,
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
        petType: pet.type,
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