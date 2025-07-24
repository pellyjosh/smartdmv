import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/index";
import { boardingStays, kennels, pets, users } from "@/db/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const practiceId = url.searchParams.get('practiceId');
  const status = url.searchParams.get('status');
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');

  console.log('Request URL:', request.url);
  console.log('Extracted Practice ID:', practiceId);

  if (!practiceId) {
    return NextResponse.json(
      { error: 'Practice ID is required' }, 
      { status: 400 }
    );
  }

  try {
    let whereCondition;

    if (status && startDate && endDate) {
      whereCondition = (boardingStays: any, { eq, and, gte, lte }: any) => and(
        eq(boardingStays.practiceId, practiceId),
        eq(boardingStays.status, status),
        gte(boardingStays.checkInDate, new Date(startDate)),
        lte(boardingStays.plannedCheckOutDate, new Date(endDate))
      );
    } else if (status) {
      whereCondition = (boardingStays: any, { eq, and }: any) => and(
        eq(boardingStays.practiceId, practiceId),
        eq(boardingStays.status, status)
      );
    } else if (startDate && endDate) {
      whereCondition = (boardingStays: any, { eq, and, gte, lte }: any) => and(
        eq(boardingStays.practiceId, practiceId),
        gte(boardingStays.checkInDate, new Date(startDate)),
        lte(boardingStays.plannedCheckOutDate, new Date(endDate))
      );
    } else {
      whereCondition = (boardingStays: any, { eq }: any) => eq(boardingStays.practiceId, practiceId);
    }

    const staysData = await db.query.boardingStays.findMany({
      where: whereCondition,
      with: {
        pet: {
          with: {
            owner: true
          }
        },
        kennel: true,
        createdBy: true
      }
    });

    return NextResponse.json(staysData, { status: 200 });
  } catch (error) {
    console.error('Error fetching boarding stays:', error);
    return NextResponse.json(
      { error: 'Failed to fetch boarding stays due to a server error. Please try again later.' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      petId,
      kennelId,
      startDate,
      endDate,
      specialInstructions,
      emergencyContactName,
      emergencyContactPhone,
      notes,
      dailyRate,
      practiceId,
      createdById
    } = body;

    // Validate required fields - following your schema structure
    if (!petId || !kennelId || !startDate || !endDate || !practiceId || !createdById) {
      return NextResponse.json(
        { error: 'Missing required fields: petId, kennelId, startDate, endDate, practiceId, createdById' },
        { status: 400 }
      );
    }

    // Validate dates
    const checkInDate = new Date(startDate);
    const plannedCheckOutDate = new Date(endDate);
    
    if (plannedCheckOutDate <= checkInDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Check if kennel is available for the requested dates
    const conflictingStays = await db.query.boardingStays.findMany({
      where: (boardingStays, { eq, and }) => and(
        eq(boardingStays.kennelId, kennelId),
        eq(boardingStays.practiceId, practiceId)
      )
    });

    const hasConflict = conflictingStays.some((stay: any) => {
      if (stay.status === 'cancelled') return false;
      
      const existingStart = new Date(stay.checkInDate);
      const existingEnd = new Date(stay.actualCheckOutDate || stay.plannedCheckOutDate);
      
      // Check for date overlap
      return checkInDate < existingEnd && plannedCheckOutDate > existingStart;
    });

    if (hasConflict) {
      return NextResponse.json(
        { error: 'Kennel is not available for the selected dates' },
        { status: 409 }
      );
    }

    // Verify pet exists and belongs to practice
    const pet = await db.query.pets.findFirst({
      where: (pets, { eq, and }) => and(
        eq(pets.id, petId),
        eq(pets.practiceId, practiceId)
      ),
      with: {
        owner: true
      }
    });

    if (!pet) {
      return NextResponse.json(
        { error: 'Pet not found or does not belong to this practice' },
        { status: 404 }
      );
    }

    // Verify kennel exists and belongs to practice
    const kennel = await db.query.kennels.findFirst({
      where: (kennels, { eq, and }) => and(
        eq(kennels.id, kennelId),
        eq(kennels.practiceId, practiceId),
        eq(kennels.isActive, true)
      )
    });

    if (!kennel) {
      return NextResponse.json(
        { error: 'Kennel not found, inactive, or does not belong to this practice' },
        { status: 404 }
      );
    }

    const stayId = randomUUID();

    // Create the boarding stay - following your exact schema structure
    const newStay = await (db as any).insert(boardingStays).values({
      id: stayId,
      petId,
      kennelId,
      checkInDate: checkInDate.toISOString(),
      plannedCheckOutDate: plannedCheckOutDate.toISOString(),
      actualCheckOutDate: null,
      status: 'scheduled',
      specialInstructions: specialInstructions || null,
      emergencyContactName: emergencyContactName || null,
      emergencyContactPhone: emergencyContactPhone || null,
      reservationNotes: notes || null,
      belongingsDescription: null,
      dailyRate: dailyRate || null,
      practiceId,
      createdById
    }).returning();

    // Fetch the complete stay data with relations
    const completeStay = await db.query.boardingStays.findFirst({
      where: (boardingStays, { eq }) => eq(boardingStays.id, stayId),
      with: {
        pet: {
          with: {
            owner: true
          }
        },
        kennel: true,
        createdBy: true
      }
    });

    return NextResponse.json(completeStay, { status: 201 });
  } catch (error) {
    console.error('Error creating boarding stay:', error);
    return NextResponse.json(
      { error: 'Failed to create boarding stay due to a server error. Please try again later.' },
      { status: 500 }
    );
  }
}
