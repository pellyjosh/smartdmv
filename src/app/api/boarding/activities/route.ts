import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/index";
import { boardingActivities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stayId = searchParams.get('stayId');

    let activitiesList;

    if (stayId) {
      activitiesList = await db.query.boardingActivities.findMany({
        where: (boardingActivities, { eq }) => eq(boardingActivities.stayId, stayId),
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
      activitiesList = await db.query.boardingActivities.findMany({
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
  try {
    const body = await request.json();
    const { 
      stayId, 
      activityType, 
      activityDate, 
      performedById, 
      notes, 
      success = true,
      practiceId 
    } = body;

    // Validate required fields
    if (!stayId || !activityType || !activityDate || !performedById || !practiceId) {
      return NextResponse.json(
        { error: 'Missing required fields: stayId, activityType, activityDate, performedById, and practiceId are required' },
        { status: 400 }
      );
    }

    // Check if the boarding stay exists
    const existingStay = await db.query.boardingStays.findFirst({
      where: (boardingStays, { eq }) => eq(boardingStays.id, stayId)
    });

    if (!existingStay) {
      return NextResponse.json(
        { error: 'Boarding stay not found' },
        { status: 404 }
      );
    }

    const activityId = randomUUID();

    const newActivity = await (db as any).insert(boardingActivities)
      .values({
        id: activityId,
        stayId,
        activityType,
        activityDate: new Date(activityDate),
        performedById,
        notes: notes || null,
        success,
        practiceId
      })
      .returning();

    // Fetch the complete activity data with relations
    const completeActivity = await db.query.boardingActivities.findFirst({
      where: (boardingActivities, { eq }) => eq(boardingActivities.id, activityId),
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
