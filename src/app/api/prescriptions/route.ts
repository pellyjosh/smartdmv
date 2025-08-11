// src/app/api/prescriptions/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { prescriptions } from "@/db/schemas/prescriptionsSchema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const isSqlite = process.env.DB_TYPE === 'sqlite';

// Utility function for database-agnostic timestamp handling
const getTimestamp = () => isSqlite ? new Date().getTime() : new Date();

// Define the schema for prescription validation using Zod
const prescriptionSchema = z.object({
  soapNoteId: z.number({
    required_error: "SOAP Note ID is required",
    invalid_type_error: "SOAP Note ID must be a number"
  }),
  petId: z.string({
    required_error: "Pet ID is required",
    invalid_type_error: "Pet ID must be a string"
  }),
  practiceId: z.string({
    required_error: "Practice ID is required",
    invalid_type_error: "Practice ID must be a string"
  }),
  prescribedBy: z.string({
    required_error: "Prescriber ID is required",
    invalid_type_error: "Prescriber ID must be a string"
  }),
  inventoryItemId: z.string().optional().transform((val) => val ? parseInt(val) : null),
  medicationName: z.string({
    required_error: "Medication name is required"
  }).min(1, "Medication name cannot be empty"),
  dosage: z.string({
    required_error: "Dosage is required"
  }).min(1, "Dosage cannot be empty"),
  route: z.enum(["oral", "injectable", "topical", "ophthalmic", "otic", "nasal", "rectal", "inhaled", "other"]),
  frequency: z.enum(["once", "BID", "TID", "QID", "SID", "PRN", "EOD", "weekly", "biweekly", "monthly", "other"]),
  duration: z.string({
    required_error: "Duration is required"
  }).min(1, "Duration cannot be empty"),
  instructions: z.string().optional(),
  quantityPrescribed: z.number({
    required_error: "Quantity prescribed is required",
    invalid_type_error: "Quantity prescribed must be a number"
  }).min(1, "Quantity prescribed must be at least 1"),
  refills: z.number().default(0),
});

// GET /api/prescriptions - Fetch prescriptions with filtering options
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const soapNoteId = searchParams.get("soapNoteId");
    const petId = searchParams.get("petId");
    const practiceId = searchParams.get("practiceId");
    const status = searchParams.get("status");

    // Build where conditions
    const conditions = [];
    
    if (soapNoteId) {
      conditions.push(eq(prescriptions.soapNoteId, parseInt(soapNoteId)));
    }
    
    if (petId) {
      conditions.push(eq(prescriptions.petId, petId));
    }
    
    if (practiceId) {
      conditions.push(eq(prescriptions.practiceId, practiceId));
    }
    
    if (status) {
      conditions.push(eq(prescriptions.status, status));
    }

    // Query prescriptions
    let result;
    if (conditions.length > 0) {
      result = await db.query.prescriptions.findMany({
        where: and(...conditions)
      });
    } else {
      result = await db.query.prescriptions.findMany();
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error fetching prescriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch prescriptions" },
      { status: 500 }
    );
  }
}

// POST /api/prescriptions - Create a new prescription
export async function POST(request: Request) {
  let validatedData: any = null;
  
  try {
    const data = await request.json();
    
    // Validate data using Zod schema
    const validationResult = prescriptionSchema.safeParse(data);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }
    
    // Data is valid, use it
    validatedData = validationResult.data;
    console.log("Creating new prescription with data:", validatedData);
    
    // Insert into database
    // @ts-ignore - Drizzle ORM type issue with multi-database support
    const [newPrescription] = await db.insert(prescriptions).values({
      soapNoteId: validatedData.soapNoteId,
      petId: validatedData.petId,
      practiceId: validatedData.practiceId,
      prescribedBy: validatedData.prescribedBy,
      inventoryItemId: validatedData.inventoryItemId || null,
      medicationName: validatedData.medicationName,
      dosage: validatedData.dosage,
      route: validatedData.route,
      frequency: validatedData.frequency,
      duration: validatedData.duration,
      instructions: validatedData.instructions || null,
      quantityPrescribed: validatedData.quantityPrescribed,
      refills: validatedData.refills || 0,
    }).returning();
    
    return NextResponse.json(
      { 
        ...newPrescription,
        message: "Prescription created successfully" 
      }, 
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating prescription:", error);
    console.error("Validated data was:", validatedData);
    
    // More detailed error information
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    
    return NextResponse.json(
      { 
        error: "Failed to create prescription",
        details: error instanceof Error ? error.message : "Unknown error",
        validatedData: validatedData // Include for debugging
      },
      { status: 500 }
    );
  }
}
