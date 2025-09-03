import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// PUT update permission category
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = params.id;
    const body = await request.json();
    
    const updateSchema = z.object({
      name: z.string().min(2).optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().optional(),
    });

    const validatedData = updateSchema.parse(body);

    // TODO: Implement category update in database
    return NextResponse.json({ 
      id: categoryId, 
      ...validatedData,
      message: 'Permission category updated successfully' 
    });
  } catch (error) {
    console.error('Error updating permission category:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update permission category' }, { status: 500 });
  }
}

// DELETE permission category
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = params.id;
    
    // TODO: Implement category deletion from database
    // Check if category is system-defined or in use before deletion
    
    return NextResponse.json({ 
      message: 'Permission category deleted successfully',
      id: categoryId 
    });
  } catch (error) {
    console.error('Error deleting permission category:', error);
    return NextResponse.json({ error: 'Failed to delete permission category' }, { status: 500 });
  }
}
