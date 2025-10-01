import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { z } from 'zod'
import { sql } from 'drizzle-orm';

const treatmentUpdateSchema = z.object({
  name: z.string().optional(),
  category: z.enum(["medication", "procedure", "surgery", "therapy", "diagnostic", "wellness", "other"]).optional(),
  description: z.string().optional(),
  dosage: z.string().optional(),
  route: z.enum(["oral", "injectable", "topical", "ophthalmic", "otic", "nasal", "rectal", "inhaled", "other"]).optional(),
  frequency: z.enum(["once", "BID", "TID", "QID", "SID", "PRN", "EOD", "weekly", "biweekly", "monthly", "other"]).optional(),
  duration: z.string().optional(),
  instructions: z.string().optional(),
  procedureCode: z.string().optional(),
  location: z.string().optional(),
  technician: z.string().optional(),
  status: z.enum(["planned", "in_progress", "completed", "discontinued"]).optional(),
  cost: z.string().optional(),
  billable: z.boolean().optional(),
  notes: z.string().optional()
})

const isSqlite = process.env.DB_TYPE === 'sqlite'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const { id } = await params
    const body = await request.json()
    
    const validatedData = treatmentUpdateSchema.parse(body)

    if (isSqlite) {
      // Build update query dynamically
      const updates = []
      const values = []
      
      for (const [key, value] of Object.entries(validatedData)) {
        if (value !== undefined) {
          const dbKey = key === 'procedureCode' ? 'procedure_code' : 
                       key === 'billable' ? 'billed' : key
          updates.push(`${dbKey} = ?`)
          values.push(key === 'billable' ? (value ? 1 : 0) : value)
        }
      }
      
      if (updates.length === 0) {
        return NextResponse.json(
          { error: 'No fields to update' },
          { status: 400 }
        )
      }
      
      values.push(id)
      
      // Use tenantDb.execute with parameterized SQL
      await tenantDb.execute(sql.raw(`UPDATE treatments SET ${updates.join(', ')}, updatedAt = strftime('%s', 'now') * 1000 WHERE id = ?`), values)
      
      // Get updated treatment
      const updatedResult: any = await tenantDb.execute(sql.raw(`SELECT * FROM treatments WHERE id = ?`), [id]);
      const updated = Array.isArray(updatedResult) ? updatedResult[0] : (updatedResult.rows ? updatedResult.rows[0] : undefined);
      
      if (!updated) {
        return NextResponse.json(
          { error: 'Treatment not found' },
          { status: 404 }
        )
      }
      
      return NextResponse.json({ 
        success: true, 
        treatment: updated,
        message: 'Treatment updated successfully' 
      })
    } else {
      // PostgreSQL would use Drizzle ORM here
      throw new Error('PostgreSQL treatments not implemented yet')
    }

  } catch (error) {
    console.error('Error updating treatment:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid treatment data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update treatment' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const { id } = await params

    if (isSqlite) {
      // Check if treatment exists first
      const existingResult: any = await tenantDb.execute(sql.raw(`SELECT id FROM treatments WHERE id = ?`), [id]);
      const existing = Array.isArray(existingResult) ? existingResult[0] : (existingResult.rows ? existingResult.rows[0] : undefined);
      
      if (!existing) {
        return NextResponse.json(
          { error: 'Treatment not found' },
          { status: 404 }
        )
      }
      
      // Delete treatment
      await tenantDb.execute(sql.raw(`DELETE FROM treatments WHERE id = ?`), [id]);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Treatment deleted successfully' 
      })
    } else {
      // PostgreSQL would use Drizzle ORM here
      throw new Error('PostgreSQL treatments not implemented yet')
    }

  } catch (error) {
    console.error('Error deleting treatment:', error)
    return NextResponse.json(
      { error: 'Failed to delete treatment' },
      { status: 500 }
    )
  }
}
