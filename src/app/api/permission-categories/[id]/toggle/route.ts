import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { permissionCategories } from '@/db/schema';
import { eq } from 'drizzle-orm';

// POST toggle permission category status
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = parseInt(params.id);
    const body = await request.json();
    
    const toggleSchema = z.object({
      isActive: z.boolean(),
    });

    const validatedData = toggleSchema.parse(body);

    // Check if category exists
    const existingCategory = await db.query.permissionCategories.findFirst({
      where: eq(permissionCategories.id, categoryId)
    });

    if (!existingCategory) {
      return NextResponse.json({ error: 'Permission category not found' }, { status: 404 });
    }

    // Update the category status
    const [updatedCategory] = await db.update(permissionCategories)
      .set({ isActive: validatedData.isActive })
      .where(eq(permissionCategories.id, categoryId))
      .returning();
    
    return NextResponse.json({ 
      message: 'Category status updated successfully',
      id: updatedCategory.id.toString(),
      isActive: updatedCategory.isActive
    });
  } catch (error) {
    console.error('Error toggling category status:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to toggle category status' }, { status: 500 });
  }
}
