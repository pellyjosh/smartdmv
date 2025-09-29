import { NextRequest, NextResponse } from 'next/server'
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';

import { treatments } from '@/db/schemas/treatmentsSchema'
import { z } from 'zod'

const treatmentCreateSchema = z.object({
  soapNoteId: z.number(),
  petId: z.union([z.number(), z.string()]).transform(val => val.toString()),
  practitionerId: z.string(),
  practiceId: z.string(),
  name: z.string().min(1, 'Treatment name is required'),
  category: z.enum(["medication", "procedure", "surgery", "therapy", "diagnostic", "wellness", "other"]).default("other"),
  description: z.string().optional(),
  inventoryItemId: z.string().optional().nullable(),
  dosage: z.string().optional().nullable(),
  route: z.enum(["oral", "injectable", "topical", "ophthalmic", "otic", "nasal", "rectal", "inhaled", "other"]).optional().nullable(),
  frequency: z.enum(["once", "BID", "TID", "QID", "SID", "PRN", "EOD", "weekly", "biweekly", "monthly", "other"]).optional().nullable(),
  duration: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
  procedureCode: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  technician: z.string().optional().nullable(),
  status: z.enum(["planned", "in_progress", "completed", "discontinued"]).default("planned"),
  administeredDate: z.union([z.string(), z.date()]).optional().transform((val) => val ? new Date(val) : new Date()),
  cost: z.string().optional().nullable(),
  billable: z.boolean().default(false),
  notes: z.string().optional().nullable()
})

const isSqlite = process.env.DB_TYPE === 'sqlite'

export async function POST(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const body = await request.json()
    console.log('Treatment API - Received data:', body)
    
    const validatedData = treatmentCreateSchema.parse(body)
    console.log('Treatment API - Validated data:', validatedData)

    // Use Drizzle ORM to insert the treatment
    // @ts-ignore
    const [newTreatment] = await tenantDb.insert(treatments).values({
      soapNoteId: validatedData.soapNoteId,
      petId: validatedData.petId,
      practitionerId: validatedData.practitionerId,
      practiceId: validatedData.practiceId,
      name: validatedData.name,
      category: validatedData.category,
      description: validatedData.description || null,
      inventoryItemId: validatedData.inventoryItemId || null,
      dosage: validatedData.dosage || null,
      route: validatedData.route || null,
      frequency: validatedData.frequency || null,
      duration: validatedData.duration || null,
      instructions: validatedData.instructions || null,
      procedureCode: validatedData.procedureCode || null,
      location: validatedData.location || null,
      technician: validatedData.technician || null,
      status: validatedData.status,
      administeredDate: validatedData.administeredDate,
      cost: validatedData.cost || null,
      billable: validatedData.billable,
      notes: validatedData.notes || null,
    }).returning()
    
    console.log('Treatment API - Created treatment:', newTreatment)
    
    return NextResponse.json({ 
      success: true, 
      treatment: newTreatment,
      message: 'Treatment created successfully' 
    })

  } catch (error) {
    console.error('Error creating treatment:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid treatment data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create treatment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
