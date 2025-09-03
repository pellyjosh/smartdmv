import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// POST toggle permission category status
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = params.id;
    const body = await request.json();
    
    const toggleSchema = z.object({
      isActive: z.boolean(),
    });

    const validatedData = toggleSchema.parse(body);

    // TODO: Implement category status toggle in database
    
    return NextResponse.json({ 
      message: 'Category status updated successfully',
      id: categoryId,
      isActive: validatedData.isActive
    });
  } catch (error) {
    console.error('Error toggling category status:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to toggle category status' }, { status: 500 });
  }
}
