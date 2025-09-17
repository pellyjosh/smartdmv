import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request, context: { params: Promise<{ seriesId: string }> }) {
  const params = await context.params;
  const { seriesId } = params;

  try {
    const annotations = await (db as any).select().from(schema.imagingAnnotations).where(eq(schema.imagingAnnotations.seriesId, seriesId));
    return NextResponse.json(annotations, { status: 200 });
  } catch (error) {
    console.error('Error fetching annotations:', error);
    return NextResponse.json({ error: 'Failed to fetch annotations' }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ seriesId: string }> }) {
  const params = await context.params;
  const { seriesId } = params;

  try {
    const body = await request.json();
    
    const newAnnotationData = {
      seriesId,
      createdById: body.createdById || "user-1", // Default user for now
      annotationType: body.annotationType, // This should come from the form
      annotationData: JSON.stringify(body.annotationData), // This should be the JSON data
      color: body.color || "#FF0000",
      text: body.text,
    };

    const [newAnnotation] = await (db as any).insert(schema.imagingAnnotations).values(newAnnotationData).returning();

    return NextResponse.json(newAnnotation, { status: 201 });
  } catch (error) {
    console.error('Error creating annotation:', error);
    return NextResponse.json({ error: 'Failed to create annotation' }, { status: 500 });
  }
}
