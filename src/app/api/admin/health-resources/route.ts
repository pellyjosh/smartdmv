import { NextResponse } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { healthResources } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

// GET - Fetch all health resources (admin view)
export async function GET(request: Request) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    console.log('Fetching all health resources for admin');

    // Query the database for all health resources with practice info
    const resources = await tenantDb.query.healthResources.findMany({
      with: {
        practice: {
          columns: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: [desc(healthResources.featured), desc(healthResources.createdAt)],
    });

    // Transform resources for frontend
    const transformedResources = resources.map(resource => ({
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
    }));

    return NextResponse.json(transformedResources, { status: 200 });
  } catch (error) {
    console.error('Error fetching health resources for admin:', error);
    return NextResponse.json({ error: 'Failed to fetch health resources' }, { status: 500 });
  }
}

// POST - Create new health resource
export async function POST(request: Request) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const resourceData = await request.json();
    
    console.log('Creating new health resource:', resourceData.title);

    // Prepare the data for insertion
    const insertData = {
      ...resourceData,
      tags: resourceData.tags ? JSON.stringify(resourceData.tags) : null,
      practiceId: 1, // Default to practice ID 1, you might want to get this from user context
      viewCount: '0',
    };

    // Remove any undefined fields
    Object.keys(insertData).forEach(key => {
      if (insertData[key] === undefined || insertData[key] === '') {
        delete insertData[key];
      }
    });

    const [newResource] = await tenantDb.insert(healthResources).values(insertData).returning();

    return NextResponse.json(newResource, { status: 201 });
  } catch (error) {
    console.error('Error creating health resource:', error);
    return NextResponse.json({ error: 'Failed to create health resource' }, { status: 500 });
  }
}
