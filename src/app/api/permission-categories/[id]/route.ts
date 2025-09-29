import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { permissionCategories } from '@/db/schema';
import { eq } from 'drizzle-orm';

// PUT update permission category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string  }> }
) {
  const resolvedParams = await params;
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const categoryId = parseInt(resolvedParams.id);
    const body = await request.json();
    
    const updateSchema = z.object({
      name: z.string().min(2).optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().optional(),
    });

    const validatedData = updateSchema.parse(body);

    // Check if category exists and is not system defined
    const existingCategory = await tenantDb.query.permissionCategories.findFirst({
      where: eq(permissionCategories.id, categoryId)
    });

    if (!existingCategory) {
      return NextResponse.json({ error: 'Permission category not found' }, { status: 404 });
    }

    if (existingCategory.isSystemDefined) {
      return NextResponse.json({ error: 'Cannot modify system-defined categories' }, { status: 403 });
    }

    // Prepare update data
    const updateData: any = {};
    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;
    if (validatedData.sortOrder !== undefined) updateData.displayOrder = validatedData.sortOrder;

    // Update the category
    const [updatedCategory] = await tenantDb.update(permissionCategories)
      .set(updateData)
      .where(eq(permissionCategories.id, categoryId))
      .returning();

    return NextResponse.json({ 
      id: updatedCategory.id.toString(),
      name: updatedCategory.name,
      description: updatedCategory.description || '',
      isActive: updatedCategory.isActive,
      isSystemDefined: updatedCategory.isSystemDefined,
      sortOrder: updatedCategory.displayOrder,
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
  { params }: { params: Promise<{ id: string  }> }
) {
  const resolvedParams = await params;
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const categoryId = parseInt(resolvedParams.id);
    
    // Check if category exists and is not system defined
    const existingCategory = await tenantDb.query.permissionCategories.findFirst({
      where: eq(permissionCategories.id, categoryId),
      with: {
        resources: true
      }
    });

    if (!existingCategory) {
      return NextResponse.json({ error: 'Permission category not found' }, { status: 404 });
    }

    if (existingCategory.isSystemDefined) {
      return NextResponse.json({ error: 'Cannot delete system-defined categories' }, { status: 403 });
    }

    if (existingCategory.resources.length > 0) {
      return NextResponse.json({ error: 'Cannot delete category with associated resources' }, { status: 400 });
    }

    // Delete the category
    await tenantDb.delete(permissionCategories).where(eq(permissionCategories.id, categoryId));
    
    return NextResponse.json({ 
      message: 'Permission category deleted successfully',
      id: categoryId.toString() 
    });
  } catch (error) {
    console.error('Error deleting permission category:', error);
    return NextResponse.json({ error: 'Failed to delete permission category' }, { status: 500 });
  }
}
