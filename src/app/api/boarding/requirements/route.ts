import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/index";
import { boardingRequirements } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stayId = searchParams.get('stayId');

    let requirementsList;

    if (stayId) {
      requirementsList = await db.query.boardingRequirements.findMany({
        where: (boardingRequirements, { eq }) => eq(boardingRequirements.stayId, stayId),
        with: {
          stay: {
            with: {
              pet: true
            }
          }
        }
      });
    } else {
      requirementsList = await db.query.boardingRequirements.findMany({
        with: {
          stay: {
            with: {
              pet: true
            }
          }
        }
      });
    }

    return NextResponse.json(requirementsList, { status: 200 });
  } catch (error) {
    console.error('Error fetching boarding requirements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch boarding requirements due to a server error. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      stayId, 
      requirementType, 
      requirementDescription, 
      isMandatory = true, 
      notes,
      practiceId 
    } = body;

    // Validate required fields
    if (!stayId || !requirementType || !requirementDescription || !practiceId) {
      return NextResponse.json(
        { error: 'Missing required fields: stayId, requirementType, requirementDescription, and practiceId are required' },
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

    const requirementId = randomUUID();

    const newRequirement = await (db as any).insert(boardingRequirements)
      .values({
        id: requirementId,
        stayId,
        requirementType,
        requirementDescription,
        isMandatory,
        isCompleted: false,
        completedDate: null,
        completedById: null,
        notes: notes || null,
        practiceId
      })
      .returning();

    // Fetch the complete requirement data with relations
    const completeRequirement = await db.query.boardingRequirements.findFirst({
      where: (boardingRequirements, { eq }) => eq(boardingRequirements.id, requirementId),
      with: {
        stay: {
          with: {
            pet: true
          }
        }
      }
    });

    return NextResponse.json(completeRequirement, { status: 201 });
  } catch (error) {
    console.error('Error creating boarding requirement:', error);
    return NextResponse.json(
      { error: 'Failed to create boarding requirement due to a server error. Please try again later.' },
      { status: 500 }
    );
  }
}
