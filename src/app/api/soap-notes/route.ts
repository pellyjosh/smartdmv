// src/app/api/soap-notes/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { soapNotes } from "@/db/schemas/soapNoteSchema";
import { z } from "zod";

// Define the schema for SOAP note validation using Zod
const soapNoteSchema = z.object({
  appointmentId: z.union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((val) => {
      if (val === null || val === undefined || val === '' || val === 'none') {
        return null;
      }
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10);
        if (isNaN(parsed)) {
          throw new Error('Appointment ID must be a valid number');
        }
        return parsed;
      }
      return val;
    })
    .optional()
    .nullable(),
  petId: z.union([z.string(), z.number()])
    .transform((val) => {
      if (typeof val === 'string') {
        if (val.trim() === '') {
          throw new Error('Pet ID cannot be empty');
        }
        const parsed = parseInt(val, 10);
        if (isNaN(parsed)) {
          throw new Error('Pet ID must be a valid number');
        }
        return parsed;
      }
      return val;
    }),
  practitionerId: z.union([z.string(), z.number()])
    .transform((val) => {
      if (typeof val === 'string') {
        if (val.trim() === '') {
          throw new Error('Practitioner ID cannot be empty');
        }
        const parsed = parseInt(val, 10);
        if (isNaN(parsed)) {
          throw new Error('Practitioner ID must be a valid number');
        }
        return parsed;
      }
      return val;
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
      const petIdInt = parseInt(petId, 10);
      if (!isNaN(petIdInt)) {
        conditions.push(eq(soapNotes.petId, petIdInt));
      }
    }
    
    if (practitionerId) {
      const practitionerIdInt = parseInt(practitionerId, 10);
      if (!isNaN(practitionerIdInt)) {
        conditions.push(eq(soapNotes.practitionerId, practitionerIdInt));
      }
    }
    
    if (recent === "true") {
      // Get notes from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      // Use Date object for timestamp comparison since createdAt has mode: 'date'
      conditions.push(gte(soapNotes.createdAt, thirtyDaysAgo));
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
    const [newSoapNote] = await (db as any).insert(soapNotes).values({
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
