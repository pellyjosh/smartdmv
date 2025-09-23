import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { healthResources } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const species = searchParams.get('species');
    const featured = searchParams.get('featured');

    console.log('Fetching health resources with filters:', { category, type, species, featured });

    // Build the query conditions
    let whereConditions: any[] = [eq(healthResources.isActive, true)];
    
    if (category) {
      whereConditions.push(eq(healthResources.category, category));
    }
    
    if (type) {
      whereConditions.push(eq(healthResources.type, type));
    }
    
    if (species) {
      whereConditions.push(
        sql`${healthResources.species} = ${species} OR ${healthResources.species} = 'all'`
      );
    }
    
    if (featured === 'true') {
      whereConditions.push(eq(healthResources.featured, true));
    }

    // Query the database for health resources
    const resources = await db.query.healthResources.findMany({
      where: whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0],
      with: {
        practice: {
          columns: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: (healthResources, { desc, asc }) => [
        desc(healthResources.featured),
        asc(healthResources.category),
        desc(healthResources.createdAt)
      ],
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
    }));

    return NextResponse.json(transformedResources, { status: 200 });
  } catch (error) {
    console.error('Error fetching health resources:', error);
    return NextResponse.json({ error: 'Failed to fetch health resources' }, { status: 500 });
  }
}

// POST endpoint to increment view count
export async function POST(request: Request) {
  try {
    const { resourceId } = await request.json();
    
    if (!resourceId) {
      return NextResponse.json({ error: 'Resource ID is required' }, { status: 400 });
    }

    // Increment view count
    const resource = await db.query.healthResources.findFirst({
      where: eq(healthResources.id, resourceId),
      columns: { id: true, viewCount: true }
    });

    if (!resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    const newViewCount = (parseInt(resource.viewCount || '0') + 1).toString();

    await db
      .update(healthResources)
      .set({ viewCount: newViewCount })
      .where(eq(healthResources.id, resourceId));

    return NextResponse.json({ success: true, viewCount: newViewCount }, { status: 200 });
  } catch (error) {
    console.error('Error updating view count:', error);
    return NextResponse.json({ error: 'Failed to update view count' }, { status: 500 });
  }
}
