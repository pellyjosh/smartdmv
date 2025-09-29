import { NextRequest, NextResponse } from 'next/server'
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';

import { treatments } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

const isSqlite = process.env.DB_TYPE === 'sqlite'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ soapNoteId: string }> }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const { soapNoteId } = await params

    // Use Drizzle ORM query
    const treatmentList = await tenantDb.query.treatments.findMany({
      where: eq(treatments.soapNoteId, parseInt(soapNoteId)),
      orderBy: [desc(treatments.createdAt)]
    });
    
    return NextResponse.json(treatmentList)
  } catch (error) {
    console.error('Error fetching treatments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch treatments' },
      { status: 500 }
    )
  }
}
