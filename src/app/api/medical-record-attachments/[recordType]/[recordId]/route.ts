import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/index'
import { medicalRecordAttachments } from '@/db/schema'
import { and, eq, desc } from 'drizzle-orm'

const isSqlite = process.env.DB_TYPE === 'sqlite'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ recordType: string; recordId: string }> }
) {
  try {
    const { recordType, recordId } = await params;
    
    // Use Drizzle ORM query
    const attachments = await db.query.medicalRecordAttachments.findMany({
      where: and(
        eq(medicalRecordAttachments.recordType, recordType),
        eq(medicalRecordAttachments.recordId, recordId)
      ),
      orderBy: [desc(medicalRecordAttachments.createdAt)]
    });
    
    return NextResponse.json(attachments)
  } catch (error) {
    console.error('Error fetching attachments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attachments' },
      { status: 500 }
    )
  }
}
