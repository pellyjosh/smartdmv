import { NextRequest, NextResponse } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { vaccineTypes } from "@/db/schemas/vaccinationsSchema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string  }> }
) {
  const resolvedParams = await params;
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    const vaccineTypeId = parseInt(resolvedParams.id);

    if (!userPractice) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isNaN(vaccineTypeId)) {
      return NextResponse.json(
        { error: "Invalid vaccine type ID" },
        { status: 400 }
      );
    }

    const vaccineType = await db
      .select()
      .from(vaccineTypes)
      .where(
        and(
          eq(vaccineTypes.id, vaccineTypeId),
          eq(vaccineTypes.practiceId, parseInt(userPractice.practiceId))
        )
      )
      .limit(1);

    if (vaccineType.length === 0) {
      return NextResponse.json(
        { error: "Vaccine type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(vaccineType[0]);
  } catch (error) {
    console.error("Error fetching vaccine type:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string  }> }
) {
  const resolvedParams = await params;
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    const vaccineTypeId = parseInt(resolvedParams.id);

    if (!userPractice) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isNaN(vaccineTypeId)) {
      return NextResponse.json(
        { error: "Invalid vaccine type ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      name,
      type,
      species,
      manufacturer,
      durationOfImmunity,
      diseasesProtected,
      sideEffects,
      contraindications,
      isActive
    } = body;

    // Validate required fields
    if (!name || !type || !species) {
      return NextResponse.json(
        { error: "Name, type, and species are required" },
        { status: 400 }
      );
    }

    // Check if vaccine type exists and belongs to practice
    const existingVaccineType = await db
      .select()
      .from(vaccineTypes)
      .where(
        and(
          eq(vaccineTypes.id, vaccineTypeId),
          eq(vaccineTypes.practiceId, parseInt(userPractice.practiceId))
        )
      )
      .limit(1);

    if (existingVaccineType.length === 0) {
      return NextResponse.json(
        { error: "Vaccine type not found" },
        { status: 404 }
      );
    }

    // Update vaccine type
    const updatedVaccineType = await db
      .update(vaccineTypes)
      .set({
        name,
        type,
        species,
        manufacturer,
        durationOfImmunity,
        diseasesProtected,
        sideEffects,
        contraindications,
        isActive: isActive ?? true,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(vaccineTypes.id, vaccineTypeId),
          eq(vaccineTypes.practiceId, parseInt(userPractice.practiceId))
        )
      )
      .returning();

    if (updatedVaccineType.length === 0) {
      return NextResponse.json(
        { error: "Failed to update vaccine type" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedVaccineType[0]);
  } catch (error) {
    console.error("Error updating vaccine type:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string  }> }
) {
  const resolvedParams = await params;
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    const vaccineTypeId = parseInt(resolvedParams.id);

    if (!userPractice) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isNaN(vaccineTypeId)) {
      return NextResponse.json(
        { error: "Invalid vaccine type ID" },
        { status: 400 }
      );
    }

    // Check if vaccine type exists and belongs to practice
    const existingVaccineType = await db
      .select()
      .from(vaccineTypes)
      .where(
        and(
          eq(vaccineTypes.id, vaccineTypeId),
          eq(vaccineTypes.practiceId, parseInt(userPractice.practiceId))
        )
      )
      .limit(1);

    if (existingVaccineType.length === 0) {
      return NextResponse.json(
        { error: "Vaccine type not found" },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    const deletedVaccineType = await db
      .update(vaccineTypes)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(vaccineTypes.id, vaccineTypeId),
          eq(vaccineTypes.practiceId, parseInt(userPractice.practiceId))
        )
      )
      .returning();

    if (deletedVaccineType.length === 0) {
      return NextResponse.json(
        { error: "Failed to delete vaccine type" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting vaccine type:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
