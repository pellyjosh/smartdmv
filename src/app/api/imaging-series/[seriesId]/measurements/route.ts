import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request, context: { params: Promise<{ seriesId: string }> }) {
  const params = await context.params;
  const { seriesId } = params;

  try {
    const measurements = await (db as any).select().from(schema.imagingMeasurements).where(eq(schema.imagingMeasurements.seriesId, seriesId));
    return NextResponse.json(measurements, { status: 200 });
  } catch (error) {
    console.error('Error fetching measurements:', error);
    return NextResponse.json({ error: 'Failed to fetch measurements' }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ seriesId: string }> }) {
  const params = await context.params;
  const { seriesId } = params;

  try {
    const body = await request.json();
    
    const newMeasurementData = {
      seriesId,
      createdById: body.createdById || "user-1", // Default user for now
      measurementType: body.measurementType,
      measurementData: JSON.stringify(body.measurementData),
      value: body.value,
      unit: body.unit,
      label: body.label,
    };

    const [newMeasurement] = await (db as any).insert(schema.imagingMeasurements).values(newMeasurementData).returning();

    return NextResponse.json(newMeasurement, { status: 201 });
  } catch (error) {
    console.error('Error creating measurement:', error);
    return NextResponse.json({ error: 'Failed to create measurement' }, { status: 500 });
  }
}
