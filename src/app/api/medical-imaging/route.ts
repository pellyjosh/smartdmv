import { NextResponse } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: Request) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const url = new URL(request.url);
    const petId = url.searchParams.get('petId');
    const practiceId = url.searchParams.get('practiceId');

    // Use type assertion to work around union type issues
    let data;
    if (petId && practiceId) {
      data = await tenantDb.select().from(schema.medicalImaging).where(and(
        eq(schema.medicalImaging.petId, petId),
        eq(schema.medicalImaging.practiceId, practiceId)
      ));
    } else if (petId) {
      data = await tenantDb.select().from(schema.medicalImaging).where(eq(schema.medicalImaging.petId, petId));
    } else if (practiceId) {
      data = await tenantDb.select().from(schema.medicalImaging).where(eq(schema.medicalImaging.practiceId, practiceId));
    } else {
      data = await tenantDb.select().from(schema.medicalImaging);
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error fetching medical imaging data:', error);
    return NextResponse.json({ error: 'Failed to fetch medical imaging data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const body = await request.json();
    console.log('Received body:', body);
    
    // Check if we're using SQLite
    const isSqlite = process.env.DB_TYPE === 'sqlite';
    
    // Prepare the data with proper formatting
    const newImaging = {
      petId: body.petId,
      practiceId: body.practiceId || 'default-practice',
      veterinarianId: body.veterinarianId,
      studyDate: isSqlite ? new Date(body.studyDate).getTime() : new Date(body.studyDate), // For SQLite use timestamp, for Postgres use Date
      imagingType: body.imagingType,
      anatomicalRegion: body.anatomicalRegion || 'other',
      studyName: body.studyName,
      description: body.description || null,
      status: body.status || 'pending',
      hasAnnotations: false,
      hasMeasurements: false,
    };

    console.log('Prepared data for insert:', newImaging);

  const [createdImaging] = await tenantDb.insert(schema.medicalImaging).values(newImaging).returning();
    
    console.log('Created imaging record:', createdImaging);

    return NextResponse.json(createdImaging, { status: 201 });
  } catch (error) {
    console.error('Error creating medical imaging record:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ 
      error: 'Failed to create medical imaging record',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
