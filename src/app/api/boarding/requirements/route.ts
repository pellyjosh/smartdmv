import { NextResponse, NextRequest } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { boardingRequirements } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const { searchParams } = new URL(request.url);
    const stayIdParam = searchParams.get('stayId');

    let requirementsList;

    if (stayIdParam) {
      const stayIdNum = parseInt(stayIdParam, 10);
      if (Number.isNaN(stayIdNum)) {
        return NextResponse.json([], { status: 200 });
      }
      requirementsList = await tenantDb.query.boardingRequirements.findMany({
        where: (boardingRequirements, { eq }) => eq(boardingRequirements.stayId, stayIdNum),
        with: {
          stay: {
            with: {
              pet: true
            }
          }
        }
      });
    } else {
      requirementsList = await tenantDb.query.boardingRequirements.findMany({
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
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const body = await request.json();
    let { 
      stayId, 
      requirementType, 
      requirementDescription, 
      isMandatory = true, 
      notes,
      practiceId 
    } = body;

    const stayIdNum = typeof stayId === 'string' ? parseInt(stayId, 10) : stayId;
    const practiceIdNum = typeof practiceId === 'string' ? parseInt(practiceId, 10) : practiceId;

    // Validate required fields
    if (!stayIdNum || !requirementType || !requirementDescription || !practiceIdNum) {
      return NextResponse.json(
        { error: 'Missing required fields: stayId, requirementType, requirementDescription, and practiceId are required' },
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

    const newRequirement = await (db as any).insert(boardingRequirements)
      .values({
        stayId: stayIdNum,
        requirementType,
        requirementDescription,
        isMandatory,
        isCompleted: false,
        completedDate: null,
        completedById: null,
        notes: notes || null,
        practiceId: practiceIdNum
      })
      .returning();

    // Fetch the complete requirement data with relations
    const insertedId = Array.isArray(newRequirement) && newRequirement[0] ? newRequirement[0].id : (newRequirement as any).id;

    const completeRequirement = await tenantDb.query.boardingRequirements.findFirst({
      where: (boardingRequirements, { eq }) => eq(boardingRequirements.id, insertedId),
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
