import { NextResponse, NextRequest } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { feedingSchedules } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const { searchParams } = new URL(request.url);
    const stayIdParam = searchParams.get('stayId');

    let feedingSchedulesList;

    if (stayIdParam) {
      const stayIdNum = parseInt(stayIdParam, 10);
      if (Number.isNaN(stayIdNum)) {
        return NextResponse.json([], { status: 200 });
      }
      feedingSchedulesList = await tenantDb.query.feedingSchedules.findMany({
        where: eq(feedingSchedules.stayId, stayIdNum),
        with: {
          stay: {
            with: {
              pet: true
            }
          }
        }
      });
    } else {
      feedingSchedulesList = await tenantDb.query.feedingSchedules.findMany({
        with: {
          stay: {
            with: {
              pet: true
            }
          }
        }
      });
    }

    return NextResponse.json(feedingSchedulesList, { status: 200 });
  } catch (error) {
    console.error('Error fetching feeding schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feeding schedules due to a server error. Please try again later.' },
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
      feedingType, 
      foodDescription,
      amount, 
      frequency, 
      specialInstructions,
      practiceId 
    } = body;

    const stayIdNum = typeof stayId === 'string' ? parseInt(stayId, 10) : stayId;
    const practiceIdNum = typeof practiceId === 'string' ? parseInt(practiceId, 10) : practiceId;

    // Validate required fields
    if (!stayIdNum || !feedingType || !amount || !frequency || !practiceIdNum) {
      return NextResponse.json(
        { error: 'Missing required fields: stayId, feedingType, amount, frequency, and practiceId are required' },
        { status: 400 }
      );
    }

    // Check if the boarding stay exists
    const existingStay = await tenantDb.query.boardingStays.findFirst({
      where: eq((tenantDb.schema as any).boardingStays.id, stayIdNum)
    });

    if (!existingStay) {
      return NextResponse.json(
        { error: 'Boarding stay not found' },
        { status: 404 }
      );
    }

  const newFeedingSchedule = await tenantDb.insert(feedingSchedules)
      .values({
        stayId: stayIdNum,
        feedingType,
        foodDescription,
        frequency,
        amount,
        specialInstructions: specialInstructions || null,
        practiceId: practiceIdNum
      })
      .returning();

    // Fetch the complete feeding schedule data with relations
    const insertedId = Array.isArray(newFeedingSchedule) && newFeedingSchedule[0] ? newFeedingSchedule[0].id : (newFeedingSchedule as any).id;

    const completeFeedingSchedule = await tenantDb.query.feedingSchedules.findFirst({
      where: eq(feedingSchedules.id, insertedId),
      with: {
        stay: {
          with: {
            pet: true
          }
        }
      }
    });

    return NextResponse.json(completeFeedingSchedule, { status: 201 });
  } catch (error) {
    console.error('Error creating feeding schedule:', error);
    return NextResponse.json(
      { error: 'Failed to create feeding schedule due to a server error. Please try again later.' },
      { status: 500 }
    );
  }
}
