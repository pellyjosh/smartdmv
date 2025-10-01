import { NextResponse } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { healthResources } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET - Fetch single health resource (admin view)
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

    console.log('Fetching health resource for admin ID:', id);

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
      tags: resource.tags ? (typeof resource.tags === 'string' ? JSON.parse(resource.tags) : resource.tags) : [],
      estimatedReadTime: resource.estimatedReadTime,
      difficulty: resource.difficulty,
      featured: resource.featured,
      isPublic: resource.isPublic,
      isActive: resource.isActive,
      viewCount: parseInt(typeof resource.viewCount === 'string' ? resource.viewCount : resource.viewCount?.[0] || '0'),
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
    console.error('Error fetching health resource for admin:', error);
    return NextResponse.json({ error: 'Failed to fetch health resource' }, { status: 500 });
  }
}

// PATCH - Update health resource
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const params = await context.params;
    const { id } = params;
    const resourceId = parseInt(id, 10);
    
    if (!Number.isFinite(resourceId)) {
      return NextResponse.json({ error: 'Invalid resource ID' }, { status: 400 });
    }

    const updateData = await request.json();
    
    console.log('Updating health resource ID:', id);

    // Prepare the data for update
    const processedData = {
      ...updateData,
      tags: updateData.tags ? JSON.stringify(updateData.tags) : null,
    };

    // Remove any undefined fields
    Object.keys(processedData).forEach(key => {
      if (processedData[key] === undefined || processedData[key] === '') {
        delete processedData[key];
      }
    });

    const [updatedResource] = await tenantDb
      .update(healthResources)
      .set(processedData)
      .where(eq(healthResources.id, resourceId))
      .returning();

    if (!updatedResource) {
      return NextResponse.json({ error: 'Health resource not found' }, { status: 404 });
    }

    return NextResponse.json(updatedResource, { status: 200 });
  } catch (error) {
    console.error('Error updating health resource:', error);
    return NextResponse.json({ error: 'Failed to update health resource' }, { status: 500 });
  }
}

// DELETE - Delete health resource
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const params = await context.params;
    const { id } = params;
    const resourceId = parseInt(id, 10);
    
    if (!Number.isFinite(resourceId)) {
      return NextResponse.json({ error: 'Invalid resource ID' }, { status: 400 });
    }

    console.log('Deleting health resource ID:', id);

    const deleted = await tenantDb
      .delete(healthResources)
      .where(eq(healthResources.id, resourceId))
      .returning();

    if (!deleted || deleted.length === 0) {
      return NextResponse.json({ error: 'Health resource not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Health resource deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting health resource:', error);
    return NextResponse.json({ error: 'Failed to delete health resource' }, { status: 500 });
  }
}
