// src/app/api/soap-notes/route.ts
import { NextResponse } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { soapNotes } from "@/db/schemas/soapNoteSchema";
import { z } from "zod";
import { logCreate, logView } from '@/lib/audit-logger';
import { getUserContextFromStandardRequest } from '@/lib/auth-context';

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
  // Main SOAP text fields
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

  // Subjective tab fields
  chiefComplaint: z.array(z.string()).optional().default([]),
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
  primaryDiagnosis: z.array(z.string()).optional().default([]),
  differentialDiagnoses: z.array(z.string()).optional().default([]),
  progressStatus: z.string().optional(),
  confirmationStatus: z.string().optional(),
  progressNotes: z.string().optional(),

  // Plan tab fields
  treatment: z.string().optional(),
  medications: z.array(z.any()).optional(),
  procedures: z.array(z.string()).optional().default([]),
  procedureNotes: z.string().optional(),
  diagnostics: z.array(z.string()).optional().default([]),
  clientEducation: z.string().optional(),
  followUpTimeframe: z.string().optional(),
  followUpReason: z.string().optional(),

  // Flags
  hasPrescriptions: z.boolean().optional(),
  hasAttachments: z.boolean().optional(),
  hasTreatments: z.boolean().optional(),
});

// Schema for partial updates (PATCH)
const soapNotePartialSchema = soapNoteSchema.partial();

// GET /api/soap-notes - Fetch all SOAP notes with filtering options
import { eq, desc, and, or, like, gte } from "drizzle-orm";

export async function GET(request: Request) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const { searchParams } = new URL(request.url);
    const petId = searchParams.get("petId");
    const practitionerId = searchParams.get("practitionerId"); // For "My Notes" filter
    const recent = searchParams.get("recent"); // For "Recent" filter (last 30 days)
    const search = searchParams.get("search"); // For search functionality
  const limit = searchParams.get("limit"); // Optional limit
  const offset = searchParams.get("offset"); // Optional offset for pagination

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
      const parsedLimit = parseInt(limit, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        queryOptions.limit = Math.min(parsedLimit, 100); // cap to prevent huge responses
      }
    }

    if (offset) {
      const parsedOffset = parseInt(offset, 10);
      if (!isNaN(parsedOffset) && parsedOffset >= 0) {
        (queryOptions as any).offset = parsedOffset;
      }
    }

  const notes = await tenantDb.query.soapNotes.findMany(queryOptions);

  // Log audit for viewing sensitive medical data
  const auditUserContext = await getUserContextFromStandardRequest(request);
  if (auditUserContext) {
    await logView(
      request,
      'SOAP_NOTE',
      'list',
      auditUserContext.userId,
      auditUserContext.practiceId,
      {
        viewType: 'soap_notes_query',
        filters: {
          petId: petId,
          practitionerId: practitionerId,
          recent: recent,
          search: search,
          limit: limit
        },
        resultCount: notes.length
      }
    );
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
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

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
    const [newSoapNote] = await tenantDb.insert(soapNotes).values({
      appointmentId: validatedData.appointmentId || null,
      petId: validatedData.petId,
      practitionerId: validatedData.practitionerId,

      // Main SOAP text fields
      subjective: validatedData.subjective,
      objective: validatedData.objective,
      assessment: validatedData.assessment,
      plan: validatedData.plan,

      // Subjective tab fields
      chiefComplaint: validatedData.chiefComplaint,
      patientHistory: validatedData.patientHistory,
      symptoms: validatedData.symptoms,
      duration: validatedData.duration,

      // Objective tab fields - Vital signs
      temperature: validatedData.temperature,
      heartRate: validatedData.heartRate,
      respiratoryRate: validatedData.respiratoryRate,
      weight: validatedData.weight,
      bloodPressure: validatedData.bloodPressure,
      oxygenSaturation: validatedData.oxygenSaturation,

      // Objective tab fields - General appearance
      generalAppearance: validatedData.generalAppearance,
      hydration: validatedData.hydration,

      // Objective tab fields - Cardiovascular
      heartSounds: validatedData.heartSounds,
      cardiovascularNotes: validatedData.cardiovascularNotes,

      // Objective tab fields - Respiratory
      lungSounds: validatedData.lungSounds,
      respiratoryEffort: validatedData.respiratoryEffort,
      respiratoryNotes: validatedData.respiratoryNotes,

      // Objective tab fields - Gastrointestinal
      abdomenPalpation: validatedData.abdomenPalpation,
      bowelSounds: validatedData.bowelSounds,
      gastrointestinalNotes: validatedData.gastrointestinalNotes,

      // Objective tab fields - Musculoskeletal
      gait: validatedData.gait,
      jointStatus: validatedData.jointStatus,
      musculoskeletalNotes: validatedData.musculoskeletalNotes,

      // Objective tab fields - Neurological
      mentalStatus: validatedData.mentalStatus,
      reflexes: validatedData.reflexes,
      neurologicalNotes: validatedData.neurologicalNotes,

      // Objective tab fields - Integumentary/Skin
      skinCondition: validatedData.skinCondition,
      coatCondition: validatedData.coatCondition,
      skinNotes: validatedData.skinNotes,

      // Assessment tab fields
      primaryDiagnosis: validatedData.primaryDiagnosis,
      differentialDiagnoses: validatedData.differentialDiagnoses,
      progressStatus: validatedData.progressStatus,
      confirmationStatus: validatedData.confirmationStatus,
      progressNotes: validatedData.progressNotes,

      // Plan tab fields
      treatment: validatedData.treatment,
      medications: validatedData.medications,
      procedures: validatedData.procedures,
      procedureNotes: validatedData.procedureNotes,
      diagnostics: validatedData.diagnostics,
      clientEducation: validatedData.clientEducation,
      followUpTimeframe: validatedData.followUpTimeframe,
      followUpReason: validatedData.followUpReason,

      // Flags
      hasPrescriptions: validatedData.hasPrescriptions,
      hasAttachments: validatedData.hasAttachments,
      hasTreatments: validatedData.hasTreatments,
    }).returning();
    
    // Log audit for SOAP note creation
    const auditUserContext = await getUserContextFromStandardRequest(request);
    if (auditUserContext) {
      await logCreate(
        request,
        'SOAP_NOTE',
        newSoapNote.id.toString(),
        {
          petId: newSoapNote.petId,
          practitionerId: newSoapNote.practitionerId,
          appointmentId: newSoapNote.appointmentId,
          subjective: 'REDACTED', // Don't log sensitive medical content
          objective: 'REDACTED',
          assessment: 'REDACTED', 
          plan: 'REDACTED'
        },
        auditUserContext.userId,
        auditUserContext.practiceId,
        undefined,
        {
          createdBy: auditUserContext.name || auditUserContext.email,
          medicalRecord: true,
          petId: newSoapNote.petId
        }
      );
    }
    
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
