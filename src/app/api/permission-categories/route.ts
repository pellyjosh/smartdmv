import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const permissionCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  isSystemDefined: z.boolean().default(false),
  sortOrder: z.number().default(1),
});

type PermissionCategory = z.infer<typeof permissionCategorySchema>;

// GET /api/permission-categories - Get permission categories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const practiceId = searchParams.get('practiceId');

    if (!practiceId) {
      return NextResponse.json({ error: 'Practice ID is required' }, { status: 400 });
    }

    // TODO: Implement DB-backed permission categories
    // For now return empty array - permission categories schema needs to be created
    return NextResponse.json([]);
  } catch (error) {
    console.error('Error fetching permission categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permission categories' },
      { status: 500 }
    );
  }
}

// POST /api/permission-categories - Create a new permission category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = permissionCategorySchema.parse(body);

    // TODO: Implement DB creation
    // For now return the validated data with a generated ID
    return NextResponse.json(
      { 
        ...validatedData,
        id: `category_${Date.now()}`,
        createdAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating permission category:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to create permission category' },
      { status: 500 }
    );
  }
}
