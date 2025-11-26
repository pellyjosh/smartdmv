import { NextResponse } from 'next/server';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { customFieldCategories } from '@/db/schemas/customFieldsSchema';
import { eq } from 'drizzle-orm';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const tenantDb = await getCurrentTenantDb();
  try {
    const { id } = params;
    const body = await req.json();
    const updateData: any = {};
    if (typeof body.name !== 'undefined') updateData.name = body.name;
    if (typeof body.description !== 'undefined') updateData.description = body.description;
    const updated = await tenantDb.update(customFieldCategories)
      .set(updateData)
      .where(eq(customFieldCategories.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0] || null);
  } catch (error) {
    console.error('Update category error', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const tenantDb = await getCurrentTenantDb();
  try {
    const { id } = params;
    await tenantDb.delete(customFieldCategories).where(eq(customFieldCategories.id, parseInt(id)));
    return NextResponse.json(null, { status: 204 });
  } catch (error) {
    console.error('Delete category error', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}