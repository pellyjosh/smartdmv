import { NextResponse } from 'next/server';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { customFieldValues } from '@/db/schemas/customFieldsSchema';
import { eq } from 'drizzle-orm';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const tenantDb = await getCurrentTenantDb();
  try {
    const { id } = params;
    const body = await req.json();
    const updateData: any = {};
    if (typeof body.value !== 'undefined') updateData.value = body.value;
    if (typeof body.label !== 'undefined') updateData.label = body.label;
    if (typeof body.isActive !== 'undefined') updateData.isActive = body.isActive;
    const updated = await tenantDb.update(customFieldValues)
      .set(updateData)
      .where(eq(customFieldValues.id, parseInt(id)))
      .returning();
    return NextResponse.json(updated[0] || null);
  } catch (error) {
    console.error('Update value error', error);
    return NextResponse.json({ error: 'Failed to update value' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const tenantDb = await getCurrentTenantDb();
  try {
    const { id } = params;
    await tenantDb.delete(customFieldValues).where(eq(customFieldValues.id, parseInt(id)));
    return NextResponse.json(null, { status: 204 });
  } catch (error) {
    console.error('Delete value error', error);
    return NextResponse.json({ error: 'Failed to delete value' }, { status: 500 });
  }
}