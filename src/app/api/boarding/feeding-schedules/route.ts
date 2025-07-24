import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/index";
import { feedingSchedules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stayId = searchParams.get('stayId');

    let feedingSchedulesList;

    if (stayId) {
      feedingSchedulesList = await db.query.feedingSchedules.findMany({
        where: (feedingSchedules, { eq }) => eq(feedingSchedules.stayId, stayId),
        with: {
          stay: {
            with: {
              pet: true
            }
          }
        }
      });
    } else {
      feedingSchedulesList = await db.query.feedingSchedules.findMany({
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
  try {
    const body = await request.json();
    const { 
      stayId, 
      feedingType, 
      foodDescription,
      amount, 
      frequency, 
      specialInstructions,
      practiceId 
    } = body;

    // Validate required fields
    if (!stayId || !feedingType || !amount || !frequency || !practiceId) {
      return NextResponse.json(
        { error: 'Missing required fields: stayId, feedingType, amount, frequency, and practiceId are required' },
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

    const feedingId = randomUUID();

    const newFeedingSchedule = await (db as any).insert(feedingSchedules)
      .values({
        id: feedingId,
        stayId,
        feedingType,
        foodDescription,
        frequency,
        amount,
        specialInstructions: specialInstructions || null,
        practiceId
      })
      .returning();

    // Fetch the complete feeding schedule data with relations
    const completeFeedingSchedule = await db.query.feedingSchedules.findFirst({
      where: (feedingSchedules, { eq }) => eq(feedingSchedules.id, feedingId),
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
