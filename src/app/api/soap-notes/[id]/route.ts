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
  // Main SOAP text fields
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),

  // Subjective tab fields
  chiefComplaint: z.array(z.string()).optional(),
  patientHistory: z.string().optional(),
  symptoms: z.string().optional(),
  duration: z.string().optional(),

  // Objective tab fields - Vital signs
  temperature: z.string().optional(),
  heartRate: z.string().optional(),
  respiratoryRate: z.string().optional(),
  weight: z.string().optional(),
  bloodPressure: z.string().optional(),
  oxygenSaturation: z.string().optional(),

  // Objective tab fields - General appearance
  generalAppearance: z.string().optional(),
  hydration: z.string().optional(),

  // Objective tab fields - Cardiovascular
  heartSounds: z.string().optional(),
  cardiovascularNotes: z.string().optional(),

  // Objective tab fields - Respiratory
  lungSounds: z.string().optional(),
  respiratoryEffort: z.string().optional(),
  respiratoryNotes: z.string().optional(),

  // Objective tab fields - Gastrointestinal
  abdomenPalpation: z.string().optional(),
  bowelSounds: z.string().optional(),
  gastrointestinalNotes: z.string().optional(),

  // Objective tab fields - Musculoskeletal
  gait: z.string().optional(),
  jointStatus: z.string().optional(),
  musculoskeletalNotes: z.string().optional(),

  // Objective tab fields - Neurological
  mentalStatus: z.string().optional(),
  reflexes: z.string().optional(),
  neurologicalNotes: z.string().optional(),

  // Objective tab fields - Integumentary/Skin
  skinCondition: z.string().optional(),
  coatCondition: z.string().optional(),
  skinNotes: z.string().optional(),

  // Assessment tab fields
  primaryDiagnosis: z.array(z.string()).optional(),
  differentialDiagnoses: z.array(z.string()).optional(),
  progressStatus: z.string().optional(),
  confirmationStatus: z.string().optional(),
  progressNotes: z.string().optional(),

  // Plan tab fields
  treatment: z.string().optional(),
  medications: z.array(z.any()).optional(),
  procedures: z.array(z.string()).optional(),
  procedureNotes: z.string().optional(),
  diagnostics: z.array(z.string()).optional(),
  clientEducation: z.string().optional(),
  followUpTimeframe: z.string().optional(),
  followUpReason: z.string().optional(),

  // Flags
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
    const [updatedSoapNote] = await (tenantDb as any).update(soapNotes)
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
    await (tenantDb as any).delete(soapNotes).where(eq(soapNotes.id, soapNoteId));

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
