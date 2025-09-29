import { NextResponse, NextRequest } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { boardingActivities } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const { searchParams } = new URL(request.url);
    const stayIdParam = searchParams.get('stayId');

    let activitiesList;

    if (stayIdParam) {
      const stayIdNum = parseInt(stayIdParam, 10);
      if (Number.isNaN(stayIdNum)) {
        return NextResponse.json([], { status: 200 });
      }
      activitiesList = await tenantDb.query.boardingActivities.findMany({
        where: (boardingActivities, { eq }) => eq(boardingActivities.stayId, stayIdNum),
        with: {
          stay: {
            with: {
              pet: true
            }
          },
          performedBy: true
        }
      });
    } else {
      activitiesList = await tenantDb.query.boardingActivities.findMany({
        with: {
          stay: {
            with: {
              pet: true
            }
          },
          performedBy: true
        }
      });
    }

    return NextResponse.json(activitiesList, { status: 200 });
  } catch (error) {
    console.error('Error fetching boarding activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch boarding activities due to a server error. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const body = await request.json();
    let { 
      stayId, 
      activityType, 
      activityDate, 
      performedById, 
      notes, 
      success = true,
      practiceId 
    } = body;

    const stayIdNum = typeof stayId === 'string' ? parseInt(stayId, 10) : stayId;
    const performedByIdNum = typeof performedById === 'string' ? parseInt(performedById, 10) : performedById;
    const practiceIdNum = typeof practiceId === 'string' ? parseInt(practiceId, 10) : practiceId;

    // Validate required fields
    if (!stayIdNum || !activityType || !activityDate || !performedByIdNum || !practiceIdNum) {
      return NextResponse.json(
        { error: 'Missing required fields: stayId, activityType, activityDate, performedById, and practiceId are required' },
        { status: 400 }
      );
    }

    // Check if the boarding stay exists
    const existingStay = await tenantDb.query.boardingStays.findFirst({
      where: (boardingStays, { eq }) => eq(boardingStays.id, stayIdNum)
    });

    if (!existingStay) {
      return NextResponse.json(
        { error: 'Boarding stay not found' },
        { status: 404 }
      );
    }

    const newActivity = await (db as any).insert(boardingActivities)
      .values({
        stayId: stayIdNum,
        activityType,
        activityDate: new Date(activityDate),
        performedById: performedByIdNum,
        notes: notes || null,
        success,
        practiceId: practiceIdNum
      })
      .returning();

    // Fetch the complete activity data with relations
    const insertedId = Array.isArray(newActivity) && newActivity[0] ? newActivity[0].id : (newActivity as any).id;

    const completeActivity = await tenantDb.query.boardingActivities.findFirst({
      where: (boardingActivities, { eq }) => eq(boardingActivities.id, insertedId),
      with: {
        stay: {
          with: {
            pet: true
          }
        },
        performedBy: true
      }
    });

    return NextResponse.json(completeActivity, { status: 201 });
  } catch (error) {
    console.error('Error creating boarding activity:', error);
    return NextResponse.json(
      { error: 'Failed to create boarding activity due to a server error. Please try again later.' },
      { status: 500 }
    );
  }
}
