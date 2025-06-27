import { NextResponse } from 'next/server';
import { db } from '@/db';
import { customFieldCategories } from '@/db/schemas/customFieldsSchema';
import { eq } from 'drizzle-orm';

export async function GET(
    req: Request,
    { params }: { params: { practiceId: string } }
  ) {
  try {
    const resolvedParams = await params;
    const { practiceId } = resolvedParams;

    if (!practiceId) {
      return NextResponse.json({ error: 'Practice ID is required' }, { status: 400 });
    }

    const categories = await db.query.customFieldCategories.findMany({
      where: eq(customFieldCategories.practiceId, practiceId),
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // Validate required fields
    if (!data.practiceId || !data.name) {
      return NextResponse.json(
        { error: 'Practice ID and name are required' },
        { status: 400 }
      );
    }

    // Check for existing category with the same name in the same practice
    const existingCategory = await db.query.customFieldCategories.findFirst({
      where: eq(customFieldCategories.name, data.name),
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this name already exists' },
        { status: 400 }
      );
    }

    const newCategory = await db
      .insert(customFieldCategories)
      .values(data)
      .returning();

    return NextResponse.json(newCategory[0], { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}