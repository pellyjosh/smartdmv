// src/app/api/soap-notes/[id]/route.ts
import { NextResponse } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { soapNotes } from "@/db/schemas/soapNoteSchema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const isSqlite = process.env.DB_TYPE === 'sqlite';

// Utility function for database-agnostic timestamp handling
const getTimestamp = () => isSqlite ? new Date().getTime() : new Date();

// Schema for partial updates (PATCH)
const soapNotePartialSchema = z.object({
  appointmentId: z.union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((val) => {
      if (val === null || val === undefined || val === '') {
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
    })
    .optional(),
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
    })
    .optional(),
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
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const resolvedParams = await params;
    const soapNoteId = parseInt(resolvedParams.id);
    
    if (isNaN(soapNoteId)) {
      return NextResponse.json(
        { error: "Invalid SOAP note ID" },
        { status: 400 }
      );
    }

  const soapNote = await tenantDb.query.soapNotes.findFirst({
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
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

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
      updatedAt: new Date(), // Use Date object for timestamp with mode: 'date'
    };
    
    // Let Drizzle handle boolean conversions automatically for each database type
    
    // @ts-ignore
    const [updatedSoapNote] = await (db as any).update(soapNotes)
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
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

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
    const soapNote = await tenantDb.query.soapNotes.findFirst({
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
    await (db as any).delete(soapNotes).where(eq(soapNotes.id, soapNoteId));

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
