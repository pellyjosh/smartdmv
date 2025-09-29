import { NextResponse } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { healthResources } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const params = await context.params;
    const { id } = params;
    const resourceId = parseInt(id, 10);
    
    if (!Number.isFinite(resourceId)) {
      return NextResponse.json({ error: 'Invalid resource ID' }, { status: 400 });
    }

    console.log('Fetching health resource details for ID:', id);

    // Query the database for the specific health resource
    const resource = await tenantDb.query.healthResources.findFirst({
      where: eq(healthResources.id, resourceId),
      with: {
        practice: {
          columns: {
            id: true,
            name: true,
          }
        }
      },
    });

    if (!resource) {
      return NextResponse.json({ error: 'Health resource not found' }, { status: 404 });
    }

    // Transform resource for frontend
    const transformedResource = {
      id: resource.id,
      title: resource.title,
      description: resource.description,
      content: resource.content,
      category: resource.category,
      type: resource.type,
      species: resource.species,
      thumbnailUrl: resource.thumbnailUrl,
      imageUrl: resource.imageUrl,
      videoUrl: resource.videoUrl,
      externalUrl: resource.externalUrl,
      downloadUrl: resource.downloadUrl,
      author: resource.author,
      tags: resource.tags ? JSON.parse(resource.tags) : [],
      estimatedReadTime: resource.estimatedReadTime,
      difficulty: resource.difficulty,
      featured: resource.featured,
      viewCount: parseInt(resource.viewCount || '0'),
      emergencyType: resource.emergencyType,
      contactPhone: resource.contactPhone,
      contactAddress: resource.contactAddress,
      availability: resource.availability,
      practice: resource.practice?.name,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
    };

    return NextResponse.json(transformedResource, { status: 200 });
  } catch (error) {
    console.error('Error fetching health resource:', error);
    return NextResponse.json({ error: 'Failed to fetch health resource' }, { status: 500 });
  }
}
