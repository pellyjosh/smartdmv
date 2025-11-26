import { NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { customFieldCategories } from '@/db/schemas/customFieldsSchema';
import { eq, and } from 'drizzle-orm';
import { log } from 'console';

export async function GET(
    req: Request,
    { params }: { params: { practiceId: string } }
  ) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const { practiceId } = params;

    if (!practiceId) {
      return NextResponse.json({ error: 'Practice ID is required' }, { status: 400 });
    }

    const categories = await tenantDb.query.customFieldCategories.findMany({
      where: eq(customFieldCategories.practiceId, parseInt(practiceId, 10)),
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const data = await req.json();

    // Validate required fields
    const practiceId = typeof data.practiceId === 'string' ? parseInt(data.practiceId, 10) : data.practiceId;
    if (!practiceId || !data.name) {
      return NextResponse.json(
        { error: 'Practice ID and name are required' },
        { status: 400 }
      );
    }

    // Check for existing category with the same name in the same practice
    const existingCategory = await tenantDb.query.customFieldCategories.findFirst({
      where: and(
        eq(customFieldCategories.name, data.name),
        eq(customFieldCategories.practiceId, practiceId)
      ),
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this name already exists' },
        { status: 400 }
      );
    }

    const newCategory = await tenantDb
      .insert(customFieldCategories)
      .values({ practiceId, name: data.name, description: data.description })
      .returning();

    return NextResponse.json(newCategory[0], { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}