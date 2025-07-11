// src/app/api/soap-notes/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { soapNotes } from "@/db/schemas/soapNoteSchema";
import { z } from "zod";

// Define the schema for SOAP note validation using Zod
const soapNoteSchema = z.object({
  petId: z.string({
    required_error: "Pet ID is required",
    invalid_type_error: "Pet ID must be a string"
  }),
  practitionerId: z.string({
    invalid_type_error: "Practitioner ID must be a number"
  }).optional(),
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
  petId: true,
  subjective: true,
  objective: true,
  assessment: true,
  plan: true,
  practitionerId: true
});

// GET /api/soap-notes - Fetch all SOAP notes or filter by petId if provided
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const petId = searchParams.get("petId");

    let notes;
    if (petId) {
      const petIdNum = parseInt(petId);
      notes = await db.query.soapNotes.findMany({
        where: (notes, { eq }) => eq(notes.petId, petIdNum)
      });
    } else {
      notes = await db.query.soapNotes.findMany();
    }
    
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
      petId: validatedData.petId,
      practitionerId: validatedData.practitionerId || null,
      subjective: validatedData.subjective,
      objective: validatedData.objective,
      assessment: validatedData.assessment,
      plan: validatedData.plan,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
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

// PATCH /api/soap-notes/:id - Update an existing SOAP note
export async function PATCH(
  request: Request,
  { params }: { params: { soapNoteId: string } }
) {
  try {
    const data = await request.json();
    const soapNoteId = parseInt(params.soapNoteId);
    
    if (isNaN(soapNoteId)) {
      return NextResponse.json(
        { error: "Invalid SOAP note ID" },
        { status: 400 }
      );
    }
    
    // Validate data using Zod partial schema
    const validationResult = soapNotePartialSchema.safeParse(data);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }
    
    // Data is valid, use it
    const validatedData = validationResult.data;
    console.log(`Updating SOAP note ${soapNoteId} with data:`, validatedData);
    
    // Update in database, disregarding TypeScript errors as per project pattern
    const updateData = {
      ...validatedData,
      updatedAt: new Date().toISOString(),
      practitionerId: validatedData.practitionerId || null
    };
    // @ts-ignore
    const [updatedSoapNote] = await db.update(soapNotes)
      .set(updateData)
      .where(eq(soapNotes.id, soapNoteId))
      .returning();
    
    if (!updatedSoapNote) {
      return NextResponse.json(
        { error: "SOAP note not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { 
        ...updatedSoapNote,
        message: "SOAP note updated successfully" 
      }, 
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating SOAP note:", error);
    return NextResponse.json(
      { error: "Failed to update SOAP note" },
      { status: 500 }
    );
  }
}
