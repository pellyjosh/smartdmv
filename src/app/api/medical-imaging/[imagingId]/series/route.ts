import { NextResponse } from "next/server";
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request, context: { params: Promise<{ imagingId: string }> }) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const params = await context.params;
  const { imagingId } = params;

  try {
    // Fetch series data from database
    const seriesData = await (db as any).select().from(schema.imagingSeries).where(eq(schema.imagingSeries.medicalImagingId, imagingId));

    return NextResponse.json(seriesData, { status: 200 });
  } catch (error) {
    console.error('Error fetching imaging series:', error);
    return NextResponse.json({ error: 'Failed to fetch imaging series' }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ imagingId: string }> }) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const params = await context.params;
  const { imagingId } = params;

  try {
    const formData = await request.formData();
    const imageFile = formData.get('imageFile') as File;
    const data = formData.get('data') as string;

    if (!imageFile) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json({ error: 'No series data provided' }, { status: 400 });
    }

    const seriesData = JSON.parse(data);

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'medical-imaging');
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = imageFile.name.split('.').pop();
    const fileName = `${imagingId}_${timestamp}.${fileExtension}`;
    const filePath = join(uploadDir, fileName);
    const relativeFilePath = `uploads/medical-imaging/${fileName}`;

    // Write file to disk
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Get current series count for this imaging study
    const existingSeries = await (db as any).select().from(schema.imagingSeries).where(eq(schema.imagingSeries.medicalImagingId, imagingId));

    // Create new series object
    const newSeriesData = {
      medicalImagingId: imagingId,
      seriesNumber: existingSeries.length + 1,
      seriesName: seriesData.seriesName || `Series ${existingSeries.length + 1}`,
      description: seriesData.description,
      filePath: relativeFilePath,
      modality: seriesData.modality,
      bodyPart: seriesData.bodyPart,
      numberOfImages: 1,
    };

    // Save to database
    const [newSeries] = await (db as any).insert(schema.imagingSeries).values(newSeriesData).returning();

    return NextResponse.json(newSeries, { status: 201 });
  } catch (error) {
    console.error('Error creating imaging series:', error);
    return NextResponse.json({ error: 'Failed to create imaging series' }, { status: 500 });
  }
}
