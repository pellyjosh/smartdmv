import { NextResponse } from 'next/server';
import { db } from '@/db'; // Your Drizzle DB instance
import { appointments, pets, appointmentStatusEnum } from '@/db/schema'; // Import appointments and pets schema
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Define a Zod schema for the incoming request body
// This schema strictly defines what the API expects from the frontend.
const insertAppointmentSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  // 'type' is from SimpleCustomFieldSelect and not directly in DB schema.
  // We'll process it but won't directly insert into 'appointments' table unless
  // you decide to concatenate it into 'description' or add a new column.
  type: z.string({ message: "Please select appointment type" }),
  date: z.string().datetime({ message: "Please select a valid date and time (ISO format)." }),
  duration: z.coerce.number().min(15, { message: "Duration must be at least 15 minutes" }),
  petId: z.string().optional().nullable(), // Allow null as per DB schema and frontend optionality
  practitionerId: z.string().nonempty({ message: "Practitioner ID is required." }), // This is mandatory from frontend
  practiceId: z.string().nonempty({ message: "Practice ID is required." }), // This is mandatory from frontend
  notes: z.string().optional().nullable(), // Map to 'description' in DB, can be nullable
  // Frontend defaults to "scheduled", ensuring it's one of the enum values
  status: z.enum(appointmentStatusEnum).default("pending"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate the incoming data
    const validationResult = insertAppointmentSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('Validation Error:', validationResult.error.flatten());
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const {
      title,
      type, // 'type' is received but not directly mapped to DB unless added or concatenated
      date,
      duration,
      petId,
      practitionerId,
      practiceId,
      notes,
      status,
    } = validationResult.data;

    let clientId: string | null = null;
    let staffId: string | null = null; // No session, so staffId (who created it) is unknown or null

    // If a petId is provided, attempt to find the pet and its owner (clientId)
    if (petId) {
      const pet = await db.query.pets.findFirst({
        where: eq(pets.id, petId),
      });

      if (!pet) {
        return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
      }
      clientId = pet.ownerId; // The pet's owner becomes the client for the appointment
    }
    // If no petId, and no explicit clientId is passed (which it isn't from your form), clientId remains null.
    // This implies that if an appointment isn't for a specific pet, it might not have an associated client.
    // Adjust this logic if your business rules are different (e.g., must always have a client, even if not linked to a pet).

    // Convert date string to Date object first, then get its timestamp
    const appointmentDate = new Date(date);
    if (isNaN(appointmentDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // Prepare data for Drizzle insertion
    const newAppointmentData = {
      title: title,
      description: notes || null, // Map 'notes' from form to 'description' in DB
      date: appointmentDate.getTime(), // <-- CORRECTED: Pass the number (milliseconds) here
      durationMinutes: duration.toString(), // Convert number duration to string as per your schema
      status: status,
      petId: petId || null,
      clientId: clientId, // Derived from pet's owner or null
      staffId: staffId, // Currently null, as no session user to assign as staff
      practitionerId: practitionerId,
      practiceId: practiceId,
    };

    console.log('Attempting to insert appointment:', newAppointmentData);

    // Insert the new appointment into the database
    // .returning() allows you to get the inserted row back
    const [createdAppointment] = await db.insert(appointments).values(newAppointmentData).returning();

    if (!createdAppointment) {
      throw new Error('Failed to create appointment in database.');
    }

    console.log('Appointment created successfully:', createdAppointment);
    return NextResponse.json(createdAppointment, { status: 201 }); // 201 Created
  } catch (error) {
    console.error('Error creating appointment:', error);
    // Provide a more specific error if possible, otherwise a generic 500
    return NextResponse.json(
      { error: 'Failed to create appointment', details: (error as Error).message },
      { status: 500 }
    );
  }
}