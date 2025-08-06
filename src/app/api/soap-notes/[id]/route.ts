// src/app/api/soap-notes/[id]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { soapNotes } from "@/db/schemas/soapNoteSchema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const isSqlite = process.env.DB_TYPE === 'sqlite';

// Utility function for database-agnostic timestamp handling
const getTimestamp = () => isSqlite ? new Date().getTime() : new Date();

// Schema for partial updates (PATCH)
const soapNotePartialSchema = z.object({
  appointmentId: z.string().optional().nullable(),
  petId: z.string().optional(),
  practitionerId: z.string().optional(),
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  locked: z.boolean().optional(),
  hasPrescriptions: z.boolean().optional(),
  hasAttachments: z.boolean().optional(),
  hasTreatments: z.boolean().optional(),
}).partial();

// GET /api/soap-notes/[id] - Get a specific SOAP note
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const soapNoteId = parseInt(resolvedParams.id);
    
    if (isNaN(soapNoteId)) {
      return NextResponse.json(
        { error: "Invalid SOAP note ID" },
        { status: 400 }
      );
    }

    const soapNote = await db.query.soapNotes.findFirst({
      where: eq(soapNotes.id, soapNoteId),
      with: {
        appointment: true,
        practitioner: true,
        pet: true,
        updatedBy: true,
      }
    });

    if (!soapNote) {
      return NextResponse.json(
        { error: "SOAP note not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(soapNote);
  } catch (error) {
    console.error("Error fetching SOAP note:", error);
    return NextResponse.json(
      { error: "Failed to fetch SOAP note" },
      { status: 500 }
    );
  }
}

// PATCH /api/soap-notes/[id] - Update an existing SOAP note
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const data = await request.json();
    const resolvedParams = await params;
    const soapNoteId = parseInt(resolvedParams.id);
    
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
    
    // Prepare update data with database-appropriate timestamp
    const updateData: any = {
      ...validatedData,
      updatedAt: getTimestamp(), // Database-agnostic timestamp
    };
    
    // Let Drizzle handle boolean conversions automatically for each database type
    
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

// DELETE /api/soap-notes/[id] - Delete a SOAP note
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const soapNoteId = parseInt(resolvedParams.id);
    
    if (isNaN(soapNoteId)) {
      return NextResponse.json(
        { error: "Invalid SOAP note ID" },
        { status: 400 }
      );
    }

    // Check if the SOAP note exists and is not locked
    const soapNote = await db.query.soapNotes.findFirst({
      where: eq(soapNotes.id, soapNoteId)
    });

    if (!soapNote) {
      return NextResponse.json(
        { error: "SOAP note not found" },
        { status: 404 }
      );
    }

    if (soapNote.locked) {
      return NextResponse.json(
        { error: "Cannot delete a locked SOAP note" },
        { status: 403 }
      );
    }

    // Delete the SOAP note
    // @ts-ignore
    await db.delete(soapNotes).where(eq(soapNotes.id, soapNoteId));

    return NextResponse.json(
      { message: "SOAP note deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting SOAP note:", error);
    return NextResponse.json(
      { error: "Failed to delete SOAP note" },
      { status: 500 }
    );
  }
}
