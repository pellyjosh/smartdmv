// src/app/api/soap-notes/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { soapNotes } from "@/db/schemas/soapNoteSchema";
import { z } from "zod";

// Define the schema for SOAP note validation using Zod
const soapNoteSchema = z.object({
  appointmentId: z.string().optional().nullable(),
  petId: z.string({
    required_error: "Pet ID is required",
    invalid_type_error: "Pet ID must be a string"
  }),
  practitionerId: z.string({
    required_error: "Practitioner ID is required",
    invalid_type_error: "Practitioner ID must be a string"
  }),
  subjective: z.string({
    required_error: "Subjective field is required"
  }).min(1, "Subjective field cannot be empty"),
  objective: z.string({
    required_error: "Objective field is required"
  }).min(1, "Objective field cannot be empty"),
  assessment: z.string({
    required_error: "Assessment field is required"
  }).min(1, "Assessment field cannot be empty"),
  plan: z.string({
    required_error: "Plan field is required"
  }).min(1, "Plan field cannot be empty"),
});

// Schema for partial updates (PATCH)
const soapNotePartialSchema = soapNoteSchema.partial({
  appointmentId: true,
  petId: true,
  subjective: true,
  objective: true,
  assessment: true,
  plan: true,
  practitionerId: true
});

// GET /api/soap-notes - Fetch all SOAP notes with filtering options
import { eq, desc, and, or, like, gte } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const petId = searchParams.get("petId");
    const practitionerId = searchParams.get("practitionerId"); // For "My Notes" filter
    const recent = searchParams.get("recent"); // For "Recent" filter (last 30 days)
    const search = searchParams.get("search"); // For search functionality
    const limit = searchParams.get("limit"); // Optional limit

    // Build where conditions
    const conditions = [];
    
    if (petId) {
      conditions.push(eq(soapNotes.petId, petId));
    }
    
    if (practitionerId) {
      conditions.push(eq(soapNotes.practitionerId, practitionerId));
    }
    
    if (recent === "true") {
      // Get notes from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      // Convert to milliseconds timestamp for SQLite compatibility
      const thirtyDaysAgoTimestamp = thirtyDaysAgo.getTime();
      conditions.push(gte(soapNotes.createdAt, thirtyDaysAgoTimestamp));
    }
    
    if (search) {
      // Search in subjective, objective, assessment, and plan fields
      const searchCondition = or(
        like(soapNotes.subjective, `%${search}%`),
        like(soapNotes.objective, `%${search}%`),
        like(soapNotes.assessment, `%${search}%`),
        like(soapNotes.plan, `%${search}%`)
      );
      conditions.push(searchCondition);
    }

    // Combine all conditions
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Query with conditions
    const queryOptions: any = {
      with: {
        appointment: true,
        practitioner: true,
        pet: true,
        updatedBy: true,
      },
      orderBy: [desc(soapNotes.createdAt)] // Always order by newest first
    };

    if (whereClause) {
      queryOptions.where = whereClause;
    }

    if (limit) {
      queryOptions.limit = parseInt(limit);
    }

    const notes = await db.query.soapNotes.findMany(queryOptions);
    
    return NextResponse.json(notes);
  } catch (error) {
    console.error("Error fetching SOAP notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch SOAP notes" },
      { status: 500 }
    );
  }
}

// POST /api/soap-notes - Create a new SOAP note
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate data using Zod schema
    const validationResult = soapNoteSchema.safeParse(data);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }
    
    // Data is valid, use it
    const validatedData = validationResult.data;
    console.log("Creating new SOAP note with data:", validatedData);
    
    // Insert into database, disregarding TypeScript errors as per project pattern
    // @ts-ignore
    const [newSoapNote] = await db.insert(soapNotes).values({
      appointmentId: validatedData.appointmentId || null,
      petId: validatedData.petId,
      practitionerId: validatedData.practitionerId,
      subjective: validatedData.subjective,
      objective: validatedData.objective,
      assessment: validatedData.assessment,
      plan: validatedData.plan,
    }).returning();
    
    return NextResponse.json(
      { 
        ...newSoapNote,
        message: "SOAP note created successfully" 
      }, 
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating SOAP note:", error);
    return NextResponse.json(
      { error: "Failed to create SOAP note" },
      { status: 500 }
    );
  }
}
