import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request, context: { params: Promise<{ petId: string }> }) {
  const params = await context.params;
  const { petId } = params;

  console.log('Fetching medical imaging data for Pet ID:', petId);

  try {
    // Fetch medical imaging data from database
    const imagingData = await (db as any).select().from(schema.medicalImaging).where(eq(schema.medicalImaging.petId, petId));

    if (imagingData.length === 0) {
      console.log('No medical imaging found for Pet ID:', petId);
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(imagingData, { status: 200 });
  } catch (error) {
    console.error('Error fetching medical imaging data:', error);
    return NextResponse.json({ error: 'Failed to fetch medical imaging data due to a server error. Please try again later.' }, { status: 500 });
  }
}
