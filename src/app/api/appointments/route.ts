import { NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
; // Your Drizzle DB instance
import { appointments, pets, appointmentStatusEnum } from '@/db/schema'; // Import appointments and pets schema
import { eq, and, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import { 
  type AppointmentStatus, 
  isValidStatusTransition,
  shouldAppearOnWhiteboard 
} from '@/lib/appointment-workflow';
import { logCreate, logView } from '@/lib/audit-logger';
import { getUserContextFromStandardRequest } from '@/lib/auth-context';

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
  petId: z.coerce.number().optional().nullable(), // Allow null as per DB schema and frontend optionality
  practitionerId: z.coerce.number({ message: "Practitioner ID is required." }), // This is mandatory from frontend
  practiceId: z.coerce.number({ message: "Practice ID is required." }), // This is mandatory from frontend
  notes: z.string().optional().nullable(), // Map to 'description' in DB, can be nullable
  // Frontend defaults to "pending", ensuring it's one of the enum values
  status: z.enum(appointmentStatusEnum).default("pending"),
});

export async function POST(req: Request) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

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

    let clientId: number | null = null;
    let staffId: number | null = null; // No session, so staffId (who created it) is unknown or null

    // If a petId is provided, attempt to find the pet and its owner (clientId)
    if (petId) {
      const pet = await tenantDb.query.pets.findFirst({
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

    // Convert date string to Date object
    const appointmentDate = new Date(date);
    if (isNaN(appointmentDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // Prepare data for Drizzle insertion
    const newAppointmentData = {
      title: title,
      type: type, // ADD THIS LINE - Save the appointment type to database
      description: notes || null, // Map 'notes' from form to 'description' in DB
      date: appointmentDate, // Pass the Date object directly
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
    const [createdAppointment] = await tenantDb.insert(appointments).values(newAppointmentData).returning();

    if (!createdAppointment) {
      throw new Error('Failed to create appointment in database.');
    }

    // Log appointment creation audit
    const auditUserContext = await getUserContextFromStandardRequest(req);
    if (auditUserContext) {
      await logCreate(
        req,
        'APPOINTMENT',
        createdAppointment.id.toString(),
        {
          title: createdAppointment.title,
          type: createdAppointment.type,
          date: createdAppointment.date,
          status: createdAppointment.status,
          petId: createdAppointment.petId,
          clientId: createdAppointment.clientId,
          practitionerId: createdAppointment.practitionerId,
          practiceId: createdAppointment.practiceId
        },
        auditUserContext.userId,
        createdAppointment.practiceId?.toString(),
        undefined,
        {
          appointmentType: createdAppointment.type,
          petId: createdAppointment.petId,
          clientId: createdAppointment.clientId,
          createdBy: auditUserContext.name || auditUserContext.email
        }
      );
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


export async function GET(req: Request) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    // console.log('[DEBUG API] Starting GET /api/appointments');
    
    const { searchParams } = new URL(req.url);
    const clientIdParam = searchParams.get("clientId");
    const practiceIdParam = searchParams.get("practiceId");
    const date = searchParams.get("date");

    // console.log('[DEBUG API] Raw query params:', { clientIdParam, practiceIdParam, date });

    // Convert string parameters to numbers if provided
    const clientId = clientIdParam ? parseInt(clientIdParam) : null;
    const practiceId = practiceIdParam ? parseInt(practiceIdParam) : null;

    // console.log('[DEBUG API] Parsed params:', { clientId, practiceId, date });

    // If date is provided, filter appointments for that specific date
    if (date) {
      console.log('[DEBUG API] Date-based query');
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const conditions = [];
      if (practiceId) conditions.push(eq(appointments.practiceId, practiceId));
      if (clientId) conditions.push(eq(appointments.clientId, clientId));
      
      // Add date range conditions
      conditions.push(gte(appointments.date, startOfDay));
      conditions.push(lte(appointments.date, endOfDay));

      // console.log('[DEBUG API] Date conditions count:', conditions.length);

      const result = await tenantDb.query.appointments.findMany({
        where: and(...conditions),
        with: {
          pet: true,
          practitioner: true,
          practice: true,
        },
        orderBy: (appointments, { asc }) => [asc(appointments.date)],
      });

      // console.log('[DEBUG API] Date-based results:', result.length);

      // Log audit for viewing appointments
      const auditUserContext = await getUserContextFromStandardRequest(req);
      if (auditUserContext) {
        await logView(
          req,
          'APPOINTMENT',
          'list',
          auditUserContext.userId,
          auditUserContext.practiceId,
          {
            viewType: 'date_filtered',
            filterDate: date,
            clientId,
            practiceId,
            resultCount: result.length
          }
        );
      }

      return NextResponse.json(result);
    }

    // Original logic for non-date queries
    if (!clientId && !practiceId) {
      // console.log('[DEBUG API] Missing required params - returning 400');
      return NextResponse.json(
        { error: "Either clientId, practiceId, or date is required" },
        { status: 400 }
      );
    }

    const conditions = [];
    if (clientId) {
      // console.log('[DEBUG API] Adding clientId condition:', clientId);
      conditions.push(eq(appointments.clientId, clientId));
    }
    if (practiceId) {
      // console.log('[DEBUG API] Adding practiceId condition:', practiceId);
      conditions.push(eq(appointments.practiceId, practiceId));
    }

    // console.log('[DEBUG API] About to query database with', conditions.length, 'conditions');

    const result = await tenantDb.query.appointments.findMany({
      where: and(...conditions),
      with: {
        pet: true,
        practitioner: true,
        practice: true,
      },
      orderBy: (appointments, { desc }) => [desc(appointments.date)],
    });

    // console.log('[DEBUG API] Query completed, found', result.length, 'appointments');
    
    if (result.length > 0) {
      // console.log('[DEBUG API] Sample appointment:', {
      //   id: result[0].id,
      //   title: result[0].title,
      //   type: result[0].type,
      //   practiceId: result[0].practiceId,
      //   status: result[0].status,
      //   date: result[0].date
      // });
      
      // Log all appointment types
      const types = [...new Set(result.map(r => r.type).filter(Boolean))];
      // console.log('[DEBUG API] All types found:', types);
    }

    // Log audit for viewing appointments
    const auditUserContext = await getUserContextFromStandardRequest(req);
    if (auditUserContext) {
      await logView(
        req,
        'APPOINTMENT',
        'list',
        auditUserContext.userId,
        auditUserContext.practiceId,
        {
          viewType: 'filtered',
          clientId,
          practiceId,
          resultCount: result.length
        }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json(
      { error: "Failed to retrieve appointments", details: (error as Error).message },
      { status: 500 }
    );
  }
}