import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/index";
import { kennels } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const practiceId = url.searchParams.get('practiceId');
  const available = url.searchParams.get('available');
  const type = url.searchParams.get('type');
  const size = url.searchParams.get('size');

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

    if (type && size) {
      whereCondition = (kennels: any, { eq, and }: any) => and(
        eq(kennels.practiceId, practiceId),
        eq(kennels.isActive, true),
        eq(kennels.type, type),
        eq(kennels.size, size)
      );
    } else if (type) {
      whereCondition = (kennels: any, { eq, and }: any) => and(
        eq(kennels.practiceId, practiceId),
        eq(kennels.isActive, true),
        eq(kennels.type, type)
      );
    } else if (size) {
      whereCondition = (kennels: any, { eq, and }: any) => and(
        eq(kennels.practiceId, practiceId),
        eq(kennels.isActive, true),
        eq(kennels.size, size)
      );
    } else {
      whereCondition = (kennels: any, { eq, and }: any) => and(
        eq(kennels.practiceId, practiceId),
        eq(kennels.isActive, true)
      );
    }

    const kennelsData = await db.query.kennels.findMany({
      where: whereCondition
    });

    // If available filter is requested, we need to check for conflicts with boarding stays
    if (available === 'true') {
      // For now, return all kennels - in a real implementation, you'd check for conflicts
      // with current boarding stays
      const availableKennels = kennelsData.map((kennel: any) => ({
        ...kennel,
        isOccupied: false, // TODO: Calculate based on current boarding stays
        capacity: 1 // TODO: Add capacity field to kennel schema if needed
      }));
      
      return NextResponse.json(availableKennels, { status: 200 });
    }

    return NextResponse.json(kennelsData, { status: 200 });
  } catch (error) {
    console.error('Error fetching kennels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch kennels due to a server error. Please try again later.' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      type,
      size,
      location,
      description,
      practiceId
    } = body;

    // Validate required fields
    if (!name || !type || !size || !practiceId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, size, practiceId' },
        { status: 400 }
      );
    }

    // Check if kennel name already exists in practice
    const existingKennel = await db.query.kennels.findFirst({
      where: (kennels, { eq, and }) => and(
        eq(kennels.name, name),
        eq(kennels.practiceId, practiceId)
      )
    });

    if (existingKennel) {
      return NextResponse.json(
        { error: 'Kennel with this name already exists in this practice' },
        { status: 409 }
      );
    }

    const kennelId = randomUUID();

    // Create the kennel - using a type assertion to handle the union type
    const newKennel = await (db as any).insert(kennels).values({
      id: kennelId,
      name,
      type,
      size,
      location: location || null,
      description: description || null,
      isActive: true,
      practiceId
    }).returning();

    return NextResponse.json(newKennel[0], { status: 201 });
  } catch (error) {
    console.error('Error creating kennel:', error);
    return NextResponse.json(
      { error: 'Failed to create kennel due to a server error. Please try again later.' },
      { status: 500 }
    );
  }
}
